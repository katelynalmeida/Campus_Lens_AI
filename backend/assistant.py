import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import sqlite3
from database import get_db

DEFAULT_SUGGESTED_PROMPTS = [
    "How many issues are pending right now?",
    "Are there any high-priority or critical issues?",
    "How do I report a broken ceiling fan?",
    "What is the status of issue ISS-1001?",
    "How does the AI image detection work?",
    "Which campus locations have reported issues?"
]

def generate_assistant_response(user_query: str) -> Dict[str, Any]:
    """
    Modular campus assistant that answers questions using live database statistics.
    Designed without external API keys; can be augmented or swapped with a generative model.
    """
    clean_query = user_query.strip().lower()
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    conn = get_db()
    cursor = conn.cursor()

    try:
        # Check for specific issue ID lookup (e.g. ISS-1001, iss-1002)
        issue_id_match = re.search(r"\b(iss-\d+)\b", clean_query, re.IGNORECASE)
        if issue_id_match:
            target_id = issue_id_match.group(1).upper()
            cursor.execute("SELECT * FROM issues WHERE UPPER(id) = ?", (target_id,))
            issue = cursor.fetchone()
            if issue:
                cursor.execute("SELECT * FROM status_logs WHERE issue_id = ? ORDER BY changed_at DESC", (issue["id"],))
                logs = cursor.fetchall()
                log_summary = f" Latest update: {logs[0]['note']} ({logs[0]['new_status']})" if logs else ""

                reply = (
                    f"**Issue {issue['id']} Report Summary:**\n"
                    f"• **Title:** {issue['title']}\n"
                    f"• **Status:** `{issue['status']}`\n"
                    f"• **Priority:** `{issue['priority']}`\n"
                    f"• **Category:** {issue['category']}\n"
                    f"• **Location:** {issue['location']}\n"
                    f"• **Reported:** {issue['created_at'][:16].replace('T', ' ')} UTC\n"
                    f"{log_summary}\n\n"
                    f"You can view complete details in the **Issue Tracking** page."
                )
                return {
                    "reply": reply,
                    "suggested_prompts": [
                        "Are there any other high-priority issues?",
                        "How many issues are pending right now?",
                        "How do I report a new issue?"
                    ],
                    "relevant_issues": [dict(issue)],
                    "timestamp": now_utc,
                    "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
                }
            else:
                return {
                    "reply": f"I checked the campus database, but no issue with ID **{target_id}** was found. Please double-check the ID or browse the **Issue Tracking** tab to see all current reports.",
                    "suggested_prompts": DEFAULT_SUGGESTED_PROMPTS[:3],
                    "relevant_issues": [],
                    "timestamp": now_utc,
                    "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
                }

        # Intent: Pending issues
        if "pending" in clean_query or "unresolved" in clean_query or "waiting" in clean_query:
            cursor.execute("SELECT id, title, priority, location FROM issues WHERE status = 'Pending' ORDER BY priority DESC, created_at DESC")
            pending_issues = cursor.fetchall()
            count = len(pending_issues)
            if count == 0:
                reply = "Good news! There are currently **0 pending issues** in the campus database. All reported problems are either in progress or resolved."
            else:
                issue_list = "\n".join([f"• **{i['id']}**: {i['title']} ({i['location']}) — Priority: *{i['priority']}*" for i in pending_issues[:5]])
                remaining = f"\n*...and {count - 5} more.*" if count > 5 else ""
                reply = (
                    f"There are currently **{count} pending issue(s)** requiring facility attention:\n\n"
                    f"{issue_list}{remaining}\n\n"
                    f"Facility teams can review and update their statuses in the **Issue Tracking** dashboard."
                )
            return {
                "reply": reply,
                "suggested_prompts": [
                    "Are there any high-priority or critical issues?",
                    "How many issues are in progress?",
                    "Which campus locations have reported issues?"
                ],
                "relevant_issues": [dict(i) for i in pending_issues[:5]],
                "timestamp": now_utc,
                "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
            }

        # Intent: In progress issues
        if "in progress" in clean_query or "active issues" in clean_query or "ongoing" in clean_query:
            cursor.execute("SELECT id, title, priority, location FROM issues WHERE status = 'In Progress' ORDER BY created_at DESC")
            in_prog = cursor.fetchall()
            count = len(in_prog)
            if count == 0:
                reply = "There are currently **0 issues marked In Progress**."
            else:
                issue_list = "\n".join([f"• **{i['id']}**: {i['title']} ({i['location']}) — Priority: *{i['priority']}*" for i in in_prog[:5]])
                reply = f"There are currently **{count} issue(s) actively being worked on by campus maintenance:**\n\n{issue_list}"
            return {
                "reply": reply,
                "suggested_prompts": [
                    "How many issues are pending right now?",
                    "How many issues have been resolved?",
                    "How do I report a new issue?"
                ],
                "relevant_issues": [dict(i) for i in in_prog],
                "timestamp": now_utc,
                "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
            }

        # Intent: Resolved issues
        if "resolved" in clean_query or "completed" in clean_query or "fixed" in clean_query:
            cursor.execute("SELECT COUNT(*) FROM issues WHERE status = 'Resolved'")
            resolved_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM issues")
            total_count = cursor.fetchone()[0]
            rate = round((resolved_count / total_count * 100), 1) if total_count > 0 else 0
            reply = (
                f"A total of **{resolved_count} out of {total_count} issues ({rate}%)** have been marked as **Resolved** in the system.\n\n"
                f"Resolved items remain archived in the database for auditing and facility maintenance history."
            )
            return {
                "reply": reply,
                "suggested_prompts": [
                    "How many issues are pending right now?",
                    "Are there any high-priority or critical issues?",
                    "What are the most common issue categories?"
                ],
                "relevant_issues": [],
                "timestamp": now_utc,
                "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
            }

        # Intent: High priority / Critical
        if "high-priority" in clean_query or "high priority" in clean_query or "critical" in clean_query or "urgent" in clean_query or "emergency" in clean_query:
            cursor.execute("SELECT id, title, priority, status, location FROM issues WHERE priority IN ('High', 'Critical') AND status != 'Resolved' ORDER BY CASE priority WHEN 'Critical' THEN 1 ELSE 2 END")
            urgent_issues = cursor.fetchall()
            count = len(urgent_issues)
            if count == 0:
                reply = "There are currently **no unresolved High or Critical priority issues** on campus."
            else:
                list_str = "\n".join([f"• **[{i['priority'].upper()}] {i['id']}**: {i['title']} in {i['location']} (Status: `{i['status']}`)" for i in urgent_issues])
                reply = (
                    f"⚠️ Attention: There are **{count} unresolved urgent issue(s)**:\n\n"
                    f"{list_str}\n\n"
                    f"Maintenance coordinators should prioritize these items to prevent campus disruptions or safety risks."
                )
            return {
                "reply": reply,
                "suggested_prompts": [
                    "How do I update an issue's status?",
                    "Which campus locations have reported issues?",
                    "How do I report a new critical hazard?"
                ],
                "relevant_issues": [dict(i) for i in urgent_issues],
                "timestamp": now_utc,
                "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
            }

        # Intent: Locations with reported issues
        if "location" in clean_query or "locations" in clean_query or "where" in clean_query or "building" in clean_query or "block" in clean_query:
            cursor.execute("""
                SELECT location, COUNT(*) as count, 
                       SUM(CASE WHEN status != 'Resolved' THEN 1 ELSE 0 END) as open_count
                FROM issues 
                GROUP BY location 
                ORDER BY open_count DESC, count DESC
                LIMIT 8
            """)
            locs = cursor.fetchall()
            if not locs:
                reply = "No campus locations currently have recorded issues."
            else:
                loc_list = "\n".join([f"• **{l['location']}**: {l['open_count']} open issue(s) ({l['count']} total reported)" for l in locs])
                reply = f"Here are the primary campus locations with reported issues:\n\n{loc_list}\n\nTo view facilities and infrastructure, visit the **Campus Facilities** page."
            return {
                "reply": reply,
                "suggested_prompts": [
                    "How many issues are pending right now?",
                    "Are there any high-priority or critical issues?",
                    "How do I report an issue for a specific room?"
                ],
                "relevant_issues": [],
                "timestamp": now_utc,
                "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
            }

        # Intent: How to report a broken fan / electrical / water / furniture
        if "fan" in clean_query or "broken fan" in clean_query:
            reply = (
                "**How to report a broken or rattling fan:**\n"
                "1. Navigate to **Report an Issue** from the sidebar.\n"
                "2. Take or upload a photo of the fan or control switch (optional but recommended).\n"
                "3. The AI image model will recognize *Broken fan or campus equipment*.\n"
                "4. Enter the building and room number (e.g., *Block A, Room 102, Fan #3*).\n"
                "5. Set priority: choose **Critical** if the fan is wobbling dangerously, or **Medium/High** if it doesn't spin.\n"
                "6. Click **Submit Report** to notify the campus facilities team."
            )
            return {
                "reply": reply,
                "suggested_prompts": [
                    "How does the AI image detection work?",
                    "How do I report water leakage?",
                    "How many issues are pending right now?"
                ],
                "relevant_issues": [],
                "timestamp": now_utc,
                "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
            }

        if "water" in clean_query or "leak" in clean_query or "plumbing" in clean_query or "washroom" in clean_query:
            reply = (
                "**How to report water leakage or plumbing faults:**\n"
                "1. Go to the **Report an Issue** page.\n"
                "2. Capture or upload a photo showing the leak, pipe, or water accumulation.\n"
                "3. AI classification will suggest *Water leakage or plumbing*.\n"
                "4. Note the specific floor and restroom stall or lab sink.\n"
                "5. Mark priority as **High** if water is flowing or risking electrical equipment, or **Critical** if flooding.\n"
                "6. Submit the report to generate an official tracking ticket."
            )
            return {
                "reply": reply,
                "suggested_prompts": [
                    "Are there any water leak issues reported right now?",
                    "How do I report a broken ceiling fan?",
                    "How many issues are pending right now?"
                ],
                "relevant_issues": [],
                "timestamp": now_utc,
                "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
            }

        # Intent: How image detection works
        if "image detection" in clean_query or "photo" in clean_query or "ai work" in clean_query or "classifier" in clean_query or "vision" in clean_query:
            reply = (
                "**How CampusLens AI Photo Issue Detection Works:**\n"
                "• **Model:** Uses open-source zero-shot vision embedding (`openai/clip-vit-base-patch32`) from Hugging Face Transformers.\n"
                "• **No API Keys:** Runs 100% locally on the server without external cloud dependencies or paid APIs.\n"
                "• **Zero-shot Category Matching:** Evaluates visual features against campus infrastructure classes (electrical, plumbing, furniture, litter, walls, fans).\n"
                "• **Human-in-the-Loop:** Displays similarity scores as confidence estimates and asks you to confirm or adjust before final submission.\n"
                "• **Resilience:** If photos are unavailable or lighting is poor, you can always submit reports manually."
            )
            return {
                "reply": reply,
                "suggested_prompts": [
                    "How do I report a broken ceiling fan?",
                    "How many issues are pending right now?",
                    "Are there any high-priority or critical issues?"
                ],
                "relevant_issues": [],
                "timestamp": now_utc,
                "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
            }

        # Intent: Facility inventory & infrastructure status
        if "facility" in clean_query or "facilities" in clean_query or "labs" in clean_query or "classrooms" in clean_query:
            cursor.execute("SELECT facility_type, COUNT(*) as count FROM facilities GROUP BY facility_type")
            fac_types = cursor.fetchall()
            cursor.execute("SELECT COUNT(*) FROM facilities WHERE maintenance_status != 'Operational'")
            needing_maint = cursor.fetchone()[0]
            summary = ", ".join([f"{f['count']} {f['facility_type']}s" for f in fac_types])
            reply = (
                f"CampusLens manages facility records across campus: **{summary}**.\n\n"
                f"Currently, **{needing_maint} facility/facilities** are flagged under maintenance or needing inspection. "
                f"Visit the **Campus Facilities** page for full descriptions and maintenance statuses."
            )
            return {
                "reply": reply,
                "suggested_prompts": [
                    "Which campus locations have reported issues?",
                    "How many issues are pending right now?",
                    "Are there any high-priority or critical issues?"
                ],
                "relevant_issues": [],
                "timestamp": now_utc,
                "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
            }

        # Intent: Total count or overview
        if "total" in clean_query or "how many issues" in clean_query or "statistics" in clean_query or "overview" in clean_query:
            cursor.execute("SELECT COUNT(*) FROM issues")
            total = cursor.fetchone()[0]
            cursor.execute("SELECT status, COUNT(*) as count FROM issues GROUP BY status")
            statuses = {r["status"]: r["count"] for r in cursor.fetchall()}
            reply = (
                f"**Campus Maintenance Overview:**\n"
                f"• Total Reported Issues: **{total}**\n"
                f"• Pending: **{statuses.get('Pending', 0)}**\n"
                f"• In Progress: **{statuses.get('In Progress', 0)}**\n"
                f"• Resolved: **{statuses.get('Resolved', 0)}**\n\n"
                f"You can explore visual breakdown charts on the **Overview** dashboard."
            )
            return {
                "reply": reply,
                "suggested_prompts": [
                    "Are there any high-priority or critical issues?",
                    "How do I report a new issue?",
                    "What is the status of issue ISS-1001?"
                ],
                "relevant_issues": [],
                "timestamp": now_utc,
                "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
            }

        # Default fallback
        cursor.execute("SELECT COUNT(*) FROM issues WHERE status = 'Pending'")
        pending_num = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM issues WHERE priority IN ('High', 'Critical') AND status != 'Resolved'")
        urgent_num = cursor.fetchone()[0]

        reply = (
            f"Hello! I am the **CampusLens AI Facility Assistant**.\n\n"
            f"I have live access to the campus maintenance database. Currently, there are **{pending_num} pending issue(s)** and **{urgent_num} high-priority issue(s)**.\n\n"
            f"You can ask me questions about specific issue IDs (e.g., *'What is the status of ISS-1002?'*), "
            f"campus problem counts, facility maintenance statuses, or instructions on reporting broken campus equipment."
        )
        return {
            "reply": reply,
            "suggested_prompts": DEFAULT_SUGGESTED_PROMPTS,
            "relevant_issues": [],
            "timestamp": now_utc,
            "assistant_type": "CampusLens Rule-Based Campus Intelligence (Zero API Keys)"
        }

    finally:
        conn.close()
