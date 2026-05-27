import os
import sys
import asyncio
import sqlite3
import uuid

# Add backend directory to Python path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import (
    init_db,
    create_session,
    get_sessions,
    get_session,
    create_message,
    get_session_messages,
    create_feedback,
    get_full_session_history
)
from app.ai_service import evaluate_answer_and_next_question, generate_first_question

async def run_tests():
    print("=== STARTING BACKEND TESTS ===")
    
    # 1. Initialize DB
    print("\n1. Initializing database...")
    init_db()
    db_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")
    if os.path.exists(db_file):
        print(f"Success: Database file created at {db_file}")
    else:
        print("Error: Database file not found!")
        return
        
    # Verify tables exist
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    print("Tables found:", tables)
    assert "sessions" in tables, "sessions table missing"
    assert "messages" in tables, "messages table missing"
    assert "feedback" in tables, "feedback table missing"
    conn.close()

    # 2. Test Session Creation
    print("\n2. Testing session creation...")
    test_id = f"test-session-{uuid.uuid4()}"
    create_session(
        session_id=test_id,
        role="Backend Engineer",
        company="Google",
        level="Senior",
        interview_type="Technical/Coding"
    )
    
    sessions = get_sessions()
    print(f"Total sessions: {len(sessions)}")
    assert len(sessions) > 0, "No sessions retrieved"
    
    sess = get_session(test_id)
    print("Retrieved session details:", sess)
    assert sess is not None, "Failed to retrieve session"
    assert sess["role"] == "Backend Engineer"
    assert sess["company"] == "Google"

    # 3. Test Generating First Question
    print("\n3. Testing question generation (Mock Mode fallback/Live)...")
    q1 = await generate_first_question(
        role=sess["role"],
        company=sess["company"],
        level=sess["level"],
        interview_type=sess["interview_type"]
    )
    print("Generated question:", q1)
    assert len(q1) > 0, "Generated empty question"
    
    # Save the question
    q1_id = f"q1-{uuid.uuid4()}"
    create_message(q1_id, test_id, "ai", q1)
    messages = get_session_messages(test_id)
    print(f"Messages count: {len(messages)}")
    assert len(messages) == 1, "Failed to store message"

    # 4. Test Submitting Answer
    print("\n4. Testing answer submission and evaluation...")
    candidate_answer = "I would design a Redis cache layer on top of PostgreSQL. We'll use write-through cache strategy, index the user_id column in PostgreSQL to speed up querying, and scale it using read replicas."
    
    # Evaluate
    eval_result = await evaluate_answer_and_next_question(
        role=sess["role"],
        company=sess["company"],
        level=sess["level"],
        interview_type=sess["interview_type"],
        history=messages,
        candidate_answer=candidate_answer
    )
    print("Evaluation result:")
    print(f"  Score: {eval_result['feedback']['score']}/10")
    print(f"  Strengths: {eval_result['feedback']['strengths']}")
    print(f"  Weaknesses: {eval_result['feedback']['weaknesses']}")
    print(f"  Improvement: {eval_result['feedback']['improvement']}")
    print(f"  Next Question: {eval_result['next_question']}")
    
    assert eval_result["feedback"]["score"] > 0, "Invalid score"
    assert len(eval_result["next_question"]) > 0, "Invalid next question"
    
    # Save answer and feedback
    a1_id = f"a1-{uuid.uuid4()}"
    create_message(a1_id, test_id, "user", candidate_answer)
    create_feedback(
        feedback_id=f"fb1-{uuid.uuid4()}",
        message_id=a1_id,
        strengths=eval_result["feedback"]["strengths"],
        weaknesses=eval_result["feedback"]["weaknesses"],
        improvement=eval_result["feedback"]["improvement"],
        score=eval_result["feedback"]["score"]
    )
    
    # Save next question
    create_message(f"q2-{uuid.uuid4()}", test_id, "ai", eval_result["next_question"])

    # 5. Fetch Full History
    print("\n5. Testing retrieval of full session history...")
    history = get_full_session_history(test_id)
    print(f"Total messages in history: {len(history)}")
    assert len(history) == 3, f"Expected 3 messages, got {len(history)}"
    
    # Verify feedback links
    user_msg = history[1]
    assert user_msg["role"] == "user"
    assert user_msg["feedback"] is not None, "Feedback not joined to user message"
    assert user_msg["feedback"]["score"] == eval_result["feedback"]["score"]
    print("Feedback successfully joined to history!")
    
    print("\nTests complete successfully!")
    print("=== BACKEND TESTS PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
