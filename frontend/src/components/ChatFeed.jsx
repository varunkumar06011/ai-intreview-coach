import React, { useEffect, useRef } from 'react';
import { Bot, User, Sparkles, Terminal, Volume2 } from 'lucide-react';
import FeedbackCard from './FeedbackCard';

export default function ChatFeed({ messages, isTyping, sessionInfo }) {
  const bottomRef = useRef(null);

  // Auto scroll to bottom when messages or typing status updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon-glow">
          <Bot size={40} />
        </div>
        <h3 className="empty-title">Ready to Begin</h3>
        <p className="empty-desc">
          You are about to start a FAANG-style interview simulation for the{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{sessionInfo.role}</strong> position at{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{sessionInfo.company}</strong> ({sessionInfo.level} level).
        </p>
        <div 
          className="glass-interactive glass"
          style={{ 
            padding: '16px', 
            borderRadius: '12px', 
            fontSize: '13px', 
            color: 'var(--text-secondary)',
            textAlign: 'left',
            width: '100%',
            maxWidth: '400px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
            <Terminal size={14} className="title-improvement" />
            <span>Interview Ground Rules:</span>
          </div>
          <ul style={{ listStyleType: 'disc', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>No voice, video, or camera. Text-only format.</li>
            <li>Answer the interviewer's questions directly in the chat.</li>
            <li>Receive instant grading and corrective feedback after every reply.</li>
            <li>The interview will adapt and progress dynamically.</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.map((msg, index) => {
        const isAi = msg.role === 'ai';
        return (
          <div key={msg.id || index} className={`message-row ${isAi ? 'ai' : 'user'}`}>
            <div className="message-container">
              {isAi && (
                <div className="message-avatar">
                  <Bot size={15} />
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div className="message-bubble">
                  {msg.content}
                  <div className="message-meta-time" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span>{isAi ? 'Interviewer' : 'Candidate'}</span>
                    {isAi && (
                      <button 
                        onClick={() => {
                          window.speechSynthesis.cancel();
                          window.speechSynthesis.speak(new SpeechSynthesisUtterance(msg.content));
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: 'inherit', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px'
                        }}
                        title="Listen to question"
                      >
                        <Volume2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Render feedback card directly below the user's answer */}
                {!isAi && msg.feedback && (
                  <FeedbackCard feedback={msg.feedback} />
                )}
              </div>

              {!isAi && (
                <div className="message-avatar" style={{ marginLeft: '12px', marginRight: 0, backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                  <User size={15} />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="message-row ai">
          <div className="message-container">
            <div className="message-avatar">
              <Bot size={15} />
            </div>
            <div className="message-bubble" style={{ padding: '12px 16px' }}>
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
