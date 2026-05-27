import React, { useState, useEffect, useRef } from 'react';
import { Send, LogIn, MessageSquare, AlertCircle, RefreshCw, Cpu, Award, Mic, MicOff } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ChatFeed from '../components/ChatFeed';
import StartModal from '../components/StartModal';
import Proctoring from '../components/Proctoring';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [apiMode, setApiMode] = useState('mock');
  const [dbConnected, setDbConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [penaltyPoints, setPenaltyPoints] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);
  const initialValueRef = useRef('');
  const inputValueRef = useRef('');
  const isTypingRef = useRef(false);
  const activeSessionIdRef = useRef(null);
  const silenceTimeoutRef = useRef(null);

  // Keep refs in sync with state for auto-submit
  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);
  
  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);
  
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Check login
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Tab switching cheat detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && activeSessionId) {
        setPenaltyPoints(prev => prev + 1);
        alert("🚨 STRICT WARNING 🚨\n\nYou have switched tabs or minimized the screen during an active interview session. This is a violation of the proctoring rules.\n\nA penalty has been applied to your final score.");
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeSessionId]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputValue((initialValueRef.current + ' ' + transcript).trim());
        
        // Reset 5-second silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
          setIsRecording(false);
          if (inputValueRef.current.trim() && !isTypingRef.current && activeSessionIdRef.current) {
            submitAnswerCore(inputValueRef.current.trim());
          }
        }, 3000);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      };
    }
  }, []);

  const toggleRecording = (e) => {
    e.preventDefault();
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      
      // Auto-submit answer when mic is turned off
      if (inputValueRef.current.trim() && !isTypingRef.current && activeSessionIdRef.current) {
        submitAnswerCore(inputValueRef.current.trim());
      }
    } else {
      if (recognitionRef.current) {
        initialValueRef.current = inputValueRef.current;
        recognitionRef.current.start();
        setIsRecording(true);
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    }
  };

  // Auto-resize the input text area based on content height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Load status and session list on component mount
  useEffect(() => {
    checkBackendHealth();
    fetchSessions();
  }, []);

  async function checkBackendHealth() {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        const data = await response.json();
        setApiMode(data.ai_mode);
        setDbConnected(data.database_connected);
        setErrorMsg(null);
      } else {
        setDbConnected(false);
      }
    } catch (err) {
      console.error("Backend health check failed:", err);
      setDbConnected(false);
      setErrorMsg("Backend server is offline. Please make sure FastAPI is running on port 8000.");
    }
  }

  async function fetchSessions() {
    try {
      const response = await fetch(`${API_BASE}/sessions`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        // If there is no active session but sessions exist, select the first one
        if (data.length > 0 && !activeSessionId) {
          selectSession(data[0].id);
        } else if (data.length === 0) {
          setShowStartModal(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  }

  const selectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_BASE}/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
        setMessages(data.history);
        
        // If history is empty, prompt AI to ask the first question
        if (data.history.length === 0) {
          triggerFirstQuestion(sessionId);
        }
      } else {
        setErrorMsg("Failed to retrieve session history.");
      }
    } catch (err) {
      console.error("Error choosing session:", err);
      setErrorMsg("Unable to contact backend server.");
    }
  };

  const triggerFirstQuestion = async (sessionId) => {
    setIsTyping(true);
    try {
      const response = await fetch(`${API_BASE}/ask-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      if (response.ok) {
        // Refresh session history to retrieve the AI's question
        const historyResponse = await fetch(`${API_BASE}/session/${sessionId}`);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setMessages(historyData.history);
          
          // Read the AI question aloud
          const lastMsg = historyData.history[historyData.history.length - 1];
          if (lastMsg && lastMsg.role === 'ai') {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(lastMsg.content));
          }
        }
      } else {
        setErrorMsg("Failed to generate initial interview question.");
      }
    } catch (err) {
      console.error("Error generating question:", err);
      setErrorMsg("Communication error with server.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleStartSession = async ({ role, company, level, interviewType }) => {
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_BASE}/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          company,
          level,
          interview_type: interviewType
        })
      });

      if (response.ok) {
        const newSession = await response.json();
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setActiveSession(newSession);
        setMessages([]); // Start fresh
        setShowStartModal(false);

        // Immediately trigger the first question
        triggerFirstQuestion(newSession.id);
      } else {
        setErrorMsg("Failed to start a new interview session.");
      }
    } catch (err) {
      console.error("Error creating session:", err);
      setErrorMsg("Unable to communicate with the server to start the interview.");
    }
  };

  const submitAnswerCore = async (answerText) => {
    setInputValue('');

    // Pre-insert user's answer in state for optimistic rendering
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      session_id: activeSessionId,
      role: 'user',
      content: answerText,
      created_at: new Date().toISOString(),
      feedback: null
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsTyping(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${API_BASE}/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSessionId,
          answer: answerText
        })
      });

      if (response.ok) {
        // Fetch full session history to get synced backend structures and IDs
        const historyResponse = await fetch(`${API_BASE}/session/${activeSessionId}`);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setMessages(historyData.history);
          
          // Read the AI question aloud
          const lastMsg = historyData.history[historyData.history.length - 1];
          if (lastMsg && lastMsg.role === 'ai') {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(lastMsg.content));
          }
        }
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.detail || "Failed to submit answer. Please try again.");
        // Rollback the optimistic message on failure so state matches database
        selectSession(activeSessionId);
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
      setErrorMsg("Network connection error. Answer not processed.");
      selectSession(activeSessionId);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    
    // Stop recording if active
    if (isRecording) {
        recognitionRef.current?.stop();
        setIsRecording(false);
    }

    if (!inputValueRef.current.trim() || isTyping || !activeSessionId) return;
    submitAnswerCore(inputValueRef.current.trim());
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this interview history?")) return;
    
    try {
      const response = await fetch(`${API_BASE}/session/${sessionId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(updatedSessions);
        
        if (activeSessionId === sessionId) {
          if (updatedSessions.length > 0) {
            selectSession(updatedSessions[0].id);
          } else {
            setActiveSessionId(null);
            setActiveSession(null);
            setMessages([]);
            setShowStartModal(true);
          }
        }
      } else {
        setErrorMsg("Failed to delete session.");
      }
    } catch (err) {
      console.error("Error deleting session:", err);
      setErrorMsg("Failed to contact server to delete session.");
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter without shift key, otherwise do normal line break
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer(e);
    }
  };

  // Get current average score minus penalty
  const getAverageScore = () => {
    const scoredFeedback = messages.filter(m => m.role === 'user' && m.feedback);
    if (scoredFeedback.length === 0) return null;
    const sum = scoredFeedback.reduce((acc, curr) => acc + curr.feedback.score, 0);
    let avg = sum / scoredFeedback.length;
    avg = Math.max(0, avg - penaltyPoints);
    return avg.toFixed(1);
  };

  const averageScore = getAverageScore();

  return (
    <div className="app-container">
      {/* Sidebar Component */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          selectSession(id);
          setIsMobileSidebarOpen(false); // Close sidebar on mobile after selection
        }}
        onDeleteSession={handleDeleteSession}
        onOpenNewSessionModal={() => {
          setShowStartModal(true);
          setIsMobileSidebarOpen(false);
        }}
        apiMode={apiMode}
        dbConnected={dbConnected}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Panel */}
      <main className="chat-area">
        {/* Connection/Server Error bar */}
        {errorMsg && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            borderBottom: '1px solid rgba(244, 63, 94, 0.3)',
            padding: '12px 24px',
            fontSize: '13px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
            <button 
              onClick={() => { checkBackendHealth(); fetchSessions(); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fca5a5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              <RefreshCw size={12} />
              Retry Connection
            </button>
          </div>
        )}

        {activeSession ? (
          <>
            {/* Header */}
            <header className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  className="mobile-menu-btn" 
                  onClick={() => setIsMobileSidebarOpen(true)}
                  style={{ display: 'none' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <div className="chat-header-info">
                  <h1 className="chat-header-title">
                    {activeSession.role} @ {activeSession.company} Mock Interview
                  </h1>
                  <p className="chat-header-subtitle">
                    {activeSession.interview_type} • {activeSession.level} Level
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {averageScore && (
                  <div 
                    className="glass" 
                    style={{ 
                      padding: '6px 12px', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      fontSize: '13px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: 'var(--color-emerald)'
                    }}
                  >
                    <Award size={14} />
                    <span>Avg Rating: <strong>{averageScore}/10</strong></span>
                  </div>
                )}
                {/* Proctoring Component for Active Session */}
                <Proctoring isActive={true} />
              </div>
            </header>

            {/* Chat Messages scroll panel */}
            <ChatFeed
              messages={messages}
              isTyping={isTyping}
              sessionInfo={activeSession}
            />

            {/* Input Box at bottom */}
            <div className="chat-input-container">
              <form onSubmit={handleSubmitAnswer}>
                <div className="chat-input-wrapper glass">
                  <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    placeholder={
                      isTyping 
                        ? "Awaiting interviewer's question..." 
                        : "Type your detailed answer here... (Press Enter to submit, Shift+Enter for new line)"
                    }
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isTyping}
                  />
                  
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className="send-message-btn"
                    style={{ 
                        marginRight: '8px', 
                        background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: isRecording ? '#ef4444' : 'var(--text-secondary)',
                        animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                    }}
                    title={isRecording ? "Stop Recording" : "Start Voice Answer"}
                    disabled={isTyping}
                  >
                    {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>

                  <button
                    type="submit"
                    className="send-message-btn"
                    disabled={isTyping || !inputValue.trim()}
                    title="Submit Answer"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
              <p className="input-helper-text">
                Your answer will be dynamically analyzed for clarity, correctness, and confidence by our FAANG interviewer AI.
              </p>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <button 
              className="mobile-menu-btn empty-state-menu" 
              onClick={() => setIsMobileSidebarOpen(true)}
              style={{ display: 'none', position: 'absolute', top: '16px', left: '16px' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div className="empty-icon-glow">
              <MessageSquare size={40} />
            </div>
            <h3 className="empty-title">Welcome to Premium Interview Coach</h3>
            <p className="empty-desc">
              Prepare for your upcoming FAANG loop with real-time, interactive questions and critiques. 
              Configure a mock role to begin your mock sessions.
            </p>
            <button className="btn-primary" onClick={() => setShowStartModal(true)}>
              Start Mock Interview
            </button>
          </div>
        )}
      </main>

      {/* Start Modal */}
      <StartModal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        onSubmit={handleStartSession}
        canCancel={sessions.length > 0}
        errorMsg={errorMsg}
      />
    </div>
  );
}
