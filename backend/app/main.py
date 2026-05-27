import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import (
    init_db,
    create_session,
    delete_session,
    get_sessions,
    get_session,
    create_message,
    get_full_session_history,
    create_feedback
)
from .models import (
    SessionStartRequest,
    SessionResponse,
    AskQuestionRequest,
    AskQuestionResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    SessionHistoryResponse,
    HealthResponse,
    FeedbackDetail
)
from .ai_service import (
    get_ai_mode,
    generate_first_question,
    evaluate_answer_and_next_question
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the database on startup
    init_db()
    yield
    # Shutdown logic (if any) could go here

app = FastAPI(
    title="AI Interview Coach – Premium Edition API",
    description="Backend services for the AI Interview Coach platform.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development, allow all origins. Can be restricted to Vite port in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", response_model=HealthResponse)
async def health():
    ai_mode = get_ai_mode()
    db_ok = True
    try:
        get_sessions()
    except Exception:
        db_ok = False
    return {
        "status": "healthy",
        "ai_mode": ai_mode,
        "database_connected": db_ok
    }

@app.get("/api/sessions")
async def list_sessions():
    try:
        return get_sessions()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@app.post("/api/start-session", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def start_session(payload: SessionStartRequest):
    session_id = str(uuid.uuid4())
    try:
        create_session(
            session_id=session_id,
            role=payload.role,
            company=payload.company,
            level=payload.level,
            interview_type=payload.interview_type
        )
        created_session = get_session(session_id)
        if not created_session:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve newly created session."
            )
        return {
            "id": created_session["id"],
            "role": created_session["role"],
            "company": created_session["company"],
            "level": created_session["level"],
            "interview_type": created_session["interview_type"],
            "created_at": created_session["created_at"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start session: {str(e)}"
        )

@app.post("/api/ask-question", response_model=AskQuestionResponse)
async def ask_question(payload: AskQuestionRequest):
    session = get_session(payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID '{payload.session_id}' not found."
        )
        
    history = get_full_session_history(payload.session_id)
    
    # If history is empty, generate the very first question
    if not history:
        question = await generate_first_question(
            role=session["role"],
            company=session["company"],
            level=session["level"],
            interview_type=session["interview_type"]
        )
    else:
        # If history exists, extract the next question context
        # Wait, if we want to ask the next question, we usually fetch the last AI message
        # that wasn't answered. But if they are requesting a new question explicitly:
        # We can look at the history and see if the last message is a user message.
        # If the last message is an AI question, we might just return it.
        # Let's check what the last message in history was:
        last_msg = history[-1]
        if last_msg["role"] == "ai":
            # Just return the current unanswered question
            return {"question": last_msg["content"]}
            
        # Otherwise, if the last message is user answer, generate the next question
        # (This is mostly handled in submit-answer, but as a backup here)
        question = await generate_first_question(
            role=session["role"],
            company=session["company"],
            level=session["level"],
            interview_type=session["interview_type"]
        )
        
    # Save the generated question to database
    question_id = str(uuid.uuid4())
    create_message(
        message_id=question_id,
        session_id=payload.session_id,
        role="ai",
        content=question
    )
    
    return {"question": question}

@app.post("/api/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(payload: SubmitAnswerRequest):
    session = get_session(payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID '{payload.session_id}' not found."
        )
        
    # 1. Fetch current history before adding the new answer
    history = get_full_session_history(payload.session_id)
    if not history:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit an answer to an empty interview session. Call /ask-question first."
        )
        
    # Check if the last message was from the user (they shouldn't submit twice in a row)
    if history[-1]["role"] == "user":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate answer submission. Awaiting the next question."
        )

    # 2. Save the candidate's answer to messages table
    answer_id = str(uuid.uuid4())
    create_message(
        message_id=answer_id,
        session_id=payload.session_id,
        role="user",
        content=payload.answer
    )
    
    # 3. Call the AI service to evaluate the response and generate the next question
    result = await evaluate_answer_and_next_question(
        role=session["role"],
        company=session["company"],
        level=session["level"],
        interview_type=session["interview_type"],
        history=history, # contains all messages up to the question that is being answered
        candidate_answer=payload.answer
    )
    
    feedback_data = result["feedback"]
    next_question_text = result["next_question"]
    
    # 4. Save feedback in database (linked to the answer message ID)
    feedback_id = str(uuid.uuid4())
    create_feedback(
        feedback_id=feedback_id,
        message_id=answer_id,
        strengths=feedback_data["strengths"],
        weaknesses=feedback_data["weaknesses"],
        improvement=feedback_data["improvement"],
        score=feedback_data["score"]
    )
    
    # 5. Save the next AI question in messages table
    next_question_id = str(uuid.uuid4())
    create_message(
        message_id=next_question_id,
        session_id=payload.session_id,
        role="ai",
        content=next_question_text
    )
    
    # 6. Return response
    return {
        "feedback": FeedbackDetail(
            strengths=feedback_data["strengths"],
            weaknesses=feedback_data["weaknesses"],
            improvement=feedback_data["improvement"],
            score=feedback_data["score"]
        ),
        "next_question": next_question_text
    }

@app.get("/api/session/{id}", response_model=SessionHistoryResponse)
async def get_session_history(id: str):
    session = get_session(id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID '{id}' not found."
        )
        
    history = get_full_session_history(id)
    return {
        "session": session,
        "history": history
    }

@app.delete("/api/session/{id}", status_code=status.HTTP_200_OK)
async def remove_session(id: str):
    session = get_session(id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID '{id}' not found."
        )
    try:
        delete_session(id)
        return {"status": "success", "message": f"Session {id} deleted successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )
