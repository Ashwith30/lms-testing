import React from 'react';
import { ShieldAlert, Maximize2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface FullscreenWarningModalProps {
  isOpen: boolean;
  violations: number;
  maxViolations: number;
  onReEnterFullscreen: () => void;
}

export const FullscreenWarningModal: React.FC<FullscreenWarningModalProps> = ({
  isOpen,
  violations,
  maxViolations,
  onReEnterFullscreen
}) => {
  if (!isOpen) return null;

  const isLastWarning = violations >= maxViolations - 1;
  const isExceeded = violations >= maxViolations;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border-2 border-red-500/80 rounded-2xl max-w-lg w-full p-8 text-center shadow-2xl text-white animate-in zoom-in-95">
        <div className="h-16 w-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 ring-8 ring-red-500/10">
          <ShieldAlert className="h-9 w-9 animate-bounce" />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white mb-2">
          {isExceeded ? 'Test Locked & Auto-Submitting' : 'Fullscreen Mode Exited!'}
        </h2>

        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
          {isExceeded ? (
            'You have exceeded the maximum allowed proctoring violations. Your test is being automatically locked and submitted.'
          ) : (
            'Exiting fullscreen mode or switching focus during an active test is a strict integrity violation. This incident has been recorded with a camera snapshot.'
          )}
        </p>

        {/* Violations Counter Pill */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-left">
            <AlertTriangle className={`h-5 w-5 ${isLastWarning ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Violations Recorded</p>
              <p className="text-sm font-semibold text-white">
                {violations} of {maxViolations} Allowed
              </p>
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
            isExceeded ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
            isLastWarning ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
            'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            {isExceeded ? 'Disqualified' : isLastWarning ? 'Final Warning' : 'Warning'}
          </span>
        </div>

        {!isExceeded && (
          <Button
            size="lg"
            variant="danger"
            onClick={onReEnterFullscreen}
            className="w-full py-3.5 text-base font-bold bg-red-600 hover:bg-red-500 flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
          >
            <Maximize2 className="h-5 w-5" />
            Re-Enter Fullscreen Immediately
          </Button>
        )}
      </div>
    </div>
  );
};
