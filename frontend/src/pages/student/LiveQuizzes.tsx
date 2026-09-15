import React, { useState, useEffect } from 'react';
import { Play, Lock, Unlock } from 'lucide-react';
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
    locked: true,
  },
];

export const LiveQuizzes = () => {
  const { user } = useAuth();
  const isAdminOrTrainer = user?.role === 'admin' || user?.role === 'trainer';

  const [liveSessions, setLiveSessions] = useState(() => {
    const saved = localStorage.getItem('mock_quizzes');
    if (saved) return JSON.parse(saved);
    return DEFAULT_QUIZZES;
  });

  useEffect(() => {
    localStorage.setItem('mock_quizzes', JSON.stringify(liveSessions));
  }, [liveSessions]);

  const toggleLock = (id: string) => {
    setLiveSessions((prev: any[]) =>
      prev.map((session) => (session.id === id ? { ...session, locked: !session.locked } : session))
    );
  };

  const visibleSessions = isAdminOrTrainer ? liveSessions : liveSessions.filter((s: any) => !s.locked);

  return (
    <div className="space-y-6 animate-in pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1d23]">Live Quizzes</h1>
        <p className="text-[#9099a8] text-sm mt-0.5">
          Compete in real-time speed rounds with your batchmates and test your placement readiness.
        </p>
      </div>

      {/* Available Live Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-[#1a1d23]">Available Live Sessions</h2>
            <p className="text-xs text-[#9099a8]">Join an ongoing round or register for upcoming cohort battles</p>
          </div>
        </div>

        {visibleSessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500 font-medium">No quizzes available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visibleSessions.map((session: any) => (
              <div
                key={session.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${session.locked ? 'border-rose-200 bg-rose-50/30' : 'border-[#e2e5ea] hover:border-blue-200'}`}
              >
                <div>
                  {/* Category & Status */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {session.category}
                    </span>
                    <div className="flex items-center gap-2">
                      {isAdminOrTrainer && (
                        <select 
                          value={session.locked ? "locked" : "unlocked"}
                          onChange={() => toggleLock(session.id)}
                          className={`text-sm font-semibold border rounded-md px-2 py-1 outline-none cursor-pointer ${session.locked ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                        >
                          <option value="unlocked">Unlocked</option>
                          <option value="locked">Locked</option>
                        </select>
                      )}
                      {session.status === 'LIVE' ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                          LIVE NOW
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-[#5a6170] bg-[#f0f2f5] px-2 py-0.5 rounded">
                          {session.startsIn}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Session Title & Host */}
                  <h3 className="font-bold text-[#1a1d23] text-sm leading-snug mb-1">
                    {session.title}
                  </h3>
                  <p className="text-xs text-[#9099a8] mb-4">Hosted by {session.host}</p>

                  {/* Specs Box */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-[#f7f8fa] border border-[#eef0f3] rounded-lg text-center mb-5">
                    <div>
                      <span className="block text-[10px] text-[#9099a8] uppercase font-semibold">Q's</span>
                      <span className="text-xs font-bold text-[#1a1d23]">{session.questionsCount}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#9099a8] uppercase font-semibold">Time/Q</span>
                      <span className="text-xs font-bold text-[#1a1d23]">{session.timePerQuestion}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#9099a8] uppercase font-semibold">Players</span>
                      <span className="text-xs font-bold text-[#1a1d23]">{session.participants}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  className={`w-full text-xs font-medium ${
                    session.locked 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border-none'
                      : session.status === 'LIVE'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        : 'bg-white hover:bg-[#f0f2f5] text-[#5a6170] hover:text-[#1a1d23] border border-[#e2e5ea]'
                  }`}
                  size="sm"
                  disabled={session.locked}
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  {session.locked ? 'Locked by Admin' : session.status === 'LIVE' ? 'Enter Quiz Lobby' : 'Register'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
