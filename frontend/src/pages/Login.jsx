import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ChevronRight, User, Lock } from 'lucide-react';
import '../index.css';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      // Mock login - save to localStorage
      localStorage.setItem('auth_token', 'mock_secure_token_123');
      localStorage.setItem('auth_user', username);
      navigate('/');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box glass">
        <div className="login-header">
          <div className="login-icon-glow">
            <ShieldCheck size={48} className="text-emerald" />
          </div>
          <h2>AI Interview Platform</h2>
          <p>Secure login to access your mock sessions.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <div className="input-icon">
              <User size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <div className="input-icon">
              <Lock size={18} />
            </div>
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary login-btn">
            Authenticate <ChevronRight size={16} />
          </button>
        </form>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 50% -20%, #1e1e38 0%, #0f0f1a 100%);
          padding: 20px;
        }

        .login-box {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          position: relative;
          overflow: hidden;
        }

        .login-box::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.5), transparent);
        }

        .login-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .login-icon-glow {
          background: rgba(16, 185, 129, 0.1);
          padding: 20px;
          border-radius: 50%;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.2);
          margin-bottom: 8px;
        }

        .text-emerald {
          color: #10b981;
        }

        .login-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .login-header p {
          color: var(--text-secondary);
          font-size: 14px;
          margin: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .input-group input {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 14px 16px 14px 44px;
          color: var(--text-primary);
          font-size: 15px;
          transition: all 0.2s ease;
        }

        .input-group input:focus {
          outline: none;
          border-color: #10b981;
          background: rgba(0, 0, 0, 0.3);
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
        }

        .input-group input::placeholder {
          color: var(--text-tertiary);
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          font-size: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
        }

        .login-btn:hover {
          background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
          transform: translateY(-2px);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
