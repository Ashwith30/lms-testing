import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  CheckCircle, 
  XCircle, 
  MinusCircle, 
  Clock, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  EyeOff,
  Users,
  Monitor,
  Terminal,
  Lock,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { resultService, StudentResult } from '../../services/resultService';
import { testService } from '../../services/testService';
import { Question, ViolationLog } from '../../types';

export const TestResult = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<StudentResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [showViolations, setShowViolations] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (id) {
        try {
          const userId = localStorage.getItem('lms_current_user') || '';
          const results = await resultService.getStudentResults(userId);
          const attempt = results.find(r => r.test.id === id);
          if (attempt) {
            setResult(attempt);
            // Fetch questions for detailed review if showResultImmediately is enabled
            if (attempt.test?.settings?.showResultImmediately) {
              const testQs = await testService.getQuestionsForTest(id);
              setQuestions(testQs);
            }
          } else {
            navigate('/student/dashboard');
          }
        } catch (error) {
          console.error("Failed to load test results", error);
          navigate('/student/dashboard');
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchResults();
  }, [id, navigate]);

  if (isLoading) {
    return <div className="text-center py-16 text-slate-500">Loading evaluation results...</div>;
  }

  if (!result) return null;

  const { test, score, percentage, answers, startedAt, submittedAt } = result;

  const formatDuration = () => {
    if (!startedAt || !submittedAt) return 'Unknown';
    const s = new Date(startedAt).getTime();
    const e = new Date(submittedAt).getTime();
    const diff = Math.max(0, Math.floor((e - s) / 1000));
    const m = Math.floor(diff / 60);
    const sec = diff % 60;
    return `${m}m ${sec}s`;
  };

  // Helper for violation details
  const getViolationInfo = (type: string) => {
    switch (type) {
      case 'PHONE_DETECTED':
        return {
          title: 'Mobile Phone Detected',
          icon: Smartphone,
          color: 'text-rose-600 bg-rose-50 border-rose-200',
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-200'
        };
      case 'FACE_MISSING':
        return {
          title: 'Face Not Detected',
          icon: EyeOff,
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
        };
      case 'MULTIPLE_FACES':
        return {
          title: 'Multiple Faces Detected',
          icon: Users,
          color: 'text-purple-600 bg-purple-50 border-purple-200',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200'
        };
      case 'FULLSCREEN_EXIT':
        return {
          title: 'Fullscreen Mode Exited',
          icon: Monitor,
          color: 'text-red-600 bg-red-50 border-red-200',
          badgeColor: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'TAB_SWITCH':
        return {
          title: 'Tab Switch / Window Left',
          icon: Monitor,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'WINDOW_BLUR':
      case 'APP_SWITCH_GESTURE':
        return {
          title: 'App Switch / Blur Gesture',
          icon: Monitor,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'DEVTOOLS_OPEN':
        return {
          title: 'Developer Tools Detected',
          icon: Terminal,
          color: 'text-red-600 bg-red-50 border-red-200',
          badgeColor: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'SHORTCUT_BLOCKED':
        return {
          title: 'Restricted Key Shortcut Blocked',
          icon: Lock,
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
        };
      case 'CONTEXT_MENU_BLOCKED':
        return {
          title: 'Right-Click Menu Blocked',
          icon: Lock,
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
        };
      default:
        return {
          title: 'Security Alert Flag',
          icon: AlertTriangle,
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
        };
    }
  };

  const formatViolationTime = (isoString?: string) => {
    if (!isoString) return 'During session';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'During session';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'During session';
    }
  };

  // Compute breakdown stats
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  if (questions.length > 0) {
    questions.forEach(q => {
      const ans = answers[q.id];
      if (!ans || !ans.selectedOption) {
        unattemptedCount++;
      } else if (ans.selectedOption === q.correctAnswer) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });
  } else {
    const totalQs = test.questionIds?.length || 0;
    const attemptedQs = Object.values(answers).filter(a => a.selectedOption).length;
    unattemptedCount = totalQs - attemptedQs;
  }

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

  const isPassed = (percentage || 0) >= 60;
  const violationLogsList: ViolationLog[] = result.violationLogs || [];
  const proctorSummary = result.proctoringSummary;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-4 pb-12">
      <Card className="overflow-hidden border-0 shadow-lg relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        <CardContent className="p-8 relative pt-24 text-center">
          <div className="bg-white rounded-full p-4 inline-block shadow-lg mb-4 ring-4 ring-slate-50">
            <Trophy className={`h-12 w-12 ${isPassed ? 'text-yellow-500' : 'text-slate-400'}`} />
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
            {isPassed ? 'Assessment Completed!' : 'Assessment Finished'}
          </h1>
          <p className="text-slate-500 font-medium mb-8">{test.title}</p>
          
          {/* Main Score & KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Score</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{score} <span className="text-xs font-normal text-slate-500">/ {test.totalMarks}</span></p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Percentage</p>
              <p className={`text-2xl font-bold mt-1 ${(percentage || 0) >= 70 ? 'text-green-600' : (percentage || 0) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                {percentage?.toFixed(1)}%
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Attempted</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {Object.values(answers).filter(a => a.selectedOption).length}
                <span className="text-xs font-normal text-slate-500"> / {test.questionIds?.length ?? 0}</span>
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Time Taken</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 flex items-center justify-center gap-1">
                <Clock className="h-5 w-5 text-slate-400" />
                {formatDuration()}
              </p>
            </div>
          </div>

          {/* Breakdown Pills */}
          {questions.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <CheckCircle className="h-4 w-4" />
                <span>{correctCount} Correct</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                <XCircle className="h-4 w-4" />
                <span>{incorrectCount} Incorrect</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                <MinusCircle className="h-4 w-4" />
                <span>{unattemptedCount} Unattempted</span>
              </div>
            </div>
          )}
          
          {/* Integrity & Proctoring Summary Card */}
          <div className="mb-8 p-4 rounded-xl border text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${result.violations > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {result.violations > 0 ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Proctoring & Exam Integrity</p>
                <p className="text-sm font-semibold text-slate-900">
                  {result.violations === 0 ? 'Clean Session - Zero Warnings Logged' : `${result.violations} Security Warnings Logged`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {result.violations === 0 
                    ? 'All proctoring rules were respected throughout your exam session.' 
                    : 'Security events or focus changes were detected during your attempt.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              {result.violations === 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle className="h-3.5 w-3.5" /> Verified Clean
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowViolations(!showViolations)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                  <span>{showViolations ? 'Hide Recorded Violations' : 'View Recorded Violations'}</span>
                  {showViolations ? <ChevronUp className="h-3.5 w-3.5 ml-0.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-0.5" />}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {questions.length > 0 && (
              <Button 
                variant="outline"
                onClick={() => setShowReview(!showReview)}
              >
                {showReview ? 'Hide Answers' : 'Review Questions & Answers'}
                {showReview ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
            )}
            <Button onClick={() => navigate('/student/dashboard')} size="lg">
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recorded Violations Breakdown & Event Log (Visible to Student) */}
      {result.violations > 0 && showViolations && (
        <Card className="border border-amber-200 bg-white shadow-sm overflow-hidden animate-in">
          <CardHeader className="bg-amber-50/70 border-b border-amber-200/70 py-4 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-amber-950 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Recorded Proctoring Warnings ({result.violations})
              </CardTitle>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Logged Security Events
              </span>
            </div>
            <p className="text-xs text-amber-800/80 mt-1">
              The following integrity warnings were recorded by the automated proctoring monitor during this test session.
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Aggregate Metrics Chips */}
            {proctorSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">Tab Switches:</span>
                  <span className="font-bold text-slate-900 ml-1">{proctorSummary.tabSwitches || 0}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">App/Blur Swipes:</span>
                  <span className="font-bold text-slate-900 ml-1">{(proctorSummary.windowBlurs || 0) + (proctorSummary.appSwitchGestures || 0)}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">Fullscreen Exits:</span>
                  <span className="font-bold text-slate-900 ml-1">{proctorSummary.fullscreenExits || 0}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">Phone Detected:</span>
                  <span className={`font-bold ml-1 ${(proctorSummary.phoneDetectedIncidents || 0) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {proctorSummary.phoneDetectedIncidents || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Individual Violation Event Logs */}
            <div className="space-y-2.5 pt-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Event Timeline & Reasons</p>
              {violationLogsList.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {violationLogsList.map((log, index) => {
                    const info = getViolationInfo(log.type);
                    const IconComponent = info.icon;
                    return (
                      <div key={log.id || index} className="p-3.5 flex items-start gap-3 bg-white hover:bg-slate-50 transition-colors">
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${info.color}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <p className="text-sm font-bold text-slate-900">{info.title}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-slate-500">
                                {formatViolationTime(log.timestamp)}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${info.badgeColor}`}>
                                {log.severity || 'warning'}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {log.reason || 'Session security event flagged.'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-center gap-2.5">
                  <Info className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    {result.violations} session warnings were registered during this attempt (such as tab unfocus or fullscreen exit events).
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                These events are automatically recorded to ensure fair assessment conditions. They will be reviewed by your institution administrators.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Question Review Accordion */}
      {showReview && questions.length > 0 && (
        <div className="space-y-4 animate-in">
          <h2 className="text-xl font-bold text-slate-900">Question-by-Question Review</h2>
          {questions.map((q, idx) => {
            const ans = answers[q.id];
            const isAnswered = ans && ans.selectedOption;
            const isCorrect = isAnswered && ans.selectedOption === q.correctAnswer;
            const isWrong = isAnswered && ans.selectedOption !== q.correctAnswer;

            return (
              <Card key={q.id} className="border border-slate-200">
                <CardHeader className="bg-slate-50 border-b py-3 px-6 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-500">Q{idx + 1}</span>
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">{q.category}</span>
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">{q.difficulty}</span>
                  </div>
                  <div>
                    {isCorrect && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle className="h-3.5 w-3.5" /> Correct (+{q.marks})
                      </span>
                    )}
                    {isWrong && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <XCircle className="h-3.5 w-3.5" /> Incorrect {test.settings.negativeMarking ? `(-${(q.marks * 0.25).toFixed(2)})` : '(0)'}
                      </span>
                    )}
                    {!isAnswered && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        <MinusCircle className="h-3.5 w-3.5" /> Unattempted
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="font-medium text-slate-900 text-base">{q.question}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {['A', 'B', 'C', 'D'].map(optKey => {
                      const optText = q.options[optKey as keyof typeof q.options];
                      const isUserChoice = ans?.selectedOption === optKey;
                      const isCorrectChoice = q.correctAnswer === optKey;

                      let style = "border-slate-200 bg-white text-slate-700";
                      if (isCorrectChoice) {
                        style = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold";
                      } else if (isUserChoice && !isCorrectChoice) {
                        style = "border-rose-500 bg-rose-50 text-rose-900 line-through";
                      }

                      return (
                        <div key={optKey} className={`p-3 rounded-lg border text-sm flex items-start gap-2 ${style}`}>
                          <span className="font-bold">{optKey}.</span>
                          <span>{optText}</span>
                          {isUserChoice && <span className="ml-auto text-xs opacity-75">(Your Answer)</span>}
                          {isCorrectChoice && <span className="ml-auto text-xs text-emerald-700 font-bold">(Correct)</span>}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
