import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldAlert, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { testService } from '../../services/testService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Test, Schedule } from '../../types';
import { ProctoringSetupModal } from '../../components/student/ProctoringSetupModal';

export const TestDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [test, setTest] = useState<Test | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<'loading' | 'future' | 'active' | 'expired' | 'unscheduled'>('loading');
  const [agreed, setAgreed] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  useEffect(() => {
    const fetchTestDetails = async () => {
      if (id) {
        try {
          const testData = await testService.getTestDetails(id);
          if (testData) {
            setTest(testData);
            const schedData = await testService.getTestSchedule(id);
            setSchedule(schedData || null);
            if (schedData) {
              const now = new Date().toISOString();
              if (now < schedData.startTime) {
                setScheduleStatus('future');
              } else if (now > schedData.endTime) {
                setScheduleStatus('expired');
              } else {
                setScheduleStatus('active');
              }
            } else {
              setScheduleStatus('unscheduled');
            }
          } else {
            toast('Test not found', 'error');
            navigate('/student/dashboard');
          }
        } catch (error) {
          console.error("Failed to load test details", error);
          toast('Error loading test details', 'error');
          navigate('/student/dashboard');
        }
      }
    };
    fetchTestDetails();
  }, [id, navigate, toast]);

  const handleStartTest = async () => {
    if (!user?.id || !test?.id) return;
    
    // Double check schedule
    const now = new Date().toISOString();
    if (schedule) {
      if (now < schedule.startTime) {
        toast('This test has not started yet', 'error');
        return;
      }
      if (now > schedule.endTime) {
        toast('This test has expired', 'error');
        return;
      }
    } else if (scheduleStatus === 'unscheduled') {
      toast('This test is not scheduled', 'error');
      return;
    }
    
    setIsStarting(true);
    try {
      await testService.startAttempt(user.id, test.id);
      navigate(`/student/tests/${test.id}/attempt`);
    } catch (e: any) {
      toast(e.message || 'Failed to start test', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  if (!test) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-4">
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">{test.title}</h1>
              <p className="text-slate-500">{test.description}</p>
            </div>
            
            <div className="flex flex-col gap-2 shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between gap-8 text-sm">
                <span className="text-slate-500">Questions</span>
                <span className="font-semibold text-slate-900">{test.questionIds.length}</span>
              </div>
              <div className="flex justify-between gap-8 text-sm items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Duration
                </span>
                <span className="font-semibold text-slate-900">{test.settings.duration} Minutes</span>
              </div>
              <div className="flex justify-between gap-8 text-sm">
                <span className="text-slate-500">Total Marks</span>
                <span className="font-semibold text-slate-900">{test.totalMarks}</span>
              </div>
              <div className="flex justify-between gap-8 text-sm items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Proctoring
                </span>
                <span className="font-semibold text-emerald-600">Enforced</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-blue-600" />
              Important Instructions & Anti-Malpractice Rules
            </h2>
            
            <ul className="space-y-3 text-slate-700 bg-slate-50 p-6 rounded-xl border border-slate-100 text-sm">
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                Ensure a stable internet connection. All answers are continuously synchronized online to the database.
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                The test must be completed within the allotted time of {test.settings.duration} minutes.
              </li>
              <li className="flex gap-3 text-amber-800 font-medium">
                <span className="text-amber-600 font-bold">•</span>
                Live AI Camera Proctoring will continuously detect face presence and mobile phone usage.
              </li>
              <li className="flex gap-3 text-amber-800 font-medium">
                <span className="text-amber-600 font-bold">•</span>
                Fullscreen mode is strictly enforced. Leaving fullscreen, switching tabs, Alt+Tab, or trackpad app switch gestures will log violations.
              </li>
              <li className="flex gap-3 text-red-700 font-medium">
                <span className="text-red-600 font-bold">•</span>
                A maximum of 3 proctoring violations is permitted before automatic submission and exam disqualification.
              </li>
              {test.settings.negativeMarking && (
                <li className="flex gap-3">
                  <span className="text-red-600 font-bold">•</span>
                  Negative marking is enabled. Incorrect answers will result in a deduction of marks.
                </li>
              )}
            </ul>

            {scheduleStatus === 'future' && schedule && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <strong>This assessment has not started yet.</strong> It is scheduled to start at{' '}
                  {new Date(schedule.startTime).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })} and end at{' '}
                  {new Date(schedule.endTime).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}.
                </div>
              </div>
            )}
            
            {scheduleStatus === 'expired' && schedule && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <strong>This assessment has expired.</strong> The scheduled window ended at{' '}
                  {new Date(schedule.endTime).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}.
                </div>
              </div>
            )}

            {scheduleStatus === 'unscheduled' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong>This assessment is not currently scheduled.</strong> Please contact your trainer.
                </div>
              </div>
            )}

            {scheduleStatus === 'active' && (
              <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="checkbox" 
                  className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-900">
                  I have read and agree to all exam integrity instructions. I acknowledge that camera access and fullscreen lockdown are required.
                </span>
              </label>
            )}

            <div className="flex justify-end pt-4">
              <Button 
                size="lg" 
                disabled={scheduleStatus !== 'active' || !agreed} 
                onClick={() => setIsSetupModalOpen(true)}
                isLoading={isStarting}
                className="bg-blue-600 hover:bg-blue-700 font-bold"
              >
                {scheduleStatus === 'future' ? 'Not Started Yet' : scheduleStatus === 'expired' ? 'Expired' : 'Start System Check & Exam'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pre-Exam Hardware Verification Modal */}
      <ProctoringSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onConfirmStart={() => {
          setIsSetupModalOpen(false);
          handleStartTest();
        }}
        testTitle={test.title}
        durationMinutes={test.settings.duration}
      />
    </div>
  );
};
