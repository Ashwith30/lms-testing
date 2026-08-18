import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, Bookmark } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { testService } from '../../services/testService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Test, Question, Attempt } from '../../types';
import { Logo } from '../../components/ui/Logo';

export const TestAttempt = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState(0);
  const maxViolations = 3;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      if (!id || !user?.id) return;
      try {
        const testData = await testService.getTestDetails(id);
        if (!testData) throw new Error('Test not found');

        const schedule = await testService.getTestSchedule(id);
        if (schedule) {
          const now = new Date().toISOString();
          if (now < schedule.startTime) {
            throw new Error('This test has not started yet.');
          }
          if (now > schedule.endTime) {
            throw new Error('This test session has already expired.');
          }
        } else {
          throw new Error('This test is not currently scheduled.');
        }
        
        const testQuestions = await testService.getQuestionsForTest(id);
        
        // This will either get the existing attempt or create a new one
        const attemptData = await testService.startAttempt(user.id, id);
        
        if (attemptData.status === 'submitted' || attemptData.status === 'auto_submitted') {
          navigate(`/student/results/${id}`);
          return;
        }

        setTest(testData);
        setQuestions(testQuestions);
        setAttempt(attemptData);
        setViolations(attemptData.violations || 0);

      } catch (e: any) {
        toast(e.message, 'error');
        navigate('/student/dashboard');
      }
    };
    init();
  }, [id, user, navigate, toast]);

  // Timer logic
  useEffect(() => {
    if (!attempt) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(attempt.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining === 0 && !isSubmitting) {
        handleAutoSubmit();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [attempt, isSubmitting]);

  // Fullscreen logic
  useEffect(() => {
    if (!test?.settings.fullscreenRequired) return;

    const requestFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn('Fullscreen request denied');
      }
    };

    requestFullscreen();

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement !== null;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen && !isSubmitting) {
        handleViolation();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [test, isSubmitting]);

  const handleViolation = async () => {
    if (!attempt) return;
    
    const newViolations = violations + 1;
    setViolations(newViolations);
    testService.updateAttempt(attempt.id, { violations: newViolations });
    
    if (newViolations >= maxViolations) {
      toast('Maximum fullscreen violations reached. Auto-submitting test.', 'error');
      await handleAutoSubmit();
    } else {
      toast(`Warning: You exited fullscreen mode. (${newViolations}/${maxViolations} violations)`, 'error');
    }
  };

  const handleAnswerSelect = (option: 'A'|'B'|'C'|'D') => {
    if (!attempt || !questions[currentIdx]) return;
    
    const qId = questions[currentIdx].id;
    const newAnswers = {
      ...attempt.answers,
      [qId]: { ...attempt.answers[qId], selectedOption: option, status: 'answered' as const }
    };
    
    setAttempt({ ...attempt, answers: newAnswers });
    testService.updateAttempt(attempt.id, { answers: newAnswers });
  };

  const handleMarkReview = () => {
    if (!attempt || !questions[currentIdx]) return;
    const qId = questions[currentIdx].id;
    const newAnswers = {
      ...attempt.answers,
      [qId]: { ...attempt.answers[qId], status: 'marked' as const }
    };
    setAttempt({ ...attempt, answers: newAnswers });
    testService.updateAttempt(attempt.id, { answers: newAnswers });
  };

  const navigateQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIdx(index);
      
      // Mark as visited if not answered/marked
      if (attempt) {
        const qId = questions[index].id;
        const currentStatus = attempt.answers[qId]?.status;
        if (currentStatus === 'not_visited') {
          const newAnswers = {
            ...attempt.answers,
            [qId]: { ...attempt.answers[qId], status: 'visited' as const }
          };
          setAttempt({ ...attempt, answers: newAnswers });
          testService.updateAttempt(attempt.id, { answers: newAnswers });
        }
      }
    }
  };

  const handleAutoSubmit = async () => {
    if (!attempt || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await testService.submitAttempt(attempt.id);
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      navigate(`/student/results/${test?.id}`);
    } catch (e) {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (window.confirm('Are you sure you want to submit the test?')) {
      handleAutoSubmit();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!test || !attempt || questions.length === 0 || timeLeft === null) {
    return <div className="h-screen flex items-center justify-center bg-slate-50">Loading assessment...</div>;
  }

  const currentQ = questions[currentIdx];
  const currentAnswer = attempt.answers[currentQ.id];

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col" ref={containerRef}>
      {/* Top Bar */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <h1 className="font-bold tracking-tight text-lg hidden md:block">{test.title}</h1>
          <Logo size="sm" variant="light" className="md:hidden" />
        </div>
        
        <div className="flex items-center gap-6">
          {test.settings.fullscreenRequired && !isFullscreen && (
            <Button variant="danger" size="sm" onClick={() => document.documentElement.requestFullscreen()}>
              Return to Fullscreen
            </Button>
          )}
          
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-lg font-bold
            ${timeLeft < 300 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800'}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
          
          <Button variant="primary" className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} isLoading={isSubmitting}>
            Submit Test
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Question Area */}
        <div className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto w-full">
            <div className="flex justify-between items-end mb-6 pb-4 border-b">
              <div>
                <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Question {currentIdx + 1} of {questions.length}</span>
                <span className="ml-3 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{currentQ.category}</span>
              </div>
              <span className="text-sm font-medium text-slate-500">Marks: {currentQ.marks}</span>
            </div>

            <h2 className="text-xl font-medium text-slate-900 mb-8 whitespace-pre-wrap leading-relaxed">
              {currentQ.question}
            </h2>

            <div className="space-y-4">
              {['A', 'B', 'C', 'D'].map((opt) => (
                <label 
                  key={opt} 
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    currentAnswer?.selectedOption === opt 
                      ? 'border-blue-600 bg-blue-50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${currentQ.id}`}
                    className="h-5 w-5 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                    checked={currentAnswer?.selectedOption === opt}
                    onChange={() => handleAnswerSelect(opt as any)}
                  />
                  <div className="ml-4 flex-1">
                    <span className="font-semibold text-slate-900 mr-2">{opt}.</span>
                    <span className="text-slate-700">{currentQ.options[opt as keyof typeof currentQ.options]}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-auto p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0 sticky bottom-0">
            <Button 
              variant="outline" 
              onClick={() => navigateQuestion(currentIdx - 1)}
              disabled={currentIdx === 0 || (!test.settings.allowBackNavigation)}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleMarkReview}>
                <Bookmark className={`mr-2 h-4 w-4 ${currentAnswer?.status === 'marked' ? 'fill-current' : ''}`} /> 
                {currentAnswer?.status === 'marked' ? 'Unmark' : 'Mark for Review'}
              </Button>
              <Button onClick={() => navigateQuestion(currentIdx + 1)}>
                {currentIdx === questions.length - 1 ? 'Save' : 'Save & Next'} <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Palette */}
        {test.settings.enablePalette && (
          <div className="w-80 bg-slate-50 shrink-0 flex flex-col overflow-y-auto">
            <div className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Question Palette</h3>
              
              <div className="grid grid-cols-5 gap-2 mb-8">
                {questions.map((q, idx) => {
                  const status = attempt.answers[q.id]?.status || 'not_visited';
                  let bgColor = 'bg-white border-slate-300 text-slate-600'; // not visited
                  
                  if (status === 'answered') bgColor = 'bg-green-500 border-green-600 text-white';
                  else if (status === 'marked') bgColor = 'bg-purple-500 border-purple-600 text-white';
                  else if (status === 'visited') bgColor = 'bg-red-500 border-red-600 text-white';
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => navigateQuestion(idx)}
                      className={`h-10 w-10 rounded-lg border flex items-center justify-center text-sm font-semibold transition-transform hover:scale-105 ${bgColor} ${currentIdx === idx ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-6">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-4 h-4 rounded bg-green-500 border border-green-600"></div>
                  Answered
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-4 h-4 rounded bg-red-500 border border-red-600"></div>
                  Not Answered
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-4 h-4 rounded bg-white border border-slate-300"></div>
                  Not Visited
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-4 h-4 rounded bg-purple-500 border border-purple-600"></div>
                  Marked for Review
                </div>
              </div>
              
              {test.settings.fullscreenRequired && (
                <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm">
                  <AlertTriangle className="h-5 w-5 mb-2 text-amber-600" />
                  Fullscreen is required. Exiting will record a violation.
                  <p className="mt-2 font-semibold">Violations: {violations} / {maxViolations}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
