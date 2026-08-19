import React, { useEffect, useRef } from 'react';
import { Camera, Shield, Smartphone, Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2, Scan } from 'lucide-react';
import { SyncStatus } from '../../services/syncService';
import { DetectedObject } from '@tensorflow-models/coco-ssd';

interface ProctoringOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  cameraActive: boolean;
  personCount: number;
  phoneDetected: boolean;
  predictions?: DetectedObject[];
  syncStatus: SyncStatus;
  violations: number;
  maxViolations: number;
  isAiReady: boolean;
  lastAnalysisTime?: number;
}

export const ProctoringOverlay: React.FC<ProctoringOverlayProps> = ({
  videoRef,
  stream,
  cameraActive,
  personCount,
  phoneDetected,
  predictions = [],
  syncStatus,
  violations,
  maxViolations,
  isAiReady,
  lastAnalysisTime
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Ensure stream is always connected to video element whenever DOM mounts or stream updates
  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.warn('Overlay video play note:', e));
    }
  }, [videoRef, stream]);

  // Draw real-time bounding boxes on overlay canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw detected object bounding boxes
    predictions.forEach(p => {
      const [x, y, width, height] = p.bbox;
      const isPhone = p.class === 'cell phone' || p.class === 'remote';
      const isPerson = p.class === 'person';

      if (isPhone) {
        ctx.strokeStyle = '#ef4444'; // Red for phone
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      } else if (isPerson) {
        ctx.strokeStyle = '#10b981'; // Emerald for person/face
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      } else {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      }

      // Draw box
      ctx.strokeRect(x, y, width, height);
      ctx.fillRect(x, y, width, height);

      // Label background & text
      ctx.fillStyle = isPhone ? '#ef4444' : isPerson ? '#10b981' : '#3b82f6';
      const label = `${p.class.toUpperCase()} ${Math.round(p.score * 100)}%`;
      ctx.font = 'bold 12px sans-serif';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(x, Math.max(0, y - 18), textWidth + 8, 18);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 4, Math.max(13, y - 4));
    });
  }, [predictions, videoRef]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-xl text-white space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">AI Proctoring Feed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Scan className={`h-3 w-3 ${isAiReady ? 'text-emerald-400 animate-spin' : 'text-slate-500'}`} style={{ animationDuration: '3s' }} />
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {isAiReady ? 'AI Active' : 'Loading Model...'}
          </span>
        </div>
      </div>

      {/* Video Feed with Live Detection Canvas */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${!cameraActive ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* AI Real-time Bounding Boxes Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
        />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs bg-slate-950">
            <Camera className="h-6 w-6 mb-1 text-slate-600 animate-pulse" />
            Connecting camera stream...
          </div>
        )}

        {/* Live Detection Status Overlays */}
        {cameraActive && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
            {personCount === 0 && (
              <span className="inline-flex items-center gap-1 bg-red-600/95 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg animate-pulse border border-red-400">
                <AlertCircle className="h-3 w-3" /> No Face Visible
              </span>
            )}
            {personCount > 1 && (
              <span className="inline-flex items-center gap-1 bg-purple-600/95 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg animate-pulse border border-purple-400">
                <AlertCircle className="h-3 w-3" /> Multiple People ({personCount})
              </span>
            )}
            {phoneDetected && (
              <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg animate-bounce border border-rose-400">
                <Smartphone className="h-3 w-3" /> Phone Detected!
              </span>
            )}
          </div>
        )}

        {/* Live Watermark & Heartbeat */}
        <div className="absolute bottom-1.5 right-2 text-[9px] text-white/70 font-mono bg-black/50 px-1.5 py-0.5 rounded flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>LIVE • {lastAnalysisTime ? `${new Date(lastAnalysisTime).toLocaleTimeString()}` : 'SCANNING'}</span>
        </div>
      </div>

      {/* Status Badges */}
      <div className="space-y-1.5 text-xs">
        {/* Face Status */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-300">Face Tracking:</span>
          </div>
          {personCount === 1 ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> 1 Candidate Verified
            </span>
          ) : personCount === 0 ? (
            <span className="text-rose-400 font-bold animate-pulse flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Missing / Unseen
            </span>
          ) : personCount > 1 ? (
            <span className="text-purple-400 font-bold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Multiple ({personCount})
            </span>
          ) : (
            <span className="text-slate-400 font-medium">Calibrating...</span>
          )}
        </div>

        {/* Mobile Phone Status */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Smartphone className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-300">Phone Detection:</span>
          </div>
          {phoneDetected ? (
            <span className="text-rose-400 font-bold animate-pulse flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Detected in Frame!
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Clear (No Device)
            </span>
          )}
        </div>

        {/* DB Sync Status */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2">
            {syncStatus === 'synced' && <Cloud className="h-3.5 w-3.5 text-emerald-400" />}
            {syncStatus === 'syncing' && <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />}
            {syncStatus === 'offline' && <CloudOff className="h-3.5 w-3.5 text-amber-400" />}
            <span className="text-slate-300">Database Sync:</span>
          </div>
          {syncStatus === 'synced' && <span className="text-emerald-400 font-medium">Saved to DB</span>}
          {syncStatus === 'syncing' && <span className="text-blue-400 font-medium">Syncing...</span>}
          {syncStatus === 'offline' && <span className="text-amber-400 font-medium">Offline (Saved Locally)</span>}
        </div>
      </div>

      {/* Violations Counter */}
      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
        violations >= maxViolations - 1 
          ? 'bg-rose-950/40 border-rose-800/50 text-rose-300' 
          : violations > 0 
          ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' 
          : 'bg-slate-950/40 border-slate-800 text-slate-400'
      }`}>
        <span className="font-medium text-xs">Violations Logged:</span>
        <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
          violations > 0 ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'
        }`}>
          {violations} / {maxViolations}
        </span>
      </div>
    </div>
  );
};
