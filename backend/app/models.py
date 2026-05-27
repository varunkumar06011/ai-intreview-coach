from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SessionStartRequest(BaseModel):
    role: str = Field(..., example="Software Engineer")
    company: str = Field(..., example="Google")
    level: str = Field(..., example="Senior")
    interview_type: str = Field(..., example="Technical/Coding")

class SessionResponse(BaseModel):
    id: str
    role: str
    company: str
    level: str
    interview_type: str
    created_at: str

class AskQuestionRequest(BaseModel):
    session_id: str

class AskQuestionResponse(BaseModel):
    question: str

class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer: str

class FeedbackDetail(BaseModel):
    strengths: str
    weaknesses: str
    improvement: str
    score: int = Field(..., ge=1, le=10)

class SubmitAnswerResponse(BaseModel):
    feedback: FeedbackDetail
    next_question: str

class FeedbackModel(BaseModel):
    id: str
    message_id: str
    strengths: str
    weaknesses: str
    improvement: str
    score: int
    created_at: str

class MessageHistoryItem(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: str
    feedback: Optional[FeedbackModel] = None

class SessionHistoryResponse(BaseModel):
    session: Dict[str, Any]
    history: List[MessageHistoryItem]

class HealthResponse(BaseModel):
    status: str
    ai_mode: str
    database_connected: bool
