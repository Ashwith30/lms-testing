import React, { useState } from 'react';
import { Shield, AlertTriangle, Smartphone, EyeOff, Users, Monitor, Terminal, X, ExternalLink, CheckCircle } from 'lucide-react';
import { ViolationLog, ProctoringSummary, User, Test } from '../../types';
import { Button } from '../ui/Button';

interface ProctoringAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: User;
  test: Test;
  violations: number;
  violationLogs?: ViolationLog[];
  proctoringSummary?: ProctoringSummary;
  score?: number;
  percentage?: number;
}

export const ProctoringAuditModal: React.FC<ProctoringAuditModalProps> = ({
  isOpen,
  onClose,
  student,
  test,
  violations,
  violationLogs = [],
  proctoringSummary,
  score,
  percentage
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  if (!isOpen) return null;

  const trustScore = proctoringSummary?.trustScore ?? Math.max(0, 100 - violations * 20);

  const getScoreColor = (scoreVal: number) => {
    if (scoreVal >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (scoreVal >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getViolationIcon = (type: string) => {
    switch (type) {
      case 'PHONE_DETECTED':
        return <Smartphone className="h-4 w-4 text-rose-500" />;
      case 'FACE_MISSING':
        return <EyeOff className="h-4 w-4 text-amber-500" />;
      case 'MULTIPLE_FACES':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'FULLSCREEN_EXIT':
      case 'TAB_SWITCH':
      case 'WINDOW_BLUR':
      case 'APP_SWITCH_GESTURE':
        return <Monitor className="h-4 w-4 text-blue-500" />;
      case 'DEVTOOLS_OPEN':
        return <Terminal className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-blue-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{student.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {student.studentId || 'N/A'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{test.title} • Proctoring Audit Report</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Trust Score & High-Level KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreColor(trustScore)}`}>
              <p className="text-xs font-bold uppercase tracking-wider">Integrity Trust Score</p>
              <p className="text-3xl font-black mt-1">{trustScore}%</p>
              <p className="text-[11px] mt-1 font-medium">
                {trustScore >= 80 ? 'High Confidence' : trustScore >= 60 ? 'Suspicious Activity' : 'High Malpractice Risk'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Violations</p>
              <p className={`text-3xl font-black mt-1 ${violations > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {violations}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Recorded Events</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Assessment Score</p>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {score ?? 'N/A'} <span className="text-sm font-normal text-slate-500">/ {test.totalMarks}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">{percentage?.toFixed(1)}% Marks</p>
            </div>
          </div>

          {/* Breakdown Pills */}
          {proctoringSummary && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Violation Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">Tab Switches:</span>
                  <span className="font-bold text-slate-900 ml-1">{proctoringSummary.tabSwitches}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">App/Blur Swipes:</span>
                  <span className="font-bold text-slate-900 ml-1">{proctoringSummary.windowBlurs + proctoringSummary.appSwitchGestures}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">Fullscreen Exits:</span>
                  <span className="font-bold text-slate-900 ml-1">{proctoringSummary.fullscreenExits}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">Phone Detected:</span>
                  <span className={`font-bold ml-1 ${proctoringSummary.phoneDetectedIncidents > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {proctoringSummary.phoneDetectedIncidents}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Incident Timeline with Snapshots */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Proctoring Incident Timeline ({violationLogs.length})
            </h3>

            {violationLogs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No integrity violations logged for this attempt. Clean session.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {violationLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/80 transition-colors">
                    <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                      {getViolationIcon(log.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          {log.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{log.reason}</p>
                    </div>

                    {log.snapshotUrl && (
                      <button
                        onClick={() => setSelectedSnapshot(log.snapshotUrl!)}
                        className="shrink-0 relative group rounded-lg overflow-hidden border border-slate-300 hover:border-blue-500 transition-all"
                        title="Click to view camera snapshot"
                      >
                        <img
                          src={log.snapshotUrl}
                          alt="Violation Proof"
                          className="h-12 w-16 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0 rounded-b-2xl">
          <Button variant="outline" onClick={onClose}>
            Close Report
          </Button>
        </div>
      </div>

      {/* Snapshot Enlarger Modal */}
      {selectedSnapshot && (
        <div 
          className="fixed inset-0 z-[10000] bg-slate-950/90 flex items-center justify-center p-4"
          onClick={() => setSelectedSnapshot(null)}
        >
          <div className="relative max-w-xl w-full bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl border border-slate-700 animate-in zoom-in-95">
            <button
              onClick={() => setSelectedSnapshot(null)}
              className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700 text-white p-1.5 rounded-full z-10"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={selectedSnapshot}
              alt="Expanded Evidence Proof"
              className="w-full h-auto rounded-xl object-contain max-h-[75vh]"
            />
            <p className="text-center text-xs text-slate-400 py-2">
              Camera snapshot captured at the moment of violation
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
