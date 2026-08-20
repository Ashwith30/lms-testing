import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, Bookmark, Maximize, Minimize, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { testService } from '../../services/testService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Test, Question, Attempt, ViolationLog, ViolationType } from '../../types';
import { Logo } from '../../components/ui/Logo';
import { useMalpracticeLockdown } from '../../hooks/useMalpracticeLockdown';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { 
  loadCocoModel, 
  detectObjectsInFrame, 
  captureVideoSnapshot, 
  calculateProctoringSummary 
} from '../../services/proctoringService';
import { syncService, SyncStatus } from '../../services/syncService';
import { ProctoringOverlay } from '../../components/student/ProctoringOverlay';
import { FullscreenWarningModal } from '../../components/student/FullscreenWarningModal';
import { SubmitAnalysisModal } from '../../components/student/SubmitAnalysisModal';
import { DetectedObject } from '@tensorflow-models/coco-ssd';
import pLogoWatermark from '../../assets/p-logo-transparent-bg.png';

export const TestAttempt = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryScheduleId = searchParams.get('scheduleId') || undefined;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { isMobile, isTablet, isTouchDevice } = useDeviceDetection();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [violations, setViolations] = useState(0);
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>([]);
  const maxViolations = isTouchDevice ? 5 : 3; // Relaxed threshold for mobile
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');

  // AI Camera Proctoring State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isAiReady, setIsAiReady] = useState(false);
  const [personCount, setPersonCount] = useState(1);
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [predictions, setPredictions] = useState<DetectedObject[]>([]);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(Date.now());
  const [showRightPanel, setShowRightPanel] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiIntervalRef = useRef<any>(null);

  // Consecutive counters to avoid transient false alarms
  const missingFaceStreakRef = useRef(0);
  const multipleFaceStreakRef = useRef(0);
  const phoneStreakRef = useRef(0);

  // Fullscreen tracking refs
  const hasEnteredFullscreenRef = useRef(false);
  const isSubmittingRef = useRef(false);
  isSubmittingRef.current = isSubmitting;

  // Ref tracking current violation logs & counts for async callbacks
  const violationsRef = useRef(violations);
  violationsRef.current = violations;
  const violationLogsRef = useRef(violationLogs);
  violationLogsRef.current = violationLogs;
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

  // Dedicated media stream track cleanup helper
  const stopAllMediaTracks = useCallback(() => {
    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current);
      aiIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Track stop warning:', e);
        }
      });
      streamRef.current = null;
    }
    setStream(null);
    setCameraActive(false);
  }, []);

  // Safe Fullscreen helpers
  const enterFullscreenSafe = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        await (el as any).webkitRequestFullscreen();
      } else if ((el as any).mozRequestFullScreen) {
        await (el as any).mozRequestFullScreen();
      } else if ((el as any).msRequestFullscreen) {
        await (el as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
      hasEnteredFullscreenRef.current = true;
      setShowFullscreenModal(false);
    } catch (err) {
      console.warn('Fullscreen request could not be fulfilled without user gesture:', err);
    }
  };

  const exitFullscreenSafe = async () => {
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Exit fullscreen warning:', err);
    }
  };

  const toggleFullscreen = async () => {
    const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
    if (isFs) {
      if (test?.settings?.fullscreenRequired) {
        toast('Fullscreen mode is mandatory for this proctored assessment.', 'error');
        return;
      }
      await exitFullscreenSafe();
    } else {
      await enterFullscreenSafe();
    }
  };

  // Subscribe to sync service status
  useEffect(() => {
    const unsubscribe = syncService.subscribeStatus((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  // 1. Log violation & capture snapshot
  const registerViolation = useCallback(async (type: ViolationType, reason: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'high') => {
    if (isSubmittingRef.current) return;

    let snapshotUrl: string | undefined;
    if (videoRef.current) {
      snapshotUrl = captureVideoSnapshot(videoRef.current);
    }

    const newLog: ViolationLog = {
      id: `viol-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      type,
      reason,
      snapshotUrl,
      severity
    };

    const updatedLogs = [...violationLogsRef.current, newLog];
    const newViolationsCount = violationsRef.current + 1;

    setViolationLogs(updatedLogs);
    setViolations(newViolationsCount);

    const proctoringSummary = calculateProctoringSummary(updatedLogs);

    if (attemptRef.current) {
      syncService.syncViolationsDirect(
        attemptRef.current.id,
        newViolationsCount,
        updatedLogs,
        proctoringSummary
      );
    }

    // Violation feedback toast
    toast(`Security Alert: ${reason} (${newViolationsCount}/${maxViolations} warnings)`, 'error');

    if (newViolationsCount >= maxViolations) {
      toast('Maximum security violations reached. Disqualifying & auto-submitting test.', 'error');
      handleAutoSubmit(updatedLogs, newViolationsCount);
    }
  }, [toast]);

  const registerViolationRef = useRef(registerViolation);
  registerViolationRef.current = registerViolation;

  // 2. Malpractice Lockdown Hook
  useMalpracticeLockdown({
    isActive: !isSubmitting && attempt !== null,
    liteMode: isTouchDevice,
    onViolation: (type, reason) => {
      registerViolation(type, reason, 'high');
    }
  });

  // 3. Initialize test & attempt
  useEffect(() => {
    const init = async () => {
      if (!id || !user?.id) return;
      try {
        const testData = await testService.getTestDetails(id);
        if (!testData) throw new Error('Test not found');

        const schedule = await testService.getTestSchedule(id, queryScheduleId);
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
        const attemptData = await testService.startAttempt(user.id, id, queryScheduleId);
        
        if (attemptData.status === 'submitted' || attemptData.status === 'auto_submitted') {
          navigate(`/student/results/${id}`);
          return;
        }

        setTest(testData);
        setQuestions(testQuestions);
        setAttempt(attemptData);
        setViolations(attemptData.violations || 0);
        setViolationLogs(attemptData.violationLogs || []);

      } catch (e: any) {
        toast(e.message, 'error');
        navigate('/student/dashboard');
      }
    };
    init();
  }, [id, queryScheduleId, user, navigate, toast]);

  // 4. Initialize Camera & AI Vision Model Loop (runs once on mount)
  useEffect(() => {
    let isMounted = true;

    const startCameraAndAI = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });

        // Ensure we cleanly terminate track if unmounted or submitting in the interim
        if (!isMounted || isSubmittingRef.current) {
          mediaStream.getTracks().forEach((t) => {
            try { t.stop(); } catch {}
          });
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setCameraActive(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(e => console.warn('Video play note:', e));
        }

        const model = await loadCocoModel();
        if (!isMounted || isSubmittingRef.current) return;
        setIsAiReady(true);

        // Run object detection loop every 800ms
        aiIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || isSubmittingRef.current) return;

          // Make sure stream is playing and attached
          if (videoRef.current.srcObject !== streamRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
          }

          if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) return;

          const res = await detectObjectsInFrame(videoRef.current, model);
          if (!isMounted || !res.isReady || isSubmittingRef.current) return;

          setPredictions(res.predictions);
          setLastAnalysisTime(Date.now());
          setPersonCount(res.personCount);
          setPhoneDetected(res.phoneDetected);

          // Evaluation with confirmation streak to avoid false positives:
          // A. Missing Face: requires 3 consecutive cycles (~2.4s)
          if (res.personCount === 0) {
            missingFaceStreakRef.current += 1;
            if (missingFaceStreakRef.current === 3) {
              registerViolationRef.current('FACE_MISSING', 'Face not detected in camera feed (candidate stepped away or looked away)');
            }
          } else {
            missingFaceStreakRef.current = 0;
          }

          // B. Multiple Faces: requires 2 consecutive cycles (~1.6s)
          if (res.personCount > 1) {
            multipleFaceStreakRef.current += 1;
            if (multipleFaceStreakRef.current === 2) {
              registerViolationRef.current('MULTIPLE_FACES', `Multiple people (${res.personCount}) detected in camera feed`);
            }
          } else {
            multipleFaceStreakRef.current = 0;
          }

          // C. Mobile Phone: requires 2 consecutive cycles
          if (res.phoneDetected) {
            phoneStreakRef.current += 1;
            if (phoneStreakRef.current === 2) {
              registerViolationRef.current('PHONE_DETECTED', 'Mobile phone detected in camera view');
            }
          } else {
            phoneStreakRef.current = 0;
          }

        }, 800);

      } catch (err) {
        console.warn('Camera initialization error:', err);
      }
    };

    startCameraAndAI();

    return () => {
      isMounted = false;
      stopAllMediaTracks();
    };
  }, [stopAllMediaTracks]);

  // Ensure video element receives stream whenever attempt loads and DOM mounts
  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [attempt, stream]);

  // 5. Timer logic
  useEffect(() => {
    if (!attempt) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(attempt.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining === 0 && !isSubmittingRef.current) {
        handleAutoSubmit();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [attempt]);

  // 6. Fullscreen lockdown & re-entry manager
  useEffect(() => {
    const checkIsFullscreen = () => {
      return !!(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement
      );
    };

    const initialFs = checkIsFullscreen();
    setIsFullscreen(initialFs);

    if (test?.settings?.fullscreenRequired && !isTouchDevice) {
      if (initialFs) {
        hasEnteredFullscreenRef.current = true;
        setShowFullscreenModal(false);
      } else {
        // Try auto requesting fullscreen; if blocked without user gesture, show modal cleanly
        enterFullscreenSafe().catch(() => {
          setShowFullscreenModal(true);
        });
      }
    }

    const handleFullscreenChange = () => {
      const current = checkIsFullscreen();
      setIsFullscreen(current);
      
      if (!test?.settings?.fullscreenRequired || isTouchDevice) return;

      if (current) {
        hasEnteredFullscreenRef.current = true;
        setShowFullscreenModal(false);
      } else if (!isSubmittingRef.current) {
        setShowFullscreenModal(true);
        // Only trigger violation if student was legitimately in fullscreen previously
        if (hasEnteredFullscreenRef.current) {
          registerViolationRef.current('FULLSCREEN_EXIT', 'Fullscreen mode was exited', 'critical');
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [test?.settings?.fullscreenRequired]);

  const handleReEnterFullscreen = async () => {
    await enterFullscreenSafe();
  };

  // 7. Answer Selection & Direct Online Sync
  const handleAnswerSelect = (option: 'A'|'B'|'C'|'D') => {
    if (!attempt || !questions[currentIdx]) return;
    
    const qId = questions[currentIdx].id;
    const newAnswers = {
      ...attempt.answers,
      [qId]: { ...attempt.answers[qId], selectedOption: option, status: 'answered' as const }
    };
    
    setAttempt({ ...attempt, answers: newAnswers });
    syncService.saveAnswerLocal(attempt.id, newAnswers);
    
    // Direct Online DB Sync
    const summary = calculateProctoringSummary(violationLogs);
    syncService.syncAnswerDirect(
      attempt.id,
      qId,
      option,
      'answered',
      violations,
      violationLogs,
      summary
    );
  };

  const handleMarkReview = () => {
    if (!attempt || !questions[currentIdx]) return;
    const qId = questions[currentIdx].id;
    const isCurrentlyMarked = attempt.answers[qId]?.status === 'marked';
    const newStatus = isCurrentlyMarked ? (attempt.answers[qId]?.selectedOption ? 'answered' : 'visited') : 'marked';
    
    const newAnswers = {
      ...attempt.answers,
      [qId]: { ...attempt.answers[qId], status: newStatus as any }
    };
    
    setAttempt({ ...attempt, answers: newAnswers });
    syncService.saveAnswerLocal(attempt.id, newAnswers);

    const summary = calculateProctoringSummary(violationLogs);
    syncService.syncAnswerDirect(
      attempt.id,
      qId,
      attempt.answers[qId]?.selectedOption || null,
      newStatus,
      violations,
      violationLogs,
      summary
    );
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
          syncService.saveAnswerLocal(attempt.id, newAnswers);
          
          const summary = calculateProctoringSummary(violationLogs);
          syncService.syncAnswerDirect(
            attempt.id,
            qId,
            null,
            'visited',
            violations,
            violationLogs,
            summary
          );
        }
      }
    }
  };

  // 8. Auto-submit & Normal Submit Flow
  const handleAutoSubmit = async (customLogs?: ViolationLog[], customViolations?: number) => {
    if (!attempt || isSubmittingRef.current) return;
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    stopAllMediaTracks();

    try {
      const logsToSave = customLogs || violationLogsRef.current;
      const countToSave = customViolations !== undefined ? customViolations : violationsRef.current;
      const summary = calculateProctoringSummary(logsToSave);

      await testService.submitAttempt(
        attempt.id,
        true,
        attempt.answers,
        countToSave,
        logsToSave,
        summary
      );

      syncService.clearLocalAttempt(attempt.id);
      await exitFullscreenSafe();
      navigate(`/student/results/${test?.id}`);
    } catch (e) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleSubmitClick = () => {
    if (!attempt || isSubmitting) return;
    setShowSubmitModal(true);
  };

  const handleConfirmFinalSubmit = async () => {
    if (!attempt || isSubmittingRef.current) return;
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    stopAllMediaTracks();

    try {
      const summary = calculateProctoringSummary(violationLogs);
      await testService.submitAttempt(
        attempt.id,
        false,
        attempt.answers,
        violations,
        violationLogs,
        summary
      );

      syncService.clearLocalAttempt(attempt.id);
      await exitFullscreenSafe();
      navigate(`/student/results/${test?.id}`);
    } catch (e) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleJumpToQuestionFromModal = (index: number) => {
    setShowSubmitModal(false);
    navigateQuestion(index);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!test || !attempt || questions.length === 0 || timeLeft === null) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-medium">Initializing secure assessment environment...</div>;
  }

  const currentQ = questions[currentIdx];
  const currentAnswer = attempt.answers[currentQ.id];

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col select-none relative overflow-hidden" ref={containerRef}>
      {/* Light Translucent Diagonal Watermark Overlay */}
      <svg 
        className="fixed inset-0 w-full h-full pointer-events-none select-none z-[15] opacity-[0.04] mix-blend-multiply" 
        aria-hidden="true"
      >
        <defs>
          <pattern 
            id="exam-diagonal-watermark" 
            width="220" 
            height="220" 
            patternUnits="userSpaceOnUse" 
            patternTransform="rotate(-30)"
          >
            <image 
              href={pLogoWatermark} 
              x="85" 
              y="60" 
              width="50" 
              height="84" 
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#exam-diagonal-watermark)" />
      </svg>

      {/* Top Bar */}
      <header className="h-14 sm:h-16 bg-slate-900 text-white flex items-center justify-between px-3 sm:px-6 shrink-0 shadow-md z-20">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <h1 className="font-bold tracking-tight text-sm sm:text-lg hidden sm:block truncate max-w-[200px] lg:max-w-none">{test.title}</h1>
          <Logo size="sm" variant="light" className="sm:hidden" />
          <span className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 rounded bg-blue-600/30 text-blue-400 border border-blue-500/30 font-mono shrink-0">
            {isTouchDevice ? 'Lite' : 'Proctored'}
          </span>
          
          {/* Fullscreen Button — hidden on mobile touch devices */}
          {!isTouchDevice && (
            test.settings.fullscreenRequired ? (
              <button
                type="button"
                onClick={handleReEnterFullscreen}
                className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  isFullscreen 
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 cursor-default' 
                    : 'bg-amber-950/70 text-amber-300 border-amber-500/50 hover:bg-amber-900/80 animate-pulse cursor-pointer'
                }`}
                title={isFullscreen ? 'Fullscreen Enforced & Active' : 'Click to enter fullscreen'}
              >
                <Maximize className="h-3 w-3" />
                <span className="hidden sm:inline">{isFullscreen ? 'Fullscreen Enforced' : 'Enter Fullscreen'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen Mode'}
              >
                {isFullscreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
                <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>
            )
          )}
        </div>
        
        <div className="flex items-center gap-2 sm:gap-6">
          {/* Mobile right panel toggle */}
          <button
            type="button"
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="lg:hidden flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            {showRightPanel ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{showRightPanel ? 'Hide Panel' : 'Palette'}</span>
          </button>

          <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full font-mono text-sm sm:text-lg font-bold
            ${timeLeft < 300 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-white'}`}>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            {formatTime(timeLeft)}
          </div>
          
          <Button 
            variant="primary" 
            className="bg-blue-600 hover:bg-blue-700 font-bold px-3 sm:px-6 shadow-md shadow-blue-600/30 text-xs sm:text-sm" 
            onClick={handleSubmitClick} 
            isLoading={isSubmitting}
          >
            <span className="hidden sm:inline">Submit Test</span>
            <span className="sm:hidden">Submit</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Question Area */}
        <div className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 sm:mb-6 pb-3 sm:pb-4 border-b gap-2">
              <div>
                <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Question {currentIdx + 1} of {questions.length}</span>
                <span className="ml-3 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{currentQ.category}</span>
              </div>
              <span className="text-sm font-medium text-slate-500">Marks: {currentQ.marks}</span>
            </div>

            <h2 className="text-base sm:text-xl font-medium text-slate-900 mb-4 sm:mb-8 whitespace-pre-wrap leading-relaxed">
              {currentQ.question}
            </h2>

            <div className="space-y-3 sm:space-y-4">
              {['A', 'B', 'C', 'D'].map((opt) => (
                <label 
                  key={opt} 
                  className={`flex items-center p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
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

          <div className="mt-auto p-3 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-0 shrink-0 sticky bottom-0">
            <Button 
              variant="outline" 
              onClick={() => navigateQuestion(currentIdx - 1)}
              disabled={currentIdx === 0 || (!test.settings.allowBackNavigation)}
              className="text-xs sm:text-sm"
            >
              <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" /> Previous
            </Button>

            <div className="flex gap-2 sm:gap-3">
              <Button variant="secondary" onClick={handleMarkReview} className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Bookmark className={`mr-1 sm:mr-2 h-4 w-4 ${currentAnswer?.status === 'marked' ? 'fill-current text-purple-600' : ''}`} /> 
                {currentAnswer?.status === 'marked' ? 'Unmark' : 'Review'}
              </Button>
              <Button onClick={() => navigateQuestion(currentIdx + 1)} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 font-bold text-xs sm:text-sm">
                {currentIdx === questions.length - 1 ? 'Save' : 'Next'} <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side: Palette + Live AI Proctoring Feed */}
        <div className={`${showRightPanel ? 'fixed inset-0 z-30 bg-black/40 lg:static lg:bg-transparent' : 'hidden lg:block'}`}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRightPanel(false); }}
        >
          <div className={`${showRightPanel ? 'absolute right-0 top-0 bottom-0 w-[300px] sm:w-80' : 'w-80'} bg-slate-50 shrink-0 flex flex-col overflow-y-auto border-l border-slate-200 h-full`}>
          <div className="p-5 space-y-6">
            {/* Live Camera & AI Detection Widget */}
            <ProctoringOverlay
              videoRef={videoRef}
              stream={stream}
              cameraActive={cameraActive}
              personCount={personCount}
              phoneDetected={phoneDetected}
              predictions={predictions}
              syncStatus={syncStatus}
              violations={violations}
              maxViolations={maxViolations}
              isAiReady={isAiReady}
              lastAnalysisTime={lastAnalysisTime}
            />

            {/* Question Palette */}
            {test.settings.enablePalette && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Question Palette</h3>
                
                <div className="grid grid-cols-5 gap-2 mb-6">
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
                        className={`h-9 w-9 rounded-lg border flex items-center justify-center text-xs font-bold transition-transform hover:scale-105 ${bgColor} ${currentIdx === idx ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-green-500 border border-green-600"></div>
                    Answered
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-red-500 border border-red-600"></div>
                    Not Answered
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-white border border-slate-300"></div>
                    Not Visited
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-purple-500 border border-purple-600"></div>
                    Marked
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Question Analysis & Confirmation Modal */}
      <SubmitAnalysisModal
        isOpen={showSubmitModal}
        isSubmitting={isSubmitting}
        testTitle={test.title}
        timeLeftFormatted={timeLeft !== null ? formatTime(timeLeft) : undefined}
        questions={questions}
        answers={attempt.answers}
        onConfirmSubmit={handleConfirmFinalSubmit}
        onCancel={() => setShowSubmitModal(false)}
        onJumpToQuestion={handleJumpToQuestionFromModal}
      />

      {/* Mandatory Fullscreen Blocker Overlay */}
      <FullscreenWarningModal
        isOpen={showFullscreenModal}
        violations={violations}
        maxViolations={maxViolations}
        onReEnterFullscreen={handleReEnterFullscreen}
      />
    </div>
  );
};
