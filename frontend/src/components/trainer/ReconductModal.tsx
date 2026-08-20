import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Calendar, Clock, Users, Copy, RefreshCw, 
  Layers, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Test, Schedule } from '../../types';
import { testService } from '../../services/testService';
import { useToast } from '../../context/ToastContext';

interface ReconductModalProps {
  test: Test | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReconductModal: React.FC<ReconductModalProps> = ({
  test,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();

  const [batches, setBatches] = useState<string[]>([]);
  const [existingSchedules, setExistingSchedules] = useState<Schedule[]>([]);
  const [reconductMode, setReconductMode] = useState<'schedule_existing' | 'clone_and_schedule'>('schedule_existing');
  
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [assignedTo, setAssignedTo] = useState('all');
  const [customBatch, setCustomBatch] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && test) {
      setErrorMsg(null);
      // Default to today and smart times
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);

      const startH = String(now.getHours()).padStart(2, '0');
      const startM = String(Math.ceil(now.getMinutes() / 5) * 5 % 60).padStart(2, '0');
      setStartTime(`${startH}:${startM}`);

      const endH = String((now.getHours() + 2) % 24).padStart(2, '0');
      setEndTime(`${endH}:${startM}`);

      setCustomTitle(`${test.title} (Reconduct)`);

      // Load available batches and test's existing schedules
      Promise.all([
        testService.getBatches(),
        testService.getSchedulesForTest(test.id)
      ]).then(([availableBatches, schedules]) => {
        setBatches(availableBatches.length > 0 ? availableBatches : ['2025', '2026', '2027']);
        setExistingSchedules(schedules);
      }).catch(err => console.error("Error loading reconduct metadata", err));
    }
  }, [isOpen, test]);

  // Quick preset helper
  const handleQuickDuration = (extraMinutes: number) => {
    setErrorMsg(null);
    if (!startTime) return;
    const [h, m] = startTime.split(':').map(Number);
    const startMins = h * 60 + m;
    const endMins = (startMins + extraMinutes) % (24 * 60);
    const endH = String(Math.floor(endMins / 60)).padStart(2, '0');
    const endM = String(endMins % 60).padStart(2, '0');
    setEndTime(`${endH}:${endM}`);
  };

  if (!isOpen || !test) return null;

  const handleReconduct = async () => {
    setErrorMsg(null);
    if (!date || !startTime || !endTime) {
      const msg = 'Please specify session date and testing time window';
      setErrorMsg(msg);
      toast(msg, 'error');
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (endDateTime <= startDateTime) {
      const msg = 'End time must be after start time';
      setErrorMsg(msg);
      toast(msg, 'error');
      return;
    }

    const finalBatch = assignedTo === 'custom' ? customBatch.trim() : assignedTo !== 'all' ? assignedTo : undefined;

    setIsSubmitting(true);
    try {
      await testService.reconductTest({
        testId: test.id,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        assignedStudents: assignedTo === 'all' ? ['all'] : [],
        assignedBatch: finalBatch,
        cloneTest: reconductMode === 'clone_and_schedule',
        newTestTitle: customTitle.trim() || undefined
      });

      toast(
        reconductMode === 'clone_and_schedule' 
          ? `Test duplicated & scheduled for ${finalBatch ? `Batch ${finalBatch}` : 'all students'}!` 
          : `New session scheduled for ${finalBatch ? `Batch ${finalBatch}` : 'all students'}!`,
        'success'
      );
      onSuccess();
      onClose();
    } catch (e: any) {
      const detail = e.response?.data?.detail || 'Failed to reconduct assessment';
      setErrorMsg(detail);
      toast(detail, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
      <div 
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/80 to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shrink-0">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Reconduct Assessment</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Setup a new testing session or duplicate across cohorts
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Assessment Summary Badge */}
          <div className="p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <p className="font-semibold text-slate-900 truncate">{test.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {test.questionIds.length} questions · {test.settings.duration} mins · {test.totalMarks} total marks
              </p>
            </div>
            <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md text-[10px] border border-blue-200">
              {test.status}
            </span>
          </div>

          {/* Strategy Picker */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Reconduct Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: New Schedule */}
              <div 
                onClick={() => setReconductMode('schedule_existing')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  reconductMode === 'schedule_existing'
                    ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${reconductMode === 'schedule_existing' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900">New Session</p>
                      {reconductMode === 'schedule_existing' && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Schedule a new window for another batch or retakes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 2: Clone & Schedule */}
              <div 
                onClick={() => setReconductMode('clone_and_schedule')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  reconductMode === 'clone_and_schedule'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${reconductMode === 'clone_and_schedule' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Copy className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900">Clone & Schedule</p>
                      {reconductMode === 'clone_and_schedule' && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Create an independent test copy with separate analytics.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cloned Test Title (if clone mode) */}
          {reconductMode === 'clone_and_schedule' && (
            <div className="space-y-1.5 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl">
              <label className="block text-xs font-semibold text-slate-800">New Duplicated Assessment Title</label>
              <Input
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="e.g. Midterm Exam - Batch 2026"
              />
            </div>
          )}

          {/* Target Audience / Batch */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              Target Audience / Batch
            </label>
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            >
              <option value="all">Campus-Wide (All Enrolled Students)</option>
              {batches.map(b => (
                <option key={b} value={b}>Batch {b}</option>
              ))}
              <option value="custom">Other / Custom Batch Name</option>
            </select>

            {assignedTo === 'custom' && (
              <div className="pt-2">
                <Input
                  placeholder="Enter Batch identifier e.g. CSE-2027 or Retake-Group"
                  value={customBatch}
                  onChange={e => setCustomBatch(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Date & Time Window */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                Testing Window
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleQuickDuration(30)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded text-slate-600 transition-colors"
                >
                  +30m
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration(60)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded text-slate-600 transition-colors"
                >
                  +1h
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration(120)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded text-slate-600 transition-colors"
                >
                  +2h
                </button>
              </div>
            </div>
            
            <Input 
              type="date"
              label="Session Date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input 
                type="time"
                label="Start Time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
              <Input 
                type="time"
                label="End Time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Previous Sessions (if any) */}
          {existingSchedules.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Previous Sessions ({existingSchedules.length})
              </p>
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {existingSchedules.map((s, idx) => (
                  <div key={s.id || idx} className="text-xs p-2 bg-slate-50 rounded-lg flex items-center justify-between text-slate-600 border border-slate-100">
                    <span className="font-semibold text-slate-800">
                      {s.assignedBatch ? `Batch ${s.assignedBatch}` : 'All Students'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(s.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Inline Error Alert */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 animate-fade-in">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="font-medium flex-1">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} size="sm">
            Cancel
          </Button>
          <Button 
            onClick={handleReconduct} 
            isLoading={isSubmitting}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 font-semibold px-5 shadow-sm"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {reconductMode === 'clone_and_schedule' ? 'Clone & Schedule' : 'Schedule Session'}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
