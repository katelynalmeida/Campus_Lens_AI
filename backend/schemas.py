from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class IssueCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=5, max_length=2000)
    category: str = Field(..., min_length=2, max_length=100)
    location: str = Field(..., min_length=2, max_length=150)
    priority: str = Field(..., pattern="^(Low|Medium|High|Critical)$")
    image_path: Optional[str] = None
    ai_suggested_category: Optional[str] = None
    ai_confidence_score: Optional[float] = None

class IssueUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(Pending|In Progress|Resolved)$")
    priority: Optional[str] = Field(None, pattern="^(Low|Medium|High|Critical)$")
    note: Optional[str] = Field(None, max_length=500)

class StatusLogResponse(BaseModel):
    id: int
    issue_id: str
    old_status: Optional[str]
    new_status: str
    changed_at: str
    note: Optional[str]

class IssueResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    location: str
    priority: str
    status: str
    image_path: Optional[str]
    ai_suggested_category: Optional[str]
    ai_confidence_score: Optional[float]
    created_at: str
    updated_at: str
    status_logs: Optional[List[StatusLogResponse]] = []

class FacilityResponse(BaseModel):
    id: int
    name: str
    facility_type: str
    building_or_block: str
    description: Optional[str]
    maintenance_status: str
    created_at: str
    open_issues_count: Optional[int] = 0

class DashboardStatsResponse(BaseModel):
    total_issues: int
    pending_issues: int
    in_progress_issues: int
    resolved_issues: int
    high_priority_issues: int
    total_facilities: int
    status_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
    recent_issues: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]

class AlternativePrediction(BaseModel):
    category: str
    score: float
    description: str

class ImageDetectionResponse(BaseModel):
    suggested_category: str
    top_alternatives: List[AlternativePrediction]
    message: str
    needs_confirmation: bool
    model_name: str
    model_status: str
    saved_image_path: Optional[str] = None

class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)

class AssistantChatResponse(BaseModel):
    reply: str
    suggested_prompts: List[str]
    relevant_issues: Optional[List[Dict[str, Any]]] = None
    timestamp: str
    assistant_type: str = "CampusLens Rule-Based AI Assistant"

class HealthResponse(BaseModel):
    status: str
    database: str
    vision_model: str
    timestamp: str
    version: str
