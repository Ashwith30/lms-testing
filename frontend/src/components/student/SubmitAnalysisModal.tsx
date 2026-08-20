import React from 'react';
import { 
  Send, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Bookmark, 
  X, 
  ListChecks, 
  Clock 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Question, AnswerRecord } from '../../types';

interface SubmitAnalysisModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  testTitle?: string;
  timeLeftFormatted?: string;
  questions: Question[];
  answers: Record<string, AnswerRecord>;
  onConfirmSubmit: () => void;
  onCancel: () => void;
  onJumpToQuestion: (index: number) => void;
}

export const SubmitAnalysisModal: React.FC<SubmitAnalysisModalProps> = ({
  isOpen,
  isSubmitting,
  testTitle,
  timeLeftFormatted,
  questions,
  answers,
  onConfirmSubmit,
  onCancel,
  onJumpToQuestion
}) => {
  if (!isOpen) return null;

  const totalQuestions = questions.length;

  let attemptedCount = 0;
  let unattemptedCount = 0;
  let markedCount = 0;
  let answeredAndMarkedCount = 0;

  questions.forEach((q) => {
    const ans = answers[q.id];
    const isAnswered = ans && ans.selectedOption !== null && ans.selectedOption !== undefined;
    const isMarked = ans?.status === 'marked';

    if (isAnswered) {
      attemptedCount++;
      if (isMarked) answeredAndMarkedCount++;
    } else {
      unattemptedCount++;
    }

    if (isMarked) {
      markedCount++;
    }
  });

  const attemptedPercentage = totalQuestions > 0 ? Math.round((attemptedCount / totalQuestions) * 100) : 0;
  const hasUnattempted = unattemptedCount > 0;
  const hasMarked = markedCount > 0;

  return (
    <div className="fixed inset-0 z-[99990] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Assessment Submission Summary</h2>
              <p className="text-xs text-slate-400">{testTitle || 'Final Exam'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {timeLeftFormatted && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                <span>{timeLeftFormatted} left</span>
              </div>
            )}
            <button 
              onClick={onCancel}
              disabled={isSubmitting}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Close and return to test"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Questions</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalQuestions}</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Attempted</p>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {attemptedCount}
                <span className="text-xs font-normal text-emerald-600 ml-1">({attemptedPercentage}%)</span>
              </p>
            </div>

            <div className={`rounded-xl p-3.5 text-center border ${hasUnattempted ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-center gap-1">
                <HelpCircle className={`h-3.5 w-3.5 ${hasUnattempted ? 'text-amber-600' : 'text-slate-400'}`} />
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${hasUnattempted ? 'text-amber-700' : 'text-slate-500'}`}>
                  Unattempted
                </p>
              </div>
              <p className={`text-2xl font-black mt-1 ${hasUnattempted ? 'text-amber-800' : 'text-slate-700'}`}>
                {unattemptedCount}
              </p>
            </div>

            <div className={`rounded-xl p-3.5 text-center border ${hasMarked ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-center gap-1">
                <Bookmark className={`h-3.5 w-3.5 ${hasMarked ? 'text-purple-600 fill-purple-600' : 'text-slate-400'}`} />
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${hasMarked ? 'text-purple-700' : 'text-slate-500'}`}>
                  For Review
                </p>
              </div>
              <p className={`text-2xl font-black mt-1 ${hasMarked ? 'text-purple-800' : 'text-slate-700'}`}>
                {markedCount}
              </p>
            </div>
          </div>

          {/* Contextual Advisory Banner */}
          {hasUnattempted || hasMarked ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-950">Review Before Finalizing</p>
                <p className="leading-relaxed text-amber-800">
                  {hasUnattempted && hasMarked ? (
                    <>You have <strong>{unattemptedCount} unattempted</strong> question(s) and <strong>{markedCount} question(s) marked for review</strong>. Click on any question below to review or answer before submitting.</>
                  ) : hasUnattempted ? (
                    <>You have <strong>{unattemptedCount} unattempted</strong> question(s). Click on any unattempted question below to answer it before submitting.</>
                  ) : (
                    <>You have <strong>{markedCount} question(s) marked for review</strong>. Make sure you are satisfied with your selected choices.</>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-900 text-xs">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="leading-relaxed">
                <strong>All {totalQuestions} questions have been answered!</strong> You can review any question below or proceed with final submission.
              </p>
            </div>
          )}

          {/* Interactive Question Status Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Question Matrix</h3>
              <span className="text-[11px] text-slate-500">Click any question number to jump to it</span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered = ans && ans.selectedOption !== null && ans.selectedOption !== undefined;
                const isMarked = ans?.status === 'marked';

                let badgeStyle = 'bg-white border-slate-300 text-slate-700 hover:border-slate-400';
                let statusLabel = 'Unattempted';

                if (isMarked) {
                  badgeStyle = isAnswered 
                    ? 'bg-purple-100 border-purple-400 text-purple-900 font-bold hover:bg-purple-200'
                    : 'bg-purple-50 border-purple-300 text-purple-700 font-bold hover:bg-purple-100';
                  statusLabel = isAnswered ? 'Answered & Marked' : 'Marked for Review';
                } else if (isAnswered) {
                  badgeStyle = 'bg-emerald-600 border-emerald-700 text-white font-bold hover:bg-emerald-700 shadow-sm';
                  statusLabel = 'Answered';
                } else if (ans?.status === 'visited') {
                  badgeStyle = 'bg-rose-50 border-rose-300 text-rose-700 font-medium hover:bg-rose-100';
                  statusLabel = 'Visited (Unanswered)';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onJumpToQuestion(idx)}
                    title={`Question ${idx + 1}: ${statusLabel} (Click to jump)`}
                    className={`relative h-10 rounded-lg border text-xs flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ${badgeStyle}`}
                  >
                    <span>{idx + 1}</span>
                    {isMarked && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-purple-600 rounded-full flex items-center justify-center">
                        <Bookmark className="h-2 w-2 text-white fill-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Matrix Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-slate-600 pt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-600 border border-emerald-700"></div>
                <span>Answered ({attemptedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-rose-50 border border-rose-300"></div>
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-white border border-slate-300"></div>
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-purple-50 border border-purple-300 flex items-center justify-center">
                  <Bookmark className="h-2 w-2 text-purple-600 fill-purple-600" />
                </div>
                <span>Marked for Review ({markedCount})</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto font-medium border-slate-300 hover:bg-slate-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Test
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onConfirmSubmit}
            isLoading={isSubmitting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 font-bold px-7 shadow-lg shadow-blue-600/20"
          >
            <Send className="mr-2 h-4 w-4" />
            Confirm & Submit Exam
          </Button>
        </div>

      </div>
    </div>
  );
};
