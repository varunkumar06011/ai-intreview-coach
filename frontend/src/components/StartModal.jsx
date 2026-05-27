import React, { useState } from 'react';
import { X, Play, Briefcase, Building, ShieldAlert, Layers } from 'lucide-react';

export default function StartModal({ isOpen, onClose, onSubmit, canCancel }) {
  const [role, setRole] = useState('Software Engineer');
  const [company, setCompany] = useState('Google');
  const [level, setLevel] = useState('Senior');
  const [interviewType, setInterviewType] = useState('Technical/Coding');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!role || !company) return;
    onSubmit({ role, company, level, interviewType });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass">
        <div className="modal-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="modal-title">Configure Mock Interview</h2>
            {canCancel && (
              <button 
                onClick={onClose}
                className="delete-session-btn"
                style={{ opacity: 1, padding: 8 }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Briefcase size={14} className="title-improvement" />
                Target Job Role
              </label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Frontend Engineer, Product Manager"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building size={14} className="title-improvement" />
                Target Company
              </label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Meta, Amazon, Netflix"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={14} className="title-strengths" />
                Seniority Level
              </label>
              <select 
                className="form-select"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="Junior">Junior (0-2 YOE)</option>
                <option value="Mid-Level">Mid-Level (2-5 YOE)</option>
                <option value="Senior">Senior (5-8 YOE)</option>
                <option value="Staff / Principal">Staff / Principal (8+ YOE)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={14} className="title-weaknesses" />
                Interview Type
              </label>
              <select 
                className="form-select"
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
              >
                <option value="Technical/Coding">Technical/Coding</option>
                <option value="System Design">System Design</option>
                <option value="Behavioral">Behavioral</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            {canCancel && (
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Play size={14} fill="white" />
              Start Interview
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
