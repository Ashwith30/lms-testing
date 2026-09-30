import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Clock, Users, Calendar, AlertCircle, CheckCircle2, 
  RotateCcw, Sparkles, Search, UserX, ShieldAlert, ArrowRight, Layers 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Test, Schedule, ScheduleAttendance, ScheduleAttendanceStudent } from '../../types';
import { testService } from '../../services/testService';
import { useToast } from '../../context/ToastContext';

interface ExtendTimeModalProps {
  schedule: Schedule | null;
  test: Test | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExtendTimeModal: React.FC<ExtendTimeModalProps> = ({
  schedule,
  test,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();

  const [attendance, setAttendance] = useState<ScheduleAttendance | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  
  // Extension target mode
  const [targetMode, setTargetMode] = useState<'missed_only' | 'all' | 'selected_students'>('missed_only');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'missed' | 'completed' | 'in_progress'>('all');

  // Time settings
  const [date, setDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(60); // default +60m

  // Additional options
  const [createMakeupSession, setCreateMakeupSession] = useState(false);
  const [resetIncompleteAttempts, setResetIncompleteAttempts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize modal state when opened
  useEffect(() => {
    if (isOpen && schedule) {
      setErrorMsg(null);
      setIsLoadingAttendance(true);

      // Default extension: 1 hour from now or from current endTime (whichever is later)
      const now = new Date();
      const currEnd = new Date(schedule.endTime);
      const baseTime = now > currEnd ? now : currEnd;
      const targetTime = new Date(baseTime.getTime() + 60 * 60 * 1000);

      const yyyy = targetTime.getFullYear();
      const mm = String(targetTime.getMonth() + 1).padStart(2, '0');
      const dd = String(targetTime.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);

      const endH = String(targetTime.getHours()).padStart(2, '0');
      const endM = String(targetTime.getMinutes()).padStart(2, '0');
      setEndTime(`${endH}:${endM}`);
      setActivePreset(60);

      // Load live attendance
      testService.getScheduleAttendance(schedule.id)
        .then((data) => {
          setAttendance(data);
          // Pre-select missed student IDs
          const missedIds = data.students
            .filter(s => s.status === 'missed' || s.status === 'in_progress')
            .map(s => s.id);
          setSelectedStudentIds(missedIds);
        })
        .catch((err) => {
          console.error("Failed to load attendance", err);
          setAttendance(null);
        })
        .finally(() => {
          setIsLoadingAttendance(false);
        });
    }
  }, [isOpen, schedule]);

  // Handle quick preset buttons (+15m, +30m, +1h, +2h, +24h, +48h)
  const handleQuickExtension = (minutes: number) => {
    setActivePreset(minutes);
    setErrorMsg(null);
    if (!schedule) return;

    const now = new Date();
    const currEnd = new Date(schedule.endTime);
    const baseTime = now > currEnd ? now : currEnd;
    const targetTime = new Date(baseTime.getTime() + minutes * 60 * 1000);

    const yyyy = targetTime.getFullYear();
    const mm = String(targetTime.getMonth() + 1).padStart(2, '0');
    const dd = String(targetTime.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);

    const endH = String(targetTime.getHours()).padStart(2, '0');
    const endM = String(targetTime.getMinutes()).padStart(2, '0');
    setEndTime(`${endH}:${endM}`);
  };

  const toggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  const selectAllMissed = () => {
    if (!attendance) return;
    const missedIds = attendance.students
      .filter(s => s.status === 'missed' || s.status === 'in_progress')
      .map(s => s.id);
    setSelectedStudentIds(missedIds);
  };

  const selectAllEligible = () => {
    if (!attendance) return;
    setSelectedStudentIds(attendance.students.map(s => s.id));
  };

  const deselectAll = () => {
    setSelectedStudentIds([]);
  };

  if (!isOpen || !schedule) return null;

  const handleApplyExtension = async () => {
    setErrorMsg(null);
    if (!date || !endTime) {
      const msg = 'Please specify a new end date and time.';
      setErrorMsg(msg);
      toast(msg, 'error');
      return;
    }

    const endDateTime = new Date(`${date}T${endTime}`);
    if (isNaN(endDateTime.getTime())) {
      const msg = 'Invalid date/time format.';
      setErrorMsg(msg);
      toast(msg, 'error');
      return;
    }

    if (endDateTime <= new Date()) {
      const msg = 'The new end time must be in the future.';
      setErrorMsg(msg);
      toast(msg, 'error');
      return;
    }

    if (targetMode === 'selected_students' && selectedStudentIds.length === 0) {
      const msg = 'Please select at least one student for time extension.';
      setErrorMsg(msg);
      toast(msg, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await testService.extendSchedule(schedule.id, {
        newEndTime: endDateTime.toISOString(),
        mode: targetMode,
        selectedStudentIds: targetMode === 'selected_students' ? selectedStudentIds : (targetMode === 'missed_only' ? selectedStudentIds : undefined),
        createMakeupSession,
        resetIncompleteAttempts
      });

      toast(res.message || 'Assessment time extended successfully!', 'success');
      onSuccess();
      onClose();
    } catch (e: any) {
      const detail = e.response?.data?.detail || 'Failed to extend schedule time';
      setErrorMsg(detail);
      toast(detail, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter students for student list
  const filteredStudents: ScheduleAttendanceStudent[] = (attendance?.students || []).filter(st => {
    if (studentStatusFilter !== 'all' && st.status !== studentStatusFilter) return false;
    if (studentSearchTerm.trim()) {
      const q = studentSearchTerm.toLowerCase();
      const matchName = st.name.toLowerCase().includes(q);
      const matchEmail = st.email.toLowerCase().includes(q);
      const matchId = (st.studentId || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId) return false;
    }
    return true;
  });

  const now = new Date();
  const isCurrentlyExpired = new Date(schedule.endTime) < now;
  const isCurrentlyLive = new Date(schedule.startTime) <= now && new Date(schedule.endTime) >= now;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-xl w-full flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 sm:py-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-blue-50/50 via-slate-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 leading-tight">Extend Assessment Time</h2>
                {isCurrentlyLive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Now
                  </span>
                )}
                {isCurrentlyExpired && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Ended / Expired
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm sm:max-w-md">
                {test?.title || attendance?.testTitle || 'Assessment Session'}
                {schedule.assignedBatch ? ` · Batch ${schedule.assignedBatch}` : ' · Campus-wide'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Attendance KPI Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Enrolled</p>
              <p className="text-lg font-black text-slate-800 mt-0.5">
                {isLoadingAttendance ? '...' : (attendance?.totalEligible ?? '-')}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Eligible Students</p>
            </div>
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Completed</p>
              <p className="text-lg font-black text-emerald-700 mt-0.5">
                {isLoadingAttendance ? '...' : (attendance?.completedCount ?? '-')}
              </p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Submitted Test</p>
            </div>
            <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl text-center ring-2 ring-rose-200/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-center gap-1">
                <UserX className="h-3 w-3 text-rose-600" />
                Missed Test
              </p>
              <p className="text-lg font-black text-rose-700 mt-0.5">
                {isLoadingAttendance ? '...' : (attendance?.missedCount ?? '-')}
              </p>
              <p className="text-[10px] text-rose-600 font-medium mt-0.5">Needs Extension</p>
            </div>
          </div>

          {/* Target Audience Strategy */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Who Needs Time Extension?</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetMode('missed_only')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  targetMode === 'missed_only'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    Missed Students
                  </p>
                  {targetMode === 'missed_only' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Extend access for {attendance?.missedCount || 0} student(s) who missed the test.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTargetMode('all')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  targetMode === 'all'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-600" />
                    Entire Batch
                  </p>
                  {targetMode === 'all' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Extend deadline for everyone enrolled in this session.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTargetMode('selected_students')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  targetMode === 'selected_students'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-600" />
                    Custom Pick
                  </p>
                  {targetMode === 'selected_students' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Pick specific individual students from the roster.
                </p>
              </button>
            </div>
          </div>

          {/* Student Selection Accordion/Table (if custom or missed only review) */}
          {targetMode === 'selected_students' && attendance && (
            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={studentSearchTerm}
                    onChange={e => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllMissed}
                    className="text-[11px] font-semibold text-blue-600 hover:underline px-1.5 py-1"
                  >
                    Select Missed ({attendance.missedCount})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={selectAllEligible}
                    className="text-[11px] font-semibold text-slate-600 hover:underline px-1.5 py-1"
                  >
                    All ({attendance.totalEligible})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-[11px] font-semibold text-slate-500 hover:underline px-1.5 py-1"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Status filter tabs */}
              <div className="flex items-center gap-1 pt-1">
                {(['all', 'missed', 'in_progress', 'completed'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStudentStatusFilter(tab)}
                    className={`px-2 py-0.5 text-[11px] rounded-md font-medium capitalize transition-colors ${
                      studentStatusFilter === tab 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab === 'in_progress' ? 'In Progress' : tab}
                  </button>
                ))}
              </div>

              {/* Student list */}
              <div className="max-h-40 overflow-y-auto space-y-1.5 bg-white border border-slate-200 rounded-lg p-2 divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(st => {
                    const isSelected = selectedStudentIds.includes(st.id);
                    return (
                      <div 
                        key={st.id}
                        onClick={() => toggleSelectStudent(st.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                          isSelected ? 'bg-blue-50/80 font-medium text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by parent div
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 pointer-events-none"
                          />
                          <div className="truncate">
                            <p className="font-semibold text-slate-800 truncate">{st.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{st.email} {st.studentId ? `· ID: ${st.studentId}` : ''}</p>
                          </div>
                        </div>

                        <div className="shrink-0 pl-2">
                          {st.status === 'completed' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Completed ({st.percentage ?? 0}%)
                            </span>
                          )}
                          {st.status === 'in_progress' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                              In Progress
                            </span>
                          )}
                          {st.status === 'missed' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                              Missed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-4 text-xs text-slate-400">No students match filter.</p>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Selected <strong>{selectedStudentIds.length}</strong> of {attendance.totalEligible} students for time extension.
              </p>
            </div>
          )}

          {/* Quick Duration Extension Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Quick Extension Presets
              </label>
              <span className="text-[11px] text-slate-400">Add to Current Window</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: '+15 Min', value: 15 },
                { label: '+30 Min', value: 30 },
                { label: '+1 Hour', value: 60 },
                { label: '+2 Hours', value: 120 },
                { label: '+24 Hours', value: 1440 },
                { label: '+48 Hours', value: 2880 },
              ].map(preset => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleQuickExtension(preset.value)}
                  className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all ${
                    activePreset === preset.value
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200'
                      : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 border border-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Explicit Date & End Time Picker */}
          <div className="space-y-3 pt-1 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800">New Assessment Window Deadline</p>
              <p className="text-[11px] text-slate-500 font-mono">
                Current: {new Date(schedule.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(schedule.endTime).toLocaleDateString([], { month: 'short', day: 'numeric' })})
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input 
                type="date"
                label="New End Date"
                value={date}
                onChange={e => {
                  setDate(e.target.value);
                  setActivePreset(null);
                }}
              />
              <Input 
                type="time"
                label="New End Time"
                value={endTime}
                onChange={e => {
                  setEndTime(e.target.value);
                  setActivePreset(null);
                }}
              />
            </div>
          </div>

          {/* Advanced / Recovery Options */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl cursor-pointer transition-colors border border-slate-200/70">
              <input
                type="checkbox"
                checked={resetIncompleteAttempts}
                onChange={e => setResetIncompleteAttempts(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <RotateCcw className="h-3 w-3 text-blue-600" />
                  Reset interrupted / incomplete attempts for missed students
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Allows students whose sessions timed out or disconnected to write the test again cleanly.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl cursor-pointer transition-colors border border-slate-200/70">
              <input
                type="checkbox"
                checked={createMakeupSession}
                onChange={e => setCreateMakeupSession(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  Create dedicated makeup session (separate schedule entry)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Spins up an isolated session strictly assigned to missed students rather than updating the main batch schedule.
                </p>
              </div>
            </label>
          </div>

          {/* Inline Error */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 animate-shake">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span className="font-medium flex-1">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 truncate hidden sm:block">
            Target: <strong>{targetMode === 'all' ? 'All Enrolled' : `${targetMode === 'selected_students' ? selectedStudentIds.length : (attendance?.missedCount || 0)} Missed Students`}</strong>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} size="sm">
              Cancel
            </Button>
            <Button 
              onClick={handleApplyExtension} 
              isLoading={isSubmitting}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 shadow-sm"
            >
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Extend Assessment Time
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
