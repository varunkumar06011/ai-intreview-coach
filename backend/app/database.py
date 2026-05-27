import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database.db")

@contextmanager
def get_db_connection():
    # Ensure the parent directory of the DB exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys support in SQLite
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Create sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                company TEXT NOT NULL,
                level TEXT NOT NULL,
                interview_type TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL, -- 'user' or 'ai'
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
            );
        """)
        
        # Create feedback table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id TEXT PRIMARY KEY,
                message_id TEXT NOT NULL UNIQUE,
                strengths TEXT NOT NULL,
                weaknesses TEXT NOT NULL,
                improvement TEXT NOT NULL,
                score INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
            );
        """)
        
        conn.commit()

def create_session(session_id: str, role: str, company: str, level: str, interview_type: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sessions (id, role, company, level, interview_type)
            VALUES (?, ?, ?, ?, ?)
            """,
            (session_id, role, company, level, interview_type)
        )
        conn.commit()

def delete_session(session_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()

def get_sessions():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def get_session(session_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def create_message(message_id: str, session_id: str, role: str, content: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO messages (id, session_id, role, content)
            VALUES (?, ?, ?, ?)
            """,
            (message_id, session_id, role, content)
        )
        conn.commit()

def get_session_messages(session_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def create_feedback(feedback_id: str, message_id: str, strengths: str, weaknesses: str, improvement: str, score: int):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO feedback (id, message_id, strengths, weaknesses, improvement, score)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (feedback_id, message_id, strengths, weaknesses, improvement, score)
        )
        conn.commit()

def get_feedback_for_message(message_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM feedback WHERE message_id = ?", (message_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def get_full_session_history(session_id: str):
    messages = get_session_messages(session_id)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Fetch all feedback for this session
        cursor.execute(
            """
            SELECT f.* FROM feedback f
            JOIN messages m ON f.message_id = m.id
            WHERE m.session_id = ?
            """,
            (session_id,)
        )
        feedback_rows = cursor.fetchall()
        feedback_map = {row["message_id"]: dict(row) for row in feedback_rows}
        
    history = []
    for msg in messages:
        msg_dict = dict(msg)
        if msg_dict["role"] == "user":
            msg_dict["feedback"] = feedback_map.get(msg_dict["id"])
        history.append(msg_dict)
    return history
