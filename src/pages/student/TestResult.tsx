import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, CheckCircle, XCircle, MinusCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { resultService, StudentResult } from '../../services/resultService';

export const TestResult = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<StudentResult | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (id) {
        try {
          const results = await resultService.getStudentResults(
            localStorage.getItem('lms_current_user') || ''
          );
          const attempt = results.find(r => r.test.id === id);
          if (attempt) {
            setResult(attempt);
          } else {
            navigate('/student/dashboard');
          }
        } catch (error) {
          console.error("Failed to load test results", error);
          navigate('/student/dashboard');
        }
      }
    };
    fetchResults();
  }, [id, navigate]);

  if (!result) return null;

  const { test, score, percentage, answers, startedAt, submittedAt } = result;

  const formatDuration = () => {
    if (!startedAt || !submittedAt) return 'Unknown';
    const s = new Date(startedAt).getTime();
    const e = new Date(submittedAt).getTime();
    const diff = Math.floor((e - s) / 1000);
    const m = Math.floor(diff / 60);
    const sec = diff % 60;
    return `${m}m ${sec}s`;
  };

  const getStats = () => {
    let correct = 0, incorrect = 0, unattempted = 0;
    
    test.questionIds.forEach(qId => {
      const ans = answers[qId];
      if (!ans || !ans.selectedOption) {
        unattempted++;
      } else {
        // Find question to check correctness
        // Since we don't have direct access to questions here easily, 
        // we could just fetch questions, but for prototype we can deduce it from the score if needed
        // Or we just fetch questions. Let's fetch questions.
      }
    });
    
    // For prototype simplicity, we will just show summary
  };

  if (!test.settings.showResultImmediately) {
    return (
      <div className="max-w-2xl mx-auto pt-12">
        <Card>
          <CardContent className="p-12 text-center flex flex-col items-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-6" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Assessment Submitted</h1>
            <p className="text-slate-600 mb-8">
              Your test has been submitted successfully. Results will be available after evaluation by your trainer.
            </p>
            <Button onClick={() => navigate('/student/dashboard')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-4">
      <Card className="overflow-hidden border-0 shadow-lg relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        <CardContent className="p-8 relative pt-24 text-center">
          <div className="bg-white rounded-full p-4 inline-block shadow-lg mb-4 ring-4 ring-slate-50">
            <Trophy className="h-12 w-12 text-yellow-500" />
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Test Completed</h1>
          <p className="text-slate-500 font-medium mb-8">{test.title}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm text-slate-500 font-medium">Score</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{score} <span className="text-sm font-normal text-slate-500">/ {test.totalMarks}</span></p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm text-slate-500 font-medium">Percentage</p>
              <p className={`text-2xl font-bold mt-1 ${(percentage || 0) >= 70 ? 'text-green-600' : (percentage || 0) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                {percentage?.toFixed(1)}%
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm text-slate-500 font-medium">Attempted</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {Object.values(answers).filter(a => a.selectedOption).length}
                <span className="text-sm font-normal text-slate-500"> / {test.questionIds.length}</span>
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm text-slate-500 font-medium">Time Taken</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 flex items-center justify-center gap-1">
                <Clock className="h-5 w-5 text-slate-400" />
                {formatDuration()}
              </p>
            </div>
          </div>
          
          {result.violations > 0 && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <AlertTriangle className="h-5 w-5 inline mr-2 text-amber-600" />
              This attempt recorded <strong>{result.violations}</strong> fullscreen violations.
            </div>
          )}

          <Button onClick={() => navigate('/student/dashboard')} size="lg">
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
