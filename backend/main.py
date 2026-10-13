import os
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from database import init_db, get_db, generate_next_issue_id, seed_demo_issues, seed_facilities
from schemas import (
    IssueCreate, IssueUpdate, IssueResponse, StatusLogResponse,
    FacilityResponse, DashboardStatsResponse, ImageDetectionResponse,
    AssistantChatRequest, AssistantChatResponse, HealthResponse
)
from vision import validate_and_save_image, classify_campus_image, get_vision_status
from assistant import generate_assistant_response

# Configure logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("campuslens")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes SQLite database and tables upon server startup."""
    logger.info("Initializing CampusLens SQLite database...")
    init_db()
    logger.info("Database initialised and verified.")
    yield

app = FastAPI(
    title="CampusLens AI API",
    description="Backend API for Smart Campus Facility Management & AI-Powered Issue Detection",
    version="1.0.0",
    lifespan=lifespan
)

# Uploads directory
BACKEND_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BACKEND_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files for uploaded image previews
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# Health and System Endpoints
# -------------------------------------------------------------
@app.get("/", tags=["Health"])
def root_check():
    """Simple root health check."""
    return {
        "name": "CampusLens AI",
        "status": "online",
        "documentation": "/docs",
        "version": "1.0.0"
    }

@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def api_health():
    """Application and database health check."""
    try:
        conn = get_db()
        conn.execute("SELECT 1").fetchone()
        conn.close()
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = f"unhealthy: {e}"

    vision_stat = get_vision_status()

    return HealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        database=db_status,
        vision_model=f"{vision_stat['status']} ({vision_stat['model_name']})",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0"
    )

@app.get("/api/vision-status", tags=["Vision"])
def get_vision_model_status():
    """Returns vision model load state and health."""
    return get_vision_status()

# -------------------------------------------------------------
# Dashboard Statistics
# -------------------------------------------------------------
@app.get("/api/dashboard", response_model=DashboardStatsResponse, tags=["Dashboard"])
def get_dashboard_stats():
    """Calculates live dynamic statistics and distribution metrics from SQLite."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Total counts
        cursor.execute("SELECT COUNT(*) FROM issues")
        total_issues = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM issues WHERE status = 'Pending'")
        pending_issues = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM issues WHERE status = 'In Progress'")
        in_progress_issues = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM issues WHERE status = 'Resolved'")
        resolved_issues = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM issues WHERE priority IN ('High', 'Critical') AND status != 'Resolved'")
        high_priority_issues = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM facilities")
        total_facilities = cursor.fetchone()[0]

        # Status distribution
        cursor.execute("SELECT status, COUNT(*) as cnt FROM issues GROUP BY status")
        status_dist = {r["status"]: r["cnt"] for r in cursor.fetchall()}
        for st in ["Pending", "In Progress", "Resolved"]:
            status_dist.setdefault(st, 0)

        # Category distribution
        cursor.execute("SELECT category, COUNT(*) as cnt FROM issues GROUP BY category")
        category_dist = {r["category"]: r["cnt"] for r in cursor.fetchall()}

        # Priority distribution
        cursor.execute("SELECT priority, COUNT(*) as cnt FROM issues GROUP BY priority")
        priority_dist = {r["priority"]: r["cnt"] for r in cursor.fetchall()}
        for pr in ["Low", "Medium", "High", "Critical"]:
            priority_dist.setdefault(pr, 0)

        # Recent 5 issues
        cursor.execute("""
            SELECT id, title, category, location, priority, status, created_at, image_path 
            FROM issues 
            ORDER BY created_at DESC 
            LIMIT 5
        """)
        recent_issues = [dict(r) for r in cursor.fetchall()]

        # Recent 6 activity events from status_logs
        cursor.execute("""
            SELECT sl.id, sl.issue_id, sl.old_status, sl.new_status, sl.changed_at, sl.note, i.title
            FROM status_logs sl
            JOIN issues i ON sl.issue_id = i.id
            ORDER BY sl.changed_at DESC
            LIMIT 6
        """)
        recent_activity = [dict(r) for r in cursor.fetchall()]

        return DashboardStatsResponse(
            total_issues=total_issues,
            pending_issues=pending_issues,
            in_progress_issues=in_progress_issues,
            resolved_issues=resolved_issues,
            high_priority_issues=high_priority_issues,
            total_facilities=total_facilities,
            status_distribution=status_dist,
            category_distribution=category_dist,
            priority_distribution=priority_dist,
            recent_issues=recent_issues,
            recent_activity=recent_activity
        )
    finally:
        conn.close()

# -------------------------------------------------------------
# Issues Endpoints
# -------------------------------------------------------------
@app.get("/api/issues", response_model=List[IssueResponse], tags=["Issues"])
def list_issues(
    status: Optional[str] = Query(None, description="Filter by status: Pending, In Progress, Resolved"),
    category: Optional[str] = Query(None, description="Filter by category"),
    priority: Optional[str] = Query(None, description="Filter by priority: Low, Medium, High, Critical"),
    search: Optional[str] = Query(None, description="Search keyword in title, id, or location"),
    sort_by: str = Query("newest", description="Sorting: newest or oldest")
):
    """Retrieve filtered, searched, and sorted issue reports."""
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM issues WHERE 1=1"
    params = []

    if status:
        query += " AND status = ?"
        params.append(status)

    if category:
        query += " AND category = ?"
        params.append(category)

    if priority:
        query += " AND priority = ?"
        params.append(priority)

    if search:
        search_term = f"%{search.strip()}%"
        query += " AND (title LIKE ? OR id LIKE ? OR location LIKE ? OR description LIKE ?)"
        params.extend([search_term, search_term, search_term, search_term])

    if sort_by == "oldest":
        query += " ORDER BY created_at ASC"
    else:
        query += " ORDER BY created_at DESC"

    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        issues_list = []
        for r in rows:
            issue_dict = dict(r)
            # Retrieve status logs for each issue
            cursor.execute("SELECT * FROM status_logs WHERE issue_id = ? ORDER BY changed_at DESC", (r["id"],))
            logs = [dict(log) for log in cursor.fetchall()]
            issue_dict["status_logs"] = logs
            issues_list.append(issue_dict)
        return issues_list
    finally:
        conn.close()

@app.get("/api/issues/{issue_id}", response_model=IssueResponse, tags=["Issues"])
def get_issue(issue_id: str):
    """Retrieve detailed information and status history for a single issue."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM issues WHERE UPPER(id) = ?", (issue_id.upper(),))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Issue with ID '{issue_id}' not found.")

        issue_dict = dict(row)
        cursor.execute("SELECT * FROM status_logs WHERE issue_id = ? ORDER BY changed_at DESC", (row["id"],))
        logs = [dict(log) for log in cursor.fetchall()]
        issue_dict["status_logs"] = logs
        return issue_dict
    finally:
        conn.close()

@app.post("/api/issues", response_model=IssueResponse, status_code=status.HTTP_201_CREATED, tags=["Issues"])
def create_issue(issue: IssueCreate):
    """Create a new campus maintenance issue report."""
    conn = get_db()
    cursor = conn.cursor()
    now_utc = datetime.now(timezone.utc).isoformat()

    try:
        # Check for potential exact duplicate within the last 30 seconds to prevent accidental double-clicks
        cursor.execute("""
            SELECT id FROM issues 
            WHERE title = ? AND location = ? AND created_at >= datetime('now', '-30 seconds')
            LIMIT 1
        """, (issue.title, issue.location))
        duplicate = cursor.fetchone()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A duplicate report with this title and location was recently submitted as {duplicate['id']}."
            )

        new_id = generate_next_issue_id(conn)
        cursor.execute("""
            INSERT INTO issues (
                id, title, description, category, location, priority,
                status, image_path, ai_suggested_category, ai_confidence_score,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            new_id,
            issue.title.strip(),
            issue.description.strip(),
            issue.category.strip(),
            issue.location.strip(),
            issue.priority,
            "Pending",
            issue.image_path,
            issue.ai_suggested_category,
            issue.ai_confidence_score,
            now_utc,
            now_utc
        ))

        # Add initial audit log
        cursor.execute("""
            INSERT INTO status_logs (issue_id, old_status, new_status, changed_at, note)
            VALUES (?, NULL, 'Pending', ?, 'Issue registered by reporter')
        """, (new_id, now_utc))

        conn.commit()

        # Retrieve newly created record
        cursor.execute("SELECT * FROM issues WHERE id = ?", (new_id,))
        created = dict(cursor.fetchone())
        created["status_logs"] = [{
            "id": 1,
            "issue_id": new_id,
            "old_status": None,
            "new_status": "Pending",
            "changed_at": now_utc,
            "note": "Issue registered by reporter"
        }]
        return created
    finally:
        conn.close()

@app.patch("/api/issues/{issue_id}", response_model=IssueResponse, tags=["Issues"])
def update_issue(issue_id: str, update_data: IssueUpdate):
    """Update issue status or priority, recording an audit log entry."""
    conn = get_db()
    cursor = conn.cursor()
    now_utc = datetime.now(timezone.utc).isoformat()

    try:
        cursor.execute("SELECT * FROM issues WHERE UPPER(id) = ?", (issue_id.upper(),))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Issue with ID '{issue_id}' not found.")

        current_status = existing["status"]
        current_priority = existing["priority"]

        updates = []
        params = []

        new_status = update_data.status if update_data.status is not None else current_status
        new_priority = update_data.priority if update_data.priority is not None else current_priority

        if update_data.status is not None:
            updates.append("status = ?")
            params.append(update_data.status)

        if update_data.priority is not None:
            updates.append("priority = ?")
            params.append(update_data.priority)

        if not updates:
            raise HTTPException(status_code=400, detail="No valid update fields provided.")

        updates.append("updated_at = ?")
        params.append(now_utc)
        params.append(existing["id"])

        cursor.execute(f"UPDATE issues SET {', '.join(updates)} WHERE id = ?", params)

        # If status changed or note provided, create a status_logs record
        if update_data.status != current_status or update_data.note:
            note_text = update_data.note if update_data.note else f"Status updated from {current_status} to {new_status}"
            cursor.execute("""
                INSERT INTO status_logs (issue_id, old_status, new_status, changed_at, note)
                VALUES (?, ?, ?, ?, ?)
            """, (existing["id"], current_status, new_status, now_utc, note_text))

        conn.commit()

        # Fetch updated record
        cursor.execute("SELECT * FROM issues WHERE id = ?", (existing["id"],))
        updated = dict(cursor.fetchone())
        cursor.execute("SELECT * FROM status_logs WHERE issue_id = ? ORDER BY changed_at DESC", (existing["id"],))
        updated["status_logs"] = [dict(log) for log in cursor.fetchall()]
        return updated
    finally:
        conn.close()

# -------------------------------------------------------------
# AI Vision Detection Endpoint
# -------------------------------------------------------------
@app.post("/api/detect-image", response_model=ImageDetectionResponse, tags=["Vision"])
async def detect_image(file: UploadFile = File(...)):
    """
    Accepts multipart image upload, validates content, saves image safely, 
    and performs zero-shot campus issue classification with Hugging Face CLIP.
    """
    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Validate image format and save to uploads
        saved_rel_path, pil_image = validate_and_save_image(
            file_bytes=file_bytes,
            filename=file.filename or "upload.jpg",
            content_type=file.content_type or "image/jpeg"
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Image processing error: {e}")
        raise HTTPException(status_code=400, detail=f"Image verification failed: {e}")

    try:
        # Run classification
        classification_result = classify_campus_image(pil_image)
        classification_result["saved_image_path"] = saved_rel_path
        return ImageDetectionResponse(**classification_result)
    except Exception as e:
        logger.error(f"Model inference failed: {e}")
        # Return structured error allowing graceful fallback to manual reporting without crashing
        return ImageDetectionResponse(
            suggested_category="Other or uncertain issue",
            top_alternatives=[],
            message=f"Vision model inference failed: {str(e)}. Please select an issue category manually.",
            needs_confirmation=True,
            model_name="openai/clip-vit-base-patch32",
            model_status="error",
            saved_image_path=saved_rel_path
        )

# -------------------------------------------------------------
# AI Campus Assistant Endpoint
# -------------------------------------------------------------
@app.post("/api/assistant/chat", response_model=AssistantChatResponse, tags=["Assistant"])
def assistant_chat(request: AssistantChatRequest):
    """
    Modular AI Campus Assistant querying real-time database state 
    without needing external paid API keys.
    """
    try:
        response_data = generate_assistant_response(request.message)
        return AssistantChatResponse(**response_data)
    except Exception as e:
        logger.error(f"Assistant error: {e}")
        raise HTTPException(status_code=500, detail=f"Assistant failed to generate response: {e}")

# -------------------------------------------------------------
# Campus Facilities Endpoints
# -------------------------------------------------------------
@app.get("/api/facilities", response_model=List[FacilityResponse], tags=["Facilities"])
def list_facilities():
    """List campus facilities with their live open issues counts."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM facilities ORDER BY name ASC")
        facilities = [dict(f) for f in cursor.fetchall()]

        # Compute open issues count for each facility by building/name matching
        for f in facilities:
            cursor.execute("""
                SELECT COUNT(*) FROM issues 
                WHERE status != 'Resolved' 
                  AND (location LIKE ? OR location LIKE ?)
            """, (f"%{f['name']}%", f"%{f['building_or_block'].split('-')[0].strip()}%"))
            f["open_issues_count"] = cursor.fetchone()[0]

        return facilities
    finally:
        conn.close()

@app.get("/api/facilities/{facility_id}", response_model=FacilityResponse, tags=["Facilities"])
def get_facility(facility_id: int):
    """Retrieve details for a single campus facility."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM facilities WHERE id = ?", (facility_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Facility with ID {facility_id} not found.")

        facility_dict = dict(row)
        cursor.execute("""
            SELECT COUNT(*) FROM issues 
            WHERE status != 'Resolved' 
              AND (location LIKE ? OR location LIKE ?)
        """, (f"%{facility_dict['name']}%", f"%{facility_dict['building_or_block'].split('-')[0].strip()}%"))
        facility_dict["open_issues_count"] = cursor.fetchone()[0]
        return facility_dict
    finally:
        conn.close()

# -------------------------------------------------------------
# Reset Demo Data Utility
# -------------------------------------------------------------
@app.post("/api/reset-demo-data", tags=["Utility"])
def reset_demo_data():
    """Safely resets demonstration facilities and issues without data corruption."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM status_logs")
        cursor.execute("DELETE FROM issues")
        cursor.execute("DELETE FROM facilities")
        conn.commit()
        seed_facilities(conn)
        seed_demo_issues(conn)
        return {"status": "success", "message": "Demo data safely reset to baseline values."}
    finally:
        conn.close()
