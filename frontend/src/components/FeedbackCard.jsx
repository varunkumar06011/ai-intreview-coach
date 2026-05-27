import React, { useEffect } from 'react';
import { CheckCircle2, AlertOctagon, Lightbulb, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function FeedbackCard({ feedback }) {
  if (!feedback) return null;

  const { score, strengths, weaknesses, improvement } = feedback;

  // Celebrate with confetti if the candidate receives a great score!
  useEffect(() => {
    if (score >= 8) {
      const duration = 2 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 25, spread: 360, ticks: 50, zIndex: 1000 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 20 * (timeLeft / duration);
        // Confetti from left and right sides
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [score]);

  // Determine score class based on value
  const getScoreClass = (val) => {
    if (val >= 8) return 'score-high';
    if (val >= 5) return 'score-mid';
    return 'score-low';
  };

  return (
    <div className="feedback-container glass" style={{ animation: 'modalScaleUp 0.4s ease' }}>
      <div className="feedback-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={16} className="title-improvement" />
          <span className="feedback-title">Interviewer Assessment</span>
        </div>
        <div className="feedback-score-section">
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Response Rating</span>
          <div className={`score-badge-circle ${getScoreClass(score)}`}>
            {score}
          </div>
        </div>
      </div>

      <div className="feedback-grid">
        <div className="feedback-section">
          <div className="feedback-section-title title-strengths">
            <CheckCircle2 size={14} />
            <span>Key Strengths</span>
          </div>
          <div className="feedback-text">
            {strengths}
          </div>
        </div>

        <div className="feedback-section">
          <div className="feedback-section-title title-weaknesses">
            <AlertOctagon size={14} />
            <span>Constructive Critiques</span>
          </div>
          <div className="feedback-text">
            {weaknesses}
          </div>
        </div>

        <div className="feedback-section feedback-grid-full">
          <div className="feedback-section-title title-improvement">
            <Lightbulb size={14} />
            <span>Actionable Steps to Improve</span>
          </div>
          <div className="feedback-text">
            {improvement}
          </div>
        </div>
      </div>
    </div>
  );
}
