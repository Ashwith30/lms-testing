import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { testService } from '../../services/testService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Test, Schedule } from '../../types';
import { Calendar, Clock, Users, RefreshCw, Layers } from 'lucide-react';

export const ScheduleTest = () => {
  const navigate = useNavigate();
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const [searchParams] = useSearchParams();
  const queryScheduleId = searchParams.get('scheduleId') || scheduleId;
  const queryTestId = searchParams.get('testId');
  const isEditMode = Boolean(queryScheduleId);

  const { toast } = useToast();
  const { user } = useAuth();

  const [tests, setTests] = useState<Test[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [selectedTestId, setSelectedTestId] = useState(queryTestId || '');
  const [existingSchedules, setExistingSchedules] = useState<Schedule[]>([]);
  
  // Schedule state
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [assignedTo, setAssignedTo] = useState('all');
  const [customBatch, setCustomBatch] = useState('');
  
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [allTests, availableBatches] = await Promise.all([
          testService.getTrainerTests(),
          testService.getBatches()
        ]);
        setTests(allTests);
        setBatches(availableBatches.length > 0 ? availableBatches : ['2025', '2026', '2027']);

        if (queryScheduleId) {
          const scheduleData: Schedule | undefined = await testService.getScheduleById(queryScheduleId);
          if (scheduleData) {
            setSelectedTestId(scheduleData.testId);

            // Parse ISO date and time
            const sDate = new Date(scheduleData.startTime);
            const eDate = new Date(scheduleData.endTime);

            const yyyy = sDate.getFullYear();
            const mm = String(sDate.getMonth() + 1).padStart(2, '0');
            const dd = String(sDate.getDate()).padStart(2, '0');
            setDate(`${yyyy}-${mm}-${dd}`);

            const startHH = String(sDate.getHours()).padStart(2, '0');
            const startMM = String(sDate.getMinutes()).padStart(2, '0');
            setStartTime(`${startHH}:${startMM}`);

            const endHH = String(eDate.getHours()).padStart(2, '0');
            const endMM = String(eDate.getMinutes()).padStart(2, '0');
            setEndTime(`${endHH}:${endMM}`);

            if (scheduleData.assignedBatch) {
              if (['2025', '2026', '2027', ...availableBatches].includes(scheduleData.assignedBatch)) {
                setAssignedTo(scheduleData.assignedBatch);
              } else {
                setAssignedTo('custom');
                setCustomBatch(scheduleData.assignedBatch);
              }
            } else {
              setAssignedTo('all');
            }
          }
        }
      } catch (error) {
        console.error("Failed to load tests or schedule data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [queryScheduleId]);

  // When selected test changes, fetch its existing schedules
  useEffect(() => {
    if (selectedTestId) {
      testService.getSchedulesForTest(selectedTestId)
        .then(scheds => setExistingSchedules(scheds))
        .catch(() => setExistingSchedules([]));
    } else {
      setExistingSchedules([]);
    }
  }, [selectedTestId]);

  const handleSaveSchedule = async () => {
    if (!selectedTestId || !date || !startTime || !endTime) {
      toast('Please fill all required fields', 'error');
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);
    
    if (endDateTime <= startDateTime) {
      toast('End time must be after start time', 'error');
      return;
    }

    const finalBatch = assignedTo === 'custom' ? customBatch.trim() : assignedTo !== 'all' ? assignedTo : undefined;
    const basePath = user?.role === 'institution' ? '/institution' : user?.role === 'admin' ? '/admin' : '/trainer';

    setIsScheduling(true);
    try {
      if (isEditMode && queryScheduleId) {
        await testService.updateSchedule(queryScheduleId, {
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          assignedStudents: assignedTo === 'all' ? ['all'] : [],
          assignedBatch: finalBatch,
        });
        toast('Schedule session updated successfully', 'success');
      } else {
        await testService.scheduleTest({
          testId: selectedTestId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          assignedStudents: assignedTo === 'all' ? ['all'] : [],
          assignedBatch: finalBatch,
        });
        toast(
          existingSchedules.length > 0
            ? `New session scheduled (Reconducted for ${finalBatch ? `Batch ${finalBatch}` : 'all students'})!`
            : 'Test scheduled successfully',
          'success'
        );
      }
      navigate(`${basePath}/tests`);
    } catch (e) {
      toast(isEditMode ? 'Failed to update schedule' : 'Failed to schedule test', 'error');
    } finally {
      setIsScheduling(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-16 text-slate-500 font-medium">Loading schedule information...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEditMode ? 'Edit Assessment Session' : 'Schedule / Reconduct Assessment'}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isEditMode 
            ? 'Modify testing window, start/end times, and assigned student batches.' 
            : 'Assign tests to specific student batches, setup makeup sessions, or reconduct across cohorts.'}
        </p>
      </div>

      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Select Assessment</label>
            <select 
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedTestId}
              onChange={e => setSelectedTestId(e.target.value)}
              disabled={isEditMode}
            >
              <option value="" disabled>-- Select an assessment --</option>
              {tests.map(test => (
                <option key={test.id} value={test.id}>
                  {test.title} ({test.questionIds.length} Qs · {test.settings.duration} min)
                </option>
              ))}
            </select>
          </div>

          {/* Past/Existing sessions overview for the selected test */}
          {existingSchedules.length > 0 && !isEditMode && (
            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Previous Sessions for this Test ({existingSchedules.length})</span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {existingSchedules.map((s, idx) => (
                  <div key={s.id || idx} className="text-xs flex items-center justify-between text-slate-600">
                    <span className="font-medium text-slate-800">
                      {s.assignedBatch ? `Batch ${s.assignedBatch}` : 'Campus-wide'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(s.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} ({new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-blue-600/80 pt-1 border-t border-blue-200/50">
                Saving this form will add a <strong>new session window</strong> without overwriting past results.
              </p>
            </div>
          )}

          <Input 
            type="date"
            label="Session Date" 
            value={date}
            onChange={e => setDate(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-600" />
              Assign To Batch
            </label>
            <select 
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
            >
              <option value="all">Campus-Wide (All Enrolled Students)</option>
              {batches.map(b => (
                <option key={b} value={b}>Batch {b}</option>
              ))}
              <option value="custom">Other / Custom Cohort Identifier</option>
            </select>

            {assignedTo === 'custom' && (
              <div className="pt-2">
                <Input
                  label="Enter Custom Batch / Group Name"
                  placeholder="e.g. 2028 or Retake-CSE"
                  value={customBatch}
                  onChange={e => setCustomBatch(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} isLoading={isScheduling} className="bg-blue-600 hover:bg-blue-700 font-bold px-6 w-full sm:w-auto">
              {isEditMode ? 'Update Session' : existingSchedules.length > 0 ? 'Schedule New Session (Reconduct)' : 'Schedule Assessment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
