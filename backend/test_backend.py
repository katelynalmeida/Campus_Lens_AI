import os
import io
import tempfile
import pytest
from PIL import Image

# Use an isolated test database
temp_db_fd, temp_db_path = tempfile.mkstemp(suffix=".db")
os.close(temp_db_fd)
os.environ["DATABASE_PATH"] = temp_db_path

from fastapi.testclient import TestClient
from main import app
from database import get_db, init_db
from vision import set_mock_classifier

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Initialise test database once per session and clean up after."""
    init_db()
    yield
    if os.path.exists(temp_db_path):
        os.remove(temp_db_path)

def test_root_health():
    """Verify root endpoint is online."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "CampusLens AI"
    assert data["status"] == "online"

def test_api_health():
    """Verify /api/health returns database and model status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["database"] == "healthy"
    assert "status" in data

def test_dashboard_statistics():
    """Verify /api/dashboard returns calculated counts rather than hardcoded zeroes."""
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["total_issues"] >= 1
    assert "pending_issues" in data
    assert "status_distribution" in data
    assert "category_distribution" in data
    assert "priority_distribution" in data
    assert len(data["recent_issues"]) >= 1

import uuid

def test_issue_lifecycle_and_persistence():
    """Verify issue creation, retrieval, and persistence across db connections."""
    unique_title = f"Broken classroom door lock {uuid.uuid4().hex[:6]}"
    payload = {
        "title": unique_title,
        "description": "The latch on room 302 door does not engage when turned.",
        "category": "Damaged wall, ceiling, door, or window",
        "location": "Block C, Room 302",
        "priority": "High"
    }

    create_res = client.post("/api/issues", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    issue_id = created_data["id"]
    assert issue_id.startswith("ISS-")
    assert created_data["status"] == "Pending"

    # Verify retrieval
    get_res = client.get(f"/api/issues/{issue_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == payload["title"]

    # Verify status update
    update_res = client.patch(f"/api/issues/{issue_id}", json={
        "status": "In Progress",
        "note": "Assigned to carpentry repair team"
    })
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["status"] == "In Progress"
    assert len(updated_data["status_logs"]) >= 2

    # Verify persistence by directly querying database with fresh connection
    conn = get_db()
    row = conn.execute("SELECT * FROM issues WHERE id = ?", (issue_id,)).fetchone()
    assert row is not None
    assert row["status"] == "In Progress"
    conn.close()

def test_missing_issue_id_returns_404():
    """Verify non-existent issue IDs return 404 with meaningful message."""
    response = client.get("/api/issues/ISS-NONEXISTENT")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_duplicate_submission_protection():
    """Verify duplicate submission within 30 seconds is blocked."""
    dup_title = f"Duplicate test water fountain {uuid.uuid4().hex[:6]}"
    payload = {
        "title": dup_title,
        "description": "Fountain pressure is zero on second floor.",
        "category": "Water leakage or plumbing",
        "location": "Block B 2nd Floor Hallway",
        "priority": "Low"
    }
    res1 = client.post("/api/issues", json=payload)
    assert res1.status_code == 201
    
    # Second immediate submit
    res2 = client.post("/api/issues", json=payload)
    assert res2.status_code == 409
    assert "duplicate" in res2.json()["detail"].lower()

def test_invalid_image_upload_rejected():
    """Verify invalid file types or non-image content are safely rejected."""
    # Upload plain text disguised as jpg
    fake_file = io.BytesIO(b"This is not a real image file content")
    response = client.post(
        "/api/detect-image",
        files={"file": ("fake.jpg", fake_file, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "corrupted" in response.json()["detail"].lower() or "readable" in response.json()["detail"].lower()

def test_mocked_image_detection():
    """Verify valid image reaches classifier and returns expected structured response."""
    # Create valid dummy PNG image in memory
    img = Image.new("RGB", (100, 100), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    # Set mock classifier to test contract without heavy model inference
    def mock_clf(image):
        return {
            "suggested_category": "Electrical issue or broken light",
            "top_alternatives": [
                {"category": "Electrical issue or broken light", "score": 0.88, "description": "High visual match"},
                {"category": "Broken fan or campus equipment", "score": 0.08, "description": "Low match"}
            ],
            "message": "AI strongly suggests 'Electrical issue or broken light'.",
            "needs_confirmation": False,
            "model_name": "openai/clip-vit-base-patch32",
            "model_status": "ready"
        }

    set_mock_classifier(mock_clf)

    response = client.post(
        "/api/detect-image",
        files={"file": ("test_light.png", buf, "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["suggested_category"] == "Electrical issue or broken light"
    assert data["needs_confirmation"] is False
    assert data["saved_image_path"].startswith("/uploads/")

    # Reset mock classifier
    set_mock_classifier(None)

def test_assistant_chat_answers_from_database():
    """Verify assistant uses live SQLite database counts and answers questions accurately."""
    # Test pending query
    res_pending = client.post("/api/assistant/chat", json={"message": "How many issues are pending right now?"})
    assert res_pending.status_code == 200
    data = res_pending.json()
    assert "pending" in data["reply"].lower()
    assert "suggested_prompts" in data

    # Test high-priority query
    res_urgent = client.post("/api/assistant/chat", json={"message": "Are there any high-priority or critical issues?"})
    assert res_urgent.status_code == 200
    assert "urgent" in res_urgent.json()["reply"].lower() or "priority" in res_urgent.json()["reply"].lower()

    # Test specific existing issue query
    res_specific = client.post("/api/assistant/chat", json={"message": "What is the status of issue ISS-1001?"})
    assert res_specific.status_code == 200
    assert "ISS-1001" in res_specific.json()["reply"]

def test_facilities_endpoints():
    """Verify /api/facilities returns seeded facilities with open issue counts."""
    response = client.get("/api/facilities")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    assert "name" in data[0]
    assert "facility_type" in data[0]
    assert "open_issues_count" in data[0]
