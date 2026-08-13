import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { testService } from '../../services/testService';
import { useToast } from '../../context/ToastContext';
import { Test } from '../../types';

export const ScheduleTest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  
  // Schedule state
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [assignedTo, setAssignedTo] = useState('all');
  
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const allTests = await testService.getTrainerTests();
        setTests(allTests.filter(t => t.status === 'Draft' || t.status === 'Scheduled'));
      } catch (error) {
        console.error("Failed to load tests for scheduling", error);
      }
    };
    fetchTests();
  }, []);

  const handleSchedule = async () => {
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

    setIsScheduling(true);
    try {
      await testService.scheduleTest({
        testId: selectedTestId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        assignedStudents: assignedTo === 'all' ? ['all'] : [],
        assignedBatch: assignedTo !== 'all' ? assignedTo : undefined,
      });
      toast('Test scheduled successfully', 'success');
      navigate('/trainer/tests');
    } catch (e) {
      toast('Failed to schedule test', 'error');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Schedule Assessment</h1>
        <p className="text-slate-500">Assign tests to students for a specific time window.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Select Assessment</label>
            <select 
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedTestId}
              onChange={e => setSelectedTestId(e.target.value)}
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
              <option value="all">All Students</option>
              <option value="2026">Batch 2026</option>
              <option value="2027">Batch 2027</option>
            </select>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button onClick={handleSchedule} isLoading={isScheduling}>
              Schedule Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
