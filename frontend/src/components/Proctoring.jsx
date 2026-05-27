import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, AlertTriangle } from 'lucide-react';

export default function Proctoring({ isActive }) {
  const videoRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [warning, setWarning] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models", err);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    let stream = null;

    const startVideo = async () => {
      if (!isActive) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (err) {
        console.error("Error accessing webcam", err);
        setWarning("Webcam access denied. Please allow camera to proceed.");
      }
    };

    if (isActive && modelsLoaded) {
      startVideo();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsCameraActive(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, modelsLoaded]);

  const handleVideoPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(async () => {
      if (videoRef.current && isActive && isCameraActive) {
        try {
          const detections = await faceapi.detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 })
          ).withFaceExpressions();

          if (detections.length === 0) {
            setWarning("Face not detected. Please look at the screen.");
          } else if (detections.length > 1) {
            setWarning("Multiple faces detected! No cheating allowed.");
          } else {
            // One face detected
            // Example: if they are extremely angry or sad, we could show a warning.
            // Let's just clear it if everything is fine.
            setWarning(null);
          }
        } catch (err) {
          console.error("Face detection error:", err);
        }
      }
    }, 1500); // Check every 1.5 seconds
  };

  if (!isActive) return null;

  return (
    <div className="proctoring-container">
      {warning && (
        <div className="proctoring-warning">
          <AlertTriangle size={14} />
          <span>{warning}</span>
        </div>
      )}
      <div className="proctoring-video-wrapper">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          onPlay={handleVideoPlay}
          className="proctoring-video"
        />
        {!isCameraActive && (
          <div className="proctoring-placeholder">
            <Camera size={20} />
          </div>
        )}
        <div className={`proctoring-status-indicator ${isCameraActive && !warning ? 'active' : 'error'}`}></div>
      </div>

      <style>{`
        .proctoring-container {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .proctoring-warning {
          background: rgba(244, 63, 94, 0.2);
          border: 1px solid rgba(244, 63, 94, 0.4);
          color: #fb7185;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          animation: pulse-warning 1s infinite alternate;
        }

        @keyframes pulse-warning {
          from { opacity: 0.8; transform: scale(1); }
          to { opacity: 1; transform: scale(1.02); }
        }

        .proctoring-video-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          overflow: hidden;
          background: #1e1e2d;
          border: 2px solid var(--border-color);
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .proctoring-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1); /* Mirror camera */
        }

        .proctoring-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
        }

        .proctoring-status-indicator {
          position: absolute;
          bottom: 6px;
          right: 6px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f43f5e;
          box-shadow: 0 0 6px #f43f5e;
        }

        .proctoring-status-indicator.active {
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
        }
      `}</style>
    </div>
  );
}
