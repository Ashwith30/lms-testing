import React, { useState } from 'react';
import { Radio, Zap, Clock, Users, Play, Calendar, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const LiveQuizzes = () => {
  const [joinCode, setJoinCode] = useState('');

  const liveSessions = [
    {
      id: 'lq-1',
      title: 'Rapid Fire: Data Structures & Algorithms',
      host: 'Admin Trainer',
      participants: 28,
      status: 'LIVE',
      questionsCount: 15,
      timePerQuestion: '30s',
      category: 'Computer Science',
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
    },
  ];

  return (
    <div className="space-y-6 animate-in pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1d23]">Live Quizzes</h1>
        <p className="text-[#9099a8] text-sm mt-0.5">
          Compete in real-time speed rounds with your batchmates and test your placement readiness.
        </p>
      </div>

      {/* Join PIN Banner - Styled with Phonetic Brand Palette */}
      <div className="bg-white rounded-xl border border-[#e2e5ea] p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <Radio className="h-3 w-3 text-blue-600 animate-pulse" />
            Live Quiz Arena
          </div>
          <h2 className="text-base font-bold text-[#1a1d23]">Have a Room PIN?</h2>
          <p className="text-xs text-[#5a6170]">
            Enter the 6-digit access code shared by your instructor to instantly enter the live lobby.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Enter 6-digit PIN..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full md:w-48 px-3.5 py-2 text-xs font-mono tracking-widest uppercase bg-[#f7f8fa] border border-[#e2e5ea] rounded-lg text-[#1a1d23] placeholder:text-[#9099a8] focus:outline-none focus:border-blue-500"
          />
          <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 whitespace-nowrap shadow-xs">
            <Zap className="h-3.5 w-3.5 mr-1" />
            Join Room
          </Button>
        </div>
      </div>

      {/* Available Live Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-[#1a1d23]">Available Live Sessions</h2>
            <p className="text-xs text-[#9099a8]">Join an ongoing round or register for upcoming cohort battles</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {liveSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-xl border border-[#e2e5ea] p-5 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Category & Status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {session.category}
                  </span>
                  {session.status === 'LIVE' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping"></span>
                      LIVE NOW
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-[#5a6170] bg-[#f0f2f5] px-2 py-0.5 rounded">
                      {session.startsIn}
                    </span>
                  )}
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
                  session.status === 'LIVE'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    : 'bg-white hover:bg-[#f0f2f5] text-[#5a6170] hover:text-[#1a1d23] border border-[#e2e5ea]'
                }`}
                size="sm"
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                {session.status === 'LIVE' ? 'Enter Quiz Lobby' : 'Register'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
