import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, Lock, Unlock 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Import 4 game thumbnails directly cropped from the reference picture
import thumbCodingDebugging from '../../assets/games/game_coding_debugging.png';
import thumbCsFundamentals from '../../assets/games/game_cs_fundamentals.png';
import thumbAlgorithms from '../../assets/games/game_algorithms.png';
import thumbDatabases from '../../assets/games/game_databases.png';

export interface GameItem {
  id: string;
  title: string;
  thumbnail: string;
  locked: boolean;
}

export const FOUR_GAMES: GameItem[] = [
  {
    id: 'game-1',
    title: 'Coding & Debugging',
    thumbnail: thumbCodingDebugging,
    locked: false,
  },
  {
    id: 'game-2',
    title: 'CS Fundamentals',
    thumbnail: thumbCsFundamentals,
    locked: false,
  },
  {
    id: 'game-3',
    title: 'Algorithms',
    thumbnail: thumbAlgorithms,
    locked: false,
  },
  {
    id: 'game-4',
    title: 'Databases',
    thumbnail: thumbDatabases,
    locked: false,
  },
];

export const Games = () => {
  const { user } = useAuth();
  const isAdminOrTrainer = user?.role === 'admin' || user?.role === 'trainer' || user?.role === 'institution';

  const [games, setGames] = useState<GameItem[]>(() => {
    try {
      const saved = localStorage.getItem('mock_games_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === FOUR_GAMES.length) {
          return parsed.map((item: GameItem) => {
            const match = FOUR_GAMES.find(g => g.id === item.id);
            return {
              ...item,
              title: match?.title || item.title,
              thumbnail: match?.thumbnail || item.thumbnail,
            };
          });
        }
      }
    } catch {
      // ignore
    }
    return FOUR_GAMES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('mock_games_v4', JSON.stringify(games));
    } catch {
      // ignore
    }
  }, [games]);

  const toggleLock = (id: string) => {
    setGames((prev) =>
      prev.map((game) => (game.id === id ? { ...game, locked: !game.locked } : game))
    );
  };

  const visibleGames = isAdminOrTrainer ? games : games.filter((g) => !g.locked);

  return (
    <div className="space-y-6 animate-in pb-16 font-sans text-slate-900">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Practice & Skill Games</h1>
        <p className="text-slate-500 text-sm mt-1">
          Master engineering concepts, boost placement speed, and earn performance XP through interactive mini-games.
        </p>
      </div>

      {/* Available Mini-Games Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Available Mini-Games</h2>
            <p className="text-xs text-slate-500 mt-0.5">Play solo or challenge cohort friends to beat your high score</p>
          </div>
        </div>

        {visibleGames.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Gamepad2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">No games available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-5">
            {visibleGames.slice(0, 4).map((g) => (
              <div
                key={g.id}
                className="group relative rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer border border-slate-200/80 hover:border-slate-300 bg-white"
              >
                {/* Thumbnail card image only - exactly matching reference picture */}
                <img
                  src={g.thumbnail}
                  alt={g.title}
                  className="w-full h-auto aspect-[245/215] object-cover group-hover:scale-[1.02] transition-transform duration-300 block"
                  loading="eager"
                />

                {/* Locked overlay */}
                {g.locked && (
                  <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                )}

                {/* Admin lock toggle */}
                {isAdminOrTrainer && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLock(g.id);
                    }}
                    className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all cursor-pointer"
                    title={g.locked ? 'Unlock' : 'Lock'}
                  >
                    {g.locked ? <Lock className="w-3.5 h-3.5 text-rose-300" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
