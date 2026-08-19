import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { testService } from '../../services/testService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Test, Schedule } from '../../types';

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
        toast('Schedule updated successfully', 'success');
      } else {
        await testService.scheduleTest({
          testId: selectedTestId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          assignedStudents: assignedTo === 'all' ? ['all'] : [],
          assignedBatch: finalBatch,
        });
        toast('Test scheduled successfully', 'success');
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
          {isEditMode ? 'Edit Assessment Schedule' : 'Schedule Assessment'}
        </h1>
        <p className="text-slate-500">
          {isEditMode ? 'Modify testing window, start/end times, and assigned student batches.' : 'Assign tests to students for a specific time window.'}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Select Assessment</label>
            <select 
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedTestId}
              onChange={e => setSelectedTestId(e.target.value)}
              disabled={isEditMode}
            >
              <option value="" disabled>-- Select a test --</option>
              {tests.map(test => (
                <option key={test.id} value={test.id}>{test.title} (Duration: {test.settings.duration} min)</option>
              ))}
            </select>
          </div>

          <Input 
            type="date"
            label="Date" 
            value={date}
            onChange={e => setDate(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-slate-700">Assign To</label>
            <select 
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
            >
              <option value="all">All Students (Campus-wide)</option>
              {batches.map(b => (
                <option key={b} value={b}>Batch {b}</option>
              ))}
              <option value="custom">Other / Custom Batch</option>
            </select>

            {assignedTo === 'custom' && (
              <div className="pt-2">
                <Input
                  label="Enter Batch Name / Year"
                  placeholder="e.g. 2028 or CSE-2026"
                  value={customBatch}
                  onChange={e => setCustomBatch(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} isLoading={isScheduling} className="bg-blue-600 hover:bg-blue-700 font-bold px-6">
              {isEditMode ? 'Update Schedule' : 'Schedule Test'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
