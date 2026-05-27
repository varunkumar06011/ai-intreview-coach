# AI Interview Coach – Premium Edition

An interactive, premium ChatGPT-style mock interview simulator designed to test, evaluate, and coach candidates targeting FAANG companies. Features a dark theme with glassmorphic cards, scoring indicators, micro-animations, and full-stack API integration.

## 🚀 Features

- **ChatGPT-like Premium UI**: Fully responsive sidebar dashboard, chat feed, interactive glassmorphic cards, and bouncing typing indicators.
- **Instant AI Assessment**: AI checks user answers for **clarity**, **correctness**, and **confidence**. It outputs a rating (1-10) with detailed feedback (strengths, weaknesses, suggestions) and asks the next question.
- **Celebration Animations**: High-performing responses (score 8+) are rewarded with a colorful confetti splash using `canvas-confetti`.
- **Flexible AI Router**: Built-in REST client for **OpenRouter API** (e.g. for using open weights / free models), **Gemini API**, and **OpenAI API**.
- **Robust Mock Mode**: If no API keys are provided, the app falls back to a custom semantic Mock Mode. It remains **100% functional out-of-the-box** with rich interview flows and tailored responses based on candidate answers.
- **SQLite3 Integration**: Sessions, history, and assessments are persisted locally. Deleted sessions cascade-delete sub-tables.

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Lucide Icons, Canvas Confetti, Vanilla CSS.
- **Backend**: FastAPI (Python), Uvicorn.
- **Database**: SQLite3.

---

## ⚙️ Project Structure

```
ai-interview-coach/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application startup & endpoints
│   │   ├── database.py      # SQLite connection & DB schema setup
│   │   ├── ai_service.py    # LLM service interface (Gemini/OpenAI/Mock)
│   │   └── models.py        # Pydantic schemas for requests/responses
│   ├── requirements.txt     # Python dependencies
│   └── database.db          # SQLite Database (generated automatically)
├── frontend/
│   ├── src/
│   │   ├── components/      
│   │   │   ├── Sidebar.jsx      # Navigation, active AI indicator, and trash actions
│   │   │   ├── ChatFeed.jsx     # Chronological bubble layouts & auto-scrollers
│   │   │   ├── FeedbackCard.jsx # Colorful strengths, weaknesses, and progress scores
│   │   │   └── StartModal.jsx   # Select role, level, type, and target company
│   │   ├── App.jsx          # Main state manager
│   │   ├── index.css        # Premium dark themes and glowing blurs
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json         
│   └── vite.config.js       
├── .env.template            # API Keys template configuration
└── README.md                # This manual
```

---

## 🏃 Getting Started

### Prerequisites
- Python 3.10+ (tested on Python 3.14.5)
- Node.js 18+ (tested on Node v24.15.0)

### 1. Setup API Keys (Optional)
To enable live AI generation and grading:
1. Rename the `.env.template` file in the root to `.env`.
2. Insert your API keys:
   ```env
   # OpenRouter setup (e.g. for free high-parameter models)
   OPENROUTER_API_KEY="your-openrouter-key"
   OPENROUTER_MODEL="openai/gpt-oss-120b:free"
   
   # OR Gemini
   GEMINI_API_KEY="your-gemini-key"
   
   # OR OpenAI
   OPENAI_API_KEY="your-openai-key"
   ```
3. Copy the `.env` file into the `backend/` directory. If no key is set, the application will run in **Mock Mode** using pre-configured mock questions.

### 2. Start the Backend Server
```bash
# Navigate to backend directory
cd backend

# Install dependencies (already completed in workspace)
pip install -r requirements.txt

# Start the FastAPI reload server
uvicorn app.main:app --reload
```
The backend server will spin up on **`http://127.0.0.1:8000`**. You can inspect the Swagger API documentation at `http://127.0.0.1:8000/docs`.

### 3. Start the Frontend Application
In a separate terminal:
```bash
# Navigate to frontend directory
cd frontend

# Install packages (already completed in workspace)
npm install

# Run the local development server
npm run dev
```
The Vite development server will host the application on **`http://localhost:5173`**.

---

## 🔌 API Flow Specification

The backend provides the following REST interfaces:

- **`GET /api/health`**
  Returns general status, active AI Engine Mode (`gemini`, `openai`, or `mock`), and database connection status.
- **`POST /api/start-session`**
  Initializes a new mock interview session with specified role, target company, difficulty level, and interview type.
- **`POST /api/ask-question`**
  Generates and saves the first/next interview question using the active AI engine.
- **`POST /api/submit-answer`**
  Stores candidate's answer, triggers AI to analyze correctness and clarity, registers strengths/weaknesses feedback, updates the database, and schedules the next interviewer question.
- **`GET /api/session/{id}`**
  Fetches full session metadata and chronological messages, joining user answer entries with their detailed assessments.
- **`DELETE /api/session/{id}`**
  Deletes an active session and cascadingly removes all associated messages and feedback logs from the database.
