import React from 'react';
import { Plus, Trash2, Sparkles, AlertTriangle, Cpu } from 'lucide-react';

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onOpenNewSessionModal,
  apiMode,
  dbConnected
}) {
  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr + "Z"); // Treat as UTC
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Sparkles size={22} fill="url(#purple-blue-grad)" style={{ stroke: 'url(#purple-blue-grad)' }} />
          <span>INTERVIEW COACH</span>
          {/* SVG gradient definition for the icon */}
          <svg width="0" height="0" style={{ position: 'absolute' }}>
            <defs>
              <linearGradient id="purple-blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        <button className="new-chat-btn" onClick={onOpenNewSessionModal}>
          <Plus size={16} />
          New Interview
        </button>
      </div>

      <div className="sessions-list">
        {sessions.length === 0 ? (
          <div style={{ 
            color: 'var(--text-muted)', 
            fontSize: '13px', 
            textAlign: 'center', 
            marginTop: '20px',
            padding: '10px'
          }}>
            No interviews yet. Click "New Interview" above to start.
          </div>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="session-info">
                <span className="session-title">{session.role} @ {session.company}</span>
                <span className="session-meta">
                  {session.interview_type} • {session.level}
                </span>
              </div>
              <button
                className="delete-session-btn"
                onClick={(e) => {
                  e.stopPropagation(); // prevent selecting the session when deleting it
                  onDeleteSession(session.id);
                }}
                title="Delete Session"
              >
                <Trash2 size={14} />
              </button>
            </button>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <div className="status-badge">
          <div className={`status-indicator ${dbConnected ? 'live' : 'mock'}`}></div>
          <span style={{ fontSize: '11px' }}>
            {dbConnected ? 'Database Connected' : 'Database Offline'}
          </span>
        </div>

        <div className="status-badge" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={12} className={apiMode !== 'mock' ? 'title-strengths' : 'title-improvement'} />
            <span style={{ fontWeight: 600 }}>AI Engine Mode</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {apiMode === 'openrouter' && (
              <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>OpenRouter Live AI</span>
            )}
            {apiMode === 'gemini' && (
              <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>Gemini Live AI</span>
            )}
            {apiMode === 'openai' && (
              <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>OpenAI Live AI</span>
            )}
            {apiMode === 'mock' && (
              <span style={{ color: 'var(--color-amber)', fontWeight: 600 }}>Structured Mock Mode</span>
            )}
          </div>
          {apiMode === 'mock' && (
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', lineHeight: '1.2', marginTop: '2px' }}>
              Add GEMINI_API_KEY or OPENROUTER_API_KEY to .env for live AI
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
