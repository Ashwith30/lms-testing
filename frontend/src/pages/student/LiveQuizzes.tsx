import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, Lock, Unlock, Clock
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_QUIZZES = [
  {
    id: 'lq-1',
    title: 'Rapid Fire: Data Structures & Algorithms',
    host: 'Admin Trainer',
    participants: 28,
    status: 'LIVE',
    questionsCount: 15,
    timePerQuestion: '30s',
    category: 'Computer Science',
    locked: false,
  },
  {
    id: 'lq-2',
    title: 'Full Stack JavaScript Battle',
    host: 'Code Studio',
    participants: 42,
    status: 'STARTING SOON',
    startsIn: '5 mins',
    questionsCount: 20,
    timePerQuestion: '45s',
    category: 'Web Dev',
    locked: false,
  },
  {
    id: 'lq-3',
    title: 'Quantitative Aptitude Sprint',
    host: 'Placement Cell',
    participants: 19,
    status: 'SCHEDULED',
    startsIn: 'Today, 4:00 PM',
    questionsCount: 25,
    timePerQuestion: '60s',
    category: 'Aptitude',
    locked: false,
  },
];

export const LiveQuizzes = () => {
  const { user } = useAuth();
  const isAdminOrTrainer = user?.role === 'admin' || user?.role === 'trainer';

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [liveSessions, setLiveSessions] = useState(() => {
    const saved = localStorage.getItem('mock_quizzes_v3');
    if (saved) return JSON.parse(saved);
    return DEFAULT_QUIZZES;
  });

  useEffect(() => {
    localStorage.setItem('mock_quizzes_v3', JSON.stringify(liveSessions));
  }, [liveSessions]);

  const toggleLock = (id: string) => {
    setLiveSessions((prev: any[]) =>
      prev.map((session) => (session.id === id ? { ...session, locked: !session.locked } : session))
    );
  };

  const filteredSessions = useMemo(() => {
    let list = isAdminOrTrainer ? liveSessions : liveSessions.filter((s: any) => !s.locked);
    if (activeFilter === 'live') {
      list = list.filter((s: any) => s.status === 'LIVE');
    } else if (activeFilter === 'upcoming') {
      list = list.filter((s: any) => s.status !== 'LIVE');
    }
    return list;
  }, [liveSessions, activeFilter, isAdminOrTrainer]);

  return (
    <div className="space-y-6 animate-in pb-10">
      
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1d23]">
            Live Quizzes
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Compete in real-time speed rounds with your batchmates and test your placement readiness.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-center">
          {[
            { id: 'all', label: 'All' },
            { id: 'live', label: 'Live Now' },
            { id: 'upcoming', label: 'Upcoming' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sessions Grid ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-[#1a1d23]">Available Live Sessions</h2>
            <p className="text-xs text-slate-400">Join an ongoing round or register for upcoming cohort battles</p>
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500 font-medium text-sm">No live sessions available matching your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredSessions.map((session: any) => {
              const isLive = session.status === 'LIVE';

              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-xl border p-5 transition-all flex flex-col justify-between ${
                    session.locked
                      ? 'border-slate-200 bg-slate-50/50'
                      : 'border-[#e2e5ea] hover:border-blue-300 shadow-xs'
                  }`}
                >
                  <div>
                    {/* Top Row: Category + Status + Lock */}
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {session.category}
                      </span>

                      <div className="flex items-center gap-2">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            LIVE NOW
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {session.startsIn}
                          </span>
                        )}

                        {isAdminOrTrainer && (
                          <button
                            type="button"
                            onClick={() => toggleLock(session.id)}
                            className={`p-1 rounded border transition-all cursor-pointer ${
                              session.locked
                                ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                            title={session.locked ? 'Click to unlock' : 'Click to lock'}
                          >
                            {session.locked ? <Lock className="w-3.5 h-3.5 text-rose-600" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title & Host */}
                    <div className="mb-4">
                      <h3 className="font-bold text-[#1a1d23] text-sm leading-snug">{session.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Hosted by <span className="font-medium text-slate-600">{session.host}</span>
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-[#f8fafc] border border-slate-200/80 rounded-lg text-center mb-5">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Questions</span>
                        <span className="text-xs font-bold text-[#1a1d23] mt-0.5 block">{session.questionsCount}</span>
                      </div>
                      <div className="border-x border-slate-200">
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Time / Q</span>
                        <span className="text-xs font-bold text-[#1a1d23] mt-0.5 block">{session.timePerQuestion}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Players</span>
                        <span className="text-xs font-bold text-[#1a1d23] mt-0.5 block">{session.participants}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    {session.locked ? (
                      <Button className="w-full text-xs font-semibold py-2 bg-slate-100 text-slate-700 cursor-not-allowed border border-slate-300 shadow-none" disabled>
                        <Lock className="w-3.5 h-3.5 mr-1 text-slate-600" /> Locked
                      </Button>
                    ) : isLive ? (
                      <Button className="w-full text-xs font-semibold py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        <Play className="w-3.5 h-3.5 mr-1 fill-current" /> Enter Live Quiz
                      </Button>
                    ) : (
                      <Button className="w-full text-xs font-semibold py-2 bg-slate-100 text-slate-700 cursor-not-allowed border border-slate-300 shadow-none" disabled>
                        <Lock className="w-3.5 h-3.5 mr-1 text-slate-600" /> Locked
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
