import sqlite3
import os
from datetime import datetime, timezone
from pathlib import Path

# Database path in the backend directory
BACKEND_DIR = Path(__file__).resolve().parent

def get_db_path() -> Path:
    custom_path = os.getenv("DATABASE_PATH")
    if custom_path:
        return Path(custom_path)
    return BACKEND_DIR / "campuslens.db"

def get_db():
    """Create a database connection with dict-like row access and foreign keys enabled."""
    conn = sqlite3.connect(str(get_db_path()))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """Initializes tables and seeds demo data if the database is empty."""
    conn = get_db()
    cursor = conn.cursor()

    # Create issues table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS issues (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            location TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL,
            image_path TEXT,
            ai_suggested_category TEXT,
            ai_confidence_score REAL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # Create facilities table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS facilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            facility_type TEXT NOT NULL,
            building_or_block TEXT NOT NULL,
            description TEXT,
            maintenance_status TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    # Create status logs table for audit history
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS status_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            issue_id TEXT NOT NULL,
            old_status TEXT,
            new_status TEXT NOT NULL,
            changed_at TEXT NOT NULL,
            note TEXT,
            FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
        )
    """)

    conn.commit()

    # Check if facilities table is empty; if so, seed demo facilities
    cursor.execute("SELECT COUNT(*) FROM facilities")
    facility_count = cursor.fetchone()[0]
    if facility_count == 0:
        seed_facilities(conn)

    # Check if issues table is empty; if so, seed initial realistic campus issues
    cursor.execute("SELECT COUNT(*) FROM issues")
    issue_count = cursor.fetchone()[0]
    if issue_count == 0:
        seed_demo_issues(conn)

    conn.close()

def seed_facilities(conn):
    cursor = conn.cursor()
    now_utc = datetime.now(timezone.utc).isoformat()
    demo_facilities = [
        ("Main Auditorium", "Auditorium", "Block A - Central Wing", "800-seat multi-purpose hall with AV systems and acoustic panels.", "Operational"),
        ("Advanced Robotics Lab", "Laboratory", "Block B - Engineering", "Specialized mechanical and electronics lab equipped with 3D printers and microcontrollers.", "Operational"),
        ("Classroom 204", "Classroom", "Block C - Academic Block", "Smart classroom with tiered seating, 65-inch display, and overhead projectors.", "Under Maintenance"),
        ("Central Library Reading Hall", "Library", "Block L - Library Complex", "Quiet study area with individual carrels and central climate control.", "Operational"),
        ("Ground Floor Restroom (West Wing)", "Washroom", "Block C - Academic Block", "Multi-stall male and female restrooms with accessible stalls.", "Needs Inspection"),
        ("Computer Science Lab 3", "Laboratory", "Block B - Engineering", "45 high-performance workstations for software engineering instruction.", "Operational"),
        ("Electrical Substation 2", "Electrical infrastructure", "Block D - Utility Yard", "Step-down transformer and emergency backup distribution board.", "Operational"),
        ("Main Overhead Water Reservoir & Pump Station", "Water and plumbing infrastructure", "North Campus Utility Tower", "Pumping station supplying treated domestic water to academic blocks.", "Operational"),
        ("Physics Demonstration Lecture Hall", "Classroom", "Block A - Science Wing", "120-seat lecture theater with demonstration bench and emergency eye-wash station.", "Operational")
    ]

    cursor.executemany("""
        INSERT INTO facilities (name, facility_type, building_or_block, description, maintenance_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, [(f[0], f[1], f[2], f[3], f[4], now_utc) for f in demo_facilities])
    conn.commit()

def seed_demo_issues(conn):
    cursor = conn.cursor()
    now_utc = datetime.now(timezone.utc).isoformat()
    demo_issues = [
        (
            "ISS-1001",
            "Flickering fluorescent lights in Lab 3",
            "Two overhead tube lights at the back of Computer Science Lab 3 are buzzing loudly and flickering intermittently, causing eye strain.",
            "Electrical issue or broken light",
            "Block B, Room CS-301",
            "High",
            "In Progress",
            None,
            "Electrical issue or broken light",
            0.87,
            now_utc,
            now_utc
        ),
        (
            "ISS-1002",
            "Water pipe leak under washroom sink",
            "Slow continuous water drip under the third washbasin in Ground Floor Restroom (West Wing), causing puddling on floor tiles.",
            "Water leakage or plumbing",
            "Block C, Ground Floor Restroom",
            "High",
            "Pending",
            None,
            "Water leakage or plumbing",
            0.92,
            now_utc,
            now_utc
        ),
        (
            "ISS-1003",
            "Broken wooden student desk",
            "Desk in row 4 has detached front support leg; students cannot write safely.",
            "Damaged classroom furniture",
            "Block C, Classroom 204",
            "Medium",
            "Pending",
            None,
            "Damaged classroom furniture",
            0.79,
            now_utc,
            now_utc
        ),
        (
            "ISS-1004",
            "Overflowing recycling bin near cafeteria",
            "Exterior paper recycling bin has overflowed into the courtyard walkway after lunch rush.",
            "Garbage or litter",
            "Courtyard, Adjacent to Student Cafeteria",
            "Low",
            "Resolved",
            None,
            "Garbage or litter",
            0.94,
            now_utc,
            now_utc
        ),
        (
            "ISS-1005",
            "Ceiling fan wobbling violently",
            "Ceiling fan #2 in Physics Demo Hall oscillates with heavy rattling at medium and high speeds.",
            "Broken fan or campus equipment",
            "Block A, Room PH-102",
            "Critical",
            "In Progress",
            None,
            "Broken fan or campus equipment",
            0.88,
            now_utc,
            now_utc
        )
    ]

    for item in demo_issues:
        cursor.execute("""
            INSERT INTO issues (
                id, title, description, category, location, priority,
                status, image_path, ai_suggested_category, ai_confidence_score,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, item)

        # Add initial status log
        cursor.execute("""
            INSERT INTO status_logs (issue_id, old_status, new_status, changed_at, note)
            VALUES (?, NULL, ?, ?, 'Initial seed report registered')
        """, (item[0], item[6], now_utc))

    conn.commit()

def generate_next_issue_id(conn) -> str:
    """Generates the next sequential issue ID like ISS-1006."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM issues WHERE id LIKE 'ISS-%' ORDER BY created_at DESC, id DESC LIMIT 50")
    rows = cursor.fetchall()
    highest_num = 1000
    for r in rows:
        val = r["id"]
        try:
            num = int(val.replace("ISS-", ""))
            if num > highest_num:
                highest_num = num
        except ValueError:
            pass
    return f"ISS-{highest_num + 1}"
