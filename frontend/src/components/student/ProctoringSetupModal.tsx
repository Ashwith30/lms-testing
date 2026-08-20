import React, { useState, useEffect, useRef } from 'react';
import { Camera, ShieldCheck, CheckCircle2, AlertTriangle, Monitor, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { loadCocoModel, detectObjectsInFrame } from '../../services/proctoringService';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

interface ProctoringSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmStart: () => void;
  testTitle: string;
  durationMinutes: number;
}

export const ProctoringSetupModal: React.FC<ProctoringSetupModalProps> = ({
  isOpen,
  onClose,
  onConfirmStart,
  testTitle,
  durationMinutes
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [faceDetected, setFaceDetected] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const { isTouchDevice } = useDeviceDetection();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const checkIntervalRef = useRef<any>(null);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
      streamRef.current = null;
    }
    setStream(null);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      return;
    }

    let isMounted = true;

    const setupCameraAndAI = async () => {
      setIsInitializing(true);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });

        if (!isMounted || !isOpen) {
          mediaStream.getTracks().forEach(track => {
            try { track.stop(); } catch {}
          });
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setCameraPermission('granted');

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }

        const model = await loadCocoModel();

        if (!isMounted) return;

        // Run continuous check on preview
        checkIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            const res = await detectObjectsInFrame(videoRef.current, model);
            if (isMounted) {
              setFaceDetected(res.personCount === 1);
            }
          }
        }, 600);

      } catch (err) {
        console.error('Camera access error:', err);
        if (isMounted) setCameraPermission('denied');
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    setupCameraAndAI();

    return () => {
      isMounted = false;
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch {}
        });
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  const handleClose = () => {
    stopCameraStream();
    onClose();
  };

  if (!isOpen) return null;

  const handleStartExam = async () => {
    // Request fullscreen immediately to satisfy user gesture
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
    
    // Stop setup stream so TestAttempt can take over
    stopCameraStream();
    onConfirmStart();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Security Verification</span>
            <h2 className="text-xl font-bold">{testTitle}</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Step 1: Camera & AI Verification */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Camera className="h-4 w-4 text-blue-600" />
              1. Camera & AI Face Verification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden border border-slate-200">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                {cameraPermission === 'denied' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-rose-400 text-xs">
                    <AlertTriangle className="h-6 w-6 mb-1" />
                    Camera access denied. Please allow camera access in your browser settings to proceed.
                  </div>
                )}
                {isInitializing && cameraPermission !== 'denied' && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-xs bg-slate-900/80">
                    Initializing camera & AI...
                  </div>
                )}
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  {cameraPermission === 'granted' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span>Camera permission granted</span>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  {faceDetected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
                  )}
                  <span>{faceDetected ? 'Face recognized & centered' : 'Position your face in center'}</span>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Ensure good lighting and that no other people or mobile devices are in view.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Malpractice Rules */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              2. Proctoring & Exam Integrity Rules
            </h3>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-700 space-y-2">
              {!isTouchDevice && (
                <div className="flex items-start gap-2">
                  <Monitor className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Fullscreen Mode:</strong> The test will launch in full screen. Exiting full screen records an instant violation.</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span><strong>Tab Switching:</strong> Navigating away from this exam tab will log a malpractice warning.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span><strong>Camera Monitoring:</strong> Stepping away or multiple faces detected will flag security alerts.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span><strong>Auto-Submission:</strong> Reaching {isTouchDevice ? '5' : '3'} violations will immediately lock and submit your exam.</span>
              </div>
            </div>
          </div>

          {/* Step 3: Agreement */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-xs font-medium text-slate-800 leading-relaxed">
              I confirm that my camera is working, my face is clearly visible, and I agree to adhere to all exam integrity rules.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleStartExam}
            disabled={cameraPermission !== 'granted' || !agreed}
            className="bg-blue-600 hover:bg-blue-700 px-6 font-bold w-full sm:w-auto"
          >
            Launch {isTouchDevice ? 'Exam' : 'Secure Exam'} ({durationMinutes}m)
          </Button>
        </div>
      </div>
    </div>
  );
};
