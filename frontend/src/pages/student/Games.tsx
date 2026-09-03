import React from 'react';
import { Gamepad2, Trophy, Flame, Play, Sparkles, Code, Cpu, Database, Binary } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const Games = () => {
  const games = [
    {
      id: 'game-1',
      title: 'Code Sprint: Bug Hunter',
      description: 'Identify and fix syntax and logic bugs before the countdown expires.',
      difficulty: 'Medium',
      category: 'Coding & Debugging',
      badge: 'XP Boost',
      playsCount: '1.2k plays',
      icon: Code,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      id: 'game-2',
      title: 'Memory Stack: OS & Networks',
      description: 'Match concepts, protocols, and architecture models in record time.',
      difficulty: 'Easy',
      category: 'CS Fundamentals',
      badge: 'Popular',
      playsCount: '890 plays',
      icon: Cpu,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'game-3',
      title: 'Algorithm Duel: Speed Run',
      description: 'Choose the optimal time complexity and data structure for dynamic problem prompts.',
      difficulty: 'Hard',
      category: 'Algorithms',
      badge: 'Pro Tier',
      playsCount: '2.4k plays',
      icon: Binary,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      id: 'game-4',
      title: 'SQL Query Builder Rush',
      description: 'Assemble JOINs, GROUP BYs, and aggregations under pressure to solve business analytics queries.',
      difficulty: 'Medium',
      category: 'Databases',
      badge: 'New',
      playsCount: '540 plays',
      icon: Database,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6 animate-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1d23]">Practice & Skill Games</h1>
        <p className="text-[#9099a8] text-sm mt-0.5">
          Master engineering concepts, boost placement speed, and earn performance XP through interactive mini-games.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1a1d23]">Interactive Skill Drills</h2>
            <p className="text-xs text-[#9099a8]">Complete daily challenges to level up your aptitude & coding readiness</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f7f8fa] border border-[#e2e5ea] text-xs font-semibold text-slate-700">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>Rank: #4 in CSE</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
            <Flame className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span>5-Day Streak</span>
          </div>
        </div>
      </div>

      {/* Available Mini-Games */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-[#1a1d23]">Available Mini-Games</h2>
            <p className="text-xs text-[#9099a8]">Play solo or challenge cohort friends to beat your high score</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.id}
                className="bg-white rounded-xl border border-[#e2e5ea] p-5 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {g.category}
                    </span>
                    <span className="text-[11px] font-medium text-[#9099a8]">
                      {g.playsCount}
                    </span>
                  </div>

                  <div className="flex items-start gap-3 mb-2">
                    <div className={`h-9 w-9 rounded-lg ${g.iconBg} ${g.iconColor} flex items-center justify-center flex-shrink-0 font-bold`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a1d23] text-sm leading-snug">
                        {g.title}
                      </h3>
                      <p className="text-xs text-[#5a6170] mt-1 leading-relaxed">
                        {g.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#f0f2f5] mt-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wider ${
                    g.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    g.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {g.difficulty.toUpperCase()}
                  </span>

                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4">
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Play Now
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
