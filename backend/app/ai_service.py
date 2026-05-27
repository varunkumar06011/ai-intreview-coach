import os
import json
import logging
import httpx
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

def get_ai_mode() -> str:
    """Returns 'openrouter', 'gemini', 'openai', or 'mock' depending on available API keys."""
    if OPENROUTER_API_KEY:
        return "openrouter"
    elif GEMINI_API_KEY:
        return "gemini"
    elif OPENAI_API_KEY:
        return "openai"
    return "mock"

def clean_json_response(text: str) -> str:
    """Strips markdown code block formatting from LLM JSON responses."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

# --- MOCK SERVICE DATA & LOGIC ---
MOCK_QUESTIONS = {
    "Technical/Coding": [
        "Can you explain the difference between a process and a thread, and how they share resources in memory? In what scenarios would you choose multi-threading over multi-processing?",
        "How does the browser event loop work, specifically with respect to the microtask queue, macrotask queue, and rendering pipeline? How does this impact CSS transitions or JS animations?",
        "Suppose you have a database query that is running slowly in production. Walk me through your step-by-step methodology for diagnosing the root cause and optimizing it.",
        "What is the difference between optimistic and pessimistic locking in databases? Describe a high-concurrency booking scenario and which locking strategy you would apply.",
        "How do you implement secure, scalable user authentication in a modern distributed application? Explain JWT, session store, CSRF protections, and OAuth2 flow."
    ],
    "System Design": [
        "Design a URL shortening service (like bit.ly) that can handle 10,000 write requests per second and 100,000 read requests per second. What database schema and caching layer would you use?",
        "How would you design a distributed, fault-tolerant rate limiter for an API gateway that handles millions of active users per hour? Explain how you would prevent race conditions.",
        "Design a live chat system like Slack. How do you handle real-time message delivery, channel subscription, user online/offline status, and persistence of millions of historical chat logs?",
        "How would you design a media processing pipeline that converts user-uploaded 4K videos into multiple resolutions (1080p, 720p, etc.) and handles traffic surges?",
        "Design a global leaderboard for a gaming application that processes scores from 50 million active players. How do you ensure updates are fast and leaderboard reads are real-time?"
    ],
    "Behavioral": [
        "Tell me about a time when you had a major technical disagreement with a senior engineer or architect on your team. How did you present your case, and what was the ultimate resolution?",
        "Describe a situation where you had to ship a feature under extremely tight deadlines, and you knew you had to accumulate technical debt to meet the launch. How did you manage it?",
        "Tell me about a project you led that failed or fell short of expectations. What were the root causes, what did you learn, and how did you apply those learnings to subsequent projects?",
        "How do you handle a team member who is underperforming on critical sprint deliverables, especially when you are the tech lead or senior driver on that project?",
        "Describe a time when you went above and beyond your immediate job responsibilities to solve a critical customer or operational problem. What motivated you and what was the outcome?"
    ]
}

def get_mock_question(interview_type: str, index: int) -> str:
    questions = MOCK_QUESTIONS.get(interview_type, MOCK_QUESTIONS["Technical/Coding"])
    return questions[index % len(questions)]

def generate_mock_feedback(question: str, answer: str, interview_type: str, index: int) -> dict:
    answer_len = len(answer.strip())
    
    # Simple semantic keyword analysis to make feedback feel somewhat dynamic
    keywords = ["cache", "index", "process", "lock", "thread", "load balancer", "redis", "postgres", "jwt", "event loop", "microtask", "star", "situation", "compromise", "data", "testing", "scale"]
    found_keywords = [kw for kw in keywords if kw in answer.lower()]
    
    if answer_len < 30:
        score = 3
        strengths = "You responded promptly."
        weaknesses = "Your answer was extremely short and lacked detail. It did not elaborate on technical concepts or practical trade-offs required at this level."
        improvement = "Try structuring your answers using the STAR method for behavioral questions, or dive deeper into the architectural details (e.g., latency, storage, memory management) for technical ones."
    elif len(found_keywords) >= 3:
        score = 8 + (1 if answer_len > 300 else 0)
        score = min(score, 10)
        strengths = f"Great use of domain terminology. You correctly identified and mentioned key architectural elements such as: {', '.join(found_keywords)}."
        weaknesses = "While the high-level concepts were well defined, the answer could outline more explicit edge cases, failure states, or alternative scaling options."
        improvement = "Focus on detail-oriented planning. For example, explain how you would handle network partitions (CAP theorem) or security validations for those specific components."
    else:
        score = 6 + (1 if answer_len > 200 else 0)
        strengths = "The response is coherent and addresses the question directly in a structured format."
        weaknesses = "The answer remains somewhat generic. It lacks specific examples of production systems, scaling challenges, or code-level patterns."
        improvement = "Incorporate real-world experiences or specific frameworks. Quantify your accomplishments (e.g., 'reduced latency by 30%') and explicitly explain trade-offs."
        
    next_question = get_mock_question(interview_type, index + 1)
    
    return {
        "feedback": {
            "strengths": strengths,
            "weaknesses": weaknesses,
            "improvement": improvement,
            "score": score
        },
        "next_question": next_question
    }

# --- HTTP API CALLERS ---
async def call_gemini_api(prompt: str, system_instruction: str = None) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    full_prompt = prompt
    if system_instruction:
        full_prompt = f"System Instruction: {system_instruction}\n\nUser Prompt: {prompt}"
        
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": full_prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            logger.error(f"Gemini API returned error {response.status_code}: {response.text}")
            raise Exception(f"Gemini API Error: {response.text}")
            
        result = response.json()
        try:
            output_text = result["candidates"][0]["content"]["parts"][0]["text"]
            return output_text
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to parse Gemini response: {result}")
            raise Exception("Invalid response structure from Gemini API")

async def call_openai_api(prompt: str, system_instruction: str = None) -> str:
    url = "https://api.openai.com/v1/chat/completions"
    
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    
    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "response_format": {"type": "json_object"}
    }
    
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            logger.error(f"OpenAI API returned error {response.status_code}: {response.text}")
            raise Exception(f"OpenAI API Error: {response.text}")
            
        result = response.json()
        try:
            output_text = result["choices"][0]["message"]["content"]
            return output_text
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to parse OpenAI response: {result}")
            raise Exception("Invalid response structure from OpenAI API")

async def call_openrouter_api(prompt: str, system_instruction: str = None) -> str:
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "response_format": {"type": "json_object"}
    }
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "AI Interview Coach"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            logger.error(f"OpenRouter API returned error {response.status_code}: {response.text}")
            raise Exception(f"OpenRouter API Error: {response.text}")
            
        result = response.json()
        try:
            output_text = result["choices"][0]["message"]["content"]
            return output_text
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to parse OpenRouter response: {result}")
            raise Exception("Invalid response structure from OpenRouter API")

# --- PUBLIC FUNCTIONS ---
async def generate_first_question(role: str, company: str, level: str, interview_type: str) -> str:
    ai_mode = get_ai_mode()
    
    if ai_mode == "mock":
        return get_mock_question(interview_type, 0)
        
    system_prompt = (
        "You are a Senior FAANG tech lead and hiring manager. Your job is to conduct "
        f"a realistic, high-fidelity {level}-level {interview_type} mock interview for a "
        f"{role} candidate targeting {company}."
    )
    
    prompt = (
        "Generate the first question of the interview. "
        "The question must be highly specific, professional, and aligned with standard FAANG hiring bar. "
        "Return a JSON object containing a single key: 'question' (the question text).\n"
        "Example Response:\n"
        "{\n"
        "  \"question\": \"Explain the trade-offs of using Cassandra versus PostgreSQL for storing transaction history...\"\n"
        "}"
    )
    
    try:
        if ai_mode == "openrouter":
            response_text = await call_openrouter_api(prompt, system_instruction=system_prompt)
        elif ai_mode == "gemini":
            response_text = await call_gemini_api(prompt, system_instruction=system_prompt)
        else: # openai
            response_text = await call_openai_api(prompt, system_instruction=system_prompt)
            
        data = json.loads(clean_json_response(response_text))
        return data.get("question", get_mock_question(interview_type, 0))
    except Exception as e:
        logger.error(f"AI Service error, falling back to mock: {e}")
        return get_mock_question(interview_type, 0)

async def evaluate_answer_and_next_question(
    role: str,
    company: str,
    level: str,
    interview_type: str,
    history: list,
    candidate_answer: str
) -> dict:
    ai_mode = get_ai_mode()
    message_index = len(history) // 2 # approximation of turn count
    
    if ai_mode == "mock":
        # Find the last AI question in history
        last_question = "Explain your technical background."
        for msg in reversed(history):
            if msg["role"] == "ai":
                last_question = msg["content"]
                break
        return generate_mock_feedback(last_question, candidate_answer, interview_type, message_index)
        
    system_prompt = (
        "You are a Senior FAANG tech lead and hiring manager. Your job is to evaluate "
        f"a candidate's answer for a {level}-level {interview_type} interview for a "
        f"{role} role at {company}, and then ask the next question in the sequence."
    )
    
    # Construct historical chat transcript for the AI
    history_str = ""
    for msg in history:
        role_label = "Interviewer" if msg["role"] == "ai" else "Candidate"
        history_str += f"{role_label}: {msg['content']}\n"
        
    prompt = (
        f"Here is the interview transcript so far:\n{history_str}\n"
        f"Candidate's latest answer: {candidate_answer}\n\n"
        "Evaluate the candidate's answer. Analyze its clarity, correctness, and completeness. "
        "Then, generate a relevant, professional next question in the interview sequence (or, "
        "if they have answered 5 questions already, provide a concluding wrap-up and say 'This concludes our mock interview. Thank you!').\n\n"
        "You MUST respond in JSON format with the following keys:\n"
        "- 'feedback':\n"
        "  - 'strengths': (concise analysis of candidate's correct assumptions and structures)\n"
        "  - 'weaknesses': (critique of missing details, edge cases, or errors)\n"
        "  - 'improvement': (actionable design tips or syntax adjustments)\n"
        "  - 'score': (integer score 1 to 10 evaluating correctness and confidence)\n"
        "- 'next_question': (the next interview question or wrap-up statement)\n\n"
        "Return ONLY the raw JSON object."
    )
    
    try:
        if ai_mode == "openrouter":
            response_text = await call_openrouter_api(prompt, system_instruction=system_prompt)
        elif ai_mode == "gemini":
            response_text = await call_gemini_api(prompt, system_instruction=system_prompt)
        else: # openai
            response_text = await call_openai_api(prompt, system_instruction=system_prompt)
            
        data = json.loads(clean_json_response(response_text))
        
        # Verify structure
        if "feedback" in data and "next_question" in data:
            fb = data["feedback"]
            if all(k in fb for k in ["strengths", "weaknesses", "improvement", "score"]):
                # Coerce score to integer
                fb["score"] = int(fb["score"])
                return data
                
        raise Exception("Invalid JSON structure received from LLM")
    except Exception as e:
        logger.error(f"AI Service evaluation error, falling back to mock: {e}")
        # Find the last AI question in history
        last_question = "Explain your technical background."
        for msg in reversed(history):
            if msg["role"] == "ai":
                last_question = msg["content"]
                break
        return generate_mock_feedback(last_question, candidate_answer, interview_type, message_index)
