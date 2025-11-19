
import React, { useState, useEffect, useCallback } from 'react';
import ScoreBoard from './components/ScoreBoard';
import GameBoard from './components/GameBoard';
import { useGameLogic } from './hooks/useGameLogic';
import { LeaderboardEntry } from './types';

// --- CONFIGURATION FOR GLOBAL LEADERBOARD ---
// Since Vercel is read-only, we cannot write to a local JSON file.
// We use JSONBin.io to store the leaderboard globally.
// 1. Go to jsonbin.io and create a new bin.
// 2. In the JSON editor, you can paste this to start (avoids "Bin cannot be blank"):
//    { "users": [] }
// 3. Paste your Bin ID and X-Master-Key below.
// If these are empty, the game automatically uses localStorage (offline mode).
const JSONBIN_BIN_ID = ''; // e.g., '67b8e...'
const JSONBIN_API_KEY = ''; // e.g., '$2a$10$...'

const LOCAL_STORAGE_KEY = 'pongXtremeLeaderboard';

// --- LEADERBOARD SERVICE ---
const LeaderboardService = {
  // Helper to check if cloud config is valid
  isCloudConfigured() {
    return JSONBIN_BIN_ID.trim().length > 0 && JSONBIN_API_KEY.trim().length > 0;
  },

  // Helper to construct URL only when needed
  getUrl() {
    return `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID.trim()}`;
  },

  async get(): Promise<LeaderboardEntry[]> {
    // Cloud Mode
    if (this.isCloudConfigured()) {
      try {
        const response = await fetch(this.getUrl(), {
          headers: {
            'X-Master-Key': JSONBIN_API_KEY.trim(),
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error(`Cloud fetch failed: ${response.statusText}`);
        const data = await response.json();
        
        // ROBUST PARSING:
        // 1. Check if 'record' is directly an array.
        // 2. Check if 'record' has a 'users' property (like the user's placeholder).
        // 3. Fallback to empty array.
        let rawList: any[] = [];
        if (Array.isArray(data.record)) {
            rawList = data.record;
        } else if (data.record && Array.isArray(data.record.users)) {
            rawList = data.record.users;
        }

        // VALIDATION:
        // Filter out entries that don't match our game schema (e.g. missing score/name)
        // This prevents the app from crashing if the JSON contains "wins"/"loose" format.
        return rawList.filter((item: any) => 
            typeof item === 'object' && 
            typeof item.name === 'string' && 
            typeof item.score === 'number'
        );

      } catch (error) {
        console.warn("Cloud fetch error, falling back to local:", error);
        // Fallback to local on error to show something
        return this.getLocal();
      }
    }
    // Local Mode
    return this.getLocal();
  },

  async save(newEntry: LeaderboardEntry): Promise<LeaderboardEntry[]> {
    // 1. Get latest data first (to avoid overwrites in simple concurrency)
    const currentList = await this.get();
    
    // 2. Process List
    const updatedList = [...currentList, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // 3. Save Cloud
    if (this.isCloudConfigured()) {
      try {
        await fetch(this.getUrl(), {
          method: 'PUT',
          headers: {
            'X-Master-Key': JSONBIN_API_KEY.trim(),
            'Content-Type': 'application/json'
          },
          // We save as a clean array, overwriting any previous object structure
          // This self-corrects the "users" object wrapper on the first save.
          body: JSON.stringify(updatedList)
        });
      } catch (error) {
        console.error("Cloud save error:", error);
        // Save local as backup
        this.saveLocal(updatedList);
      }
    } else {
        // Save Local
        this.saveLocal(updatedList);
    }
    
    return updatedList;
  },

  getLocal(): LeaderboardEntry[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Local storage error", e);
      return [];
    }
  },

  saveLocal(list: LeaderboardEntry[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Local storage save error", e);
    }
  }
};

const App: React.FC = () => {
  const { gameState, startGame } = useGameLogic();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load leaderboard
  const loadLeaderboard = useCallback(async () => {
    if (LeaderboardService.isCloudConfigured()) {
        setIsLoadingLeaderboard(true);
        const data = await LeaderboardService.get();
        setLeaderboard(data);
        setIsLoadingLeaderboard(false);
    } else {
        // Local load is instant, no spinner needed
        setLeaderboard(LeaderboardService.get());
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Refresh leaderboard when opening it
  useEffect(() => {
      if (showLeaderboard) {
          loadLeaderboard();
      }
  }, [showLeaderboard, loadLeaderboard]);

  // Reset submission state when a new game starts
  useEffect(() => {
    if (gameState.isGameActive) {
      setScoreSubmitted(false);
      setPlayerName('');
    }
  }, [gameState.isGameActive]);

  const calculateScore = () => {
    const winnerScore = gameState.winner === 'Player 1' ? gameState.score.player1 : gameState.score.player2;
    const loserScore = gameState.winner === 'Player 1' ? gameState.score.player2 : gameState.score.player1;
    const diff = winnerScore - loserScore;
    
    let points = diff * 100;
    
    // Hardcore multiplier (x2)
    if (gameState.mode === 'hardcore') {
      points *= 2;
    }
    
    // Masacre bonus
    if (gameState.isMasacre) {
      points += 1000;
    }
    
    return points;
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const points = calculateScore();
    
    const newEntry: LeaderboardEntry = {
      name: playerName.toUpperCase().substring(0, 10), // Limit name length
      score: points,
      mode: gameState.mode,
      isMasacre: gameState.isMasacre,
      date: new Date().toLocaleDateString()
    };

    // Save via service (handles cloud or local)
    const updatedList = await LeaderboardService.save(newEntry);
    setLeaderboard(updatedList);
    
    setScoreSubmitted(true);
    setIsSubmitting(false);
    setShowLeaderboard(true);
  };

  const finalScore = calculateScore();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-mono">
      <header className="text-center mb-4 relative w-full max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-red-400 cursor-pointer" onClick={() => setShowLeaderboard(false)}>
          PONG XTREME
        </h1>
        <p className="text-gray-400 mt-2">A classic with a chaotic twist.</p>
        
        {!gameState.isGameActive && !gameState.winner && (
           <button 
             onClick={() => setShowLeaderboard(!showLeaderboard)}
             className="absolute right-0 top-2 text-xs md:text-sm border border-yellow-500 text-yellow-400 px-3 py-1 rounded hover:bg-yellow-500 hover:text-black transition-colors flex items-center gap-2"
           >
             🏆 RANKING
           </button>
        )}
      </header>
      
      <ScoreBoard score={gameState.score} />

      <div className="relative">
        <GameBoard gameState={gameState} />
        
        {/* Leaderboard Overlay */}
        {showLeaderboard && !gameState.isGameActive && (
            <div className="absolute inset-0 bg-gray-900 z-50 flex flex-col items-center p-6 overflow-y-auto border-4 border-yellow-600 rounded-lg shadow-2xl">
                <h2 className="text-4xl font-bold text-yellow-400 mb-2 uppercase tracking-widest border-b-4 border-yellow-500 pb-2" style={{ fontFamily: '"Bangers", system-ui' }}>
                    HALL OF FAME
                </h2>
                <p className="text-xs text-gray-500 mb-4 uppercase tracking-wide">
                    {LeaderboardService.isCloudConfigured() ? 'Global Ranking' : 'Local Ranking'}
                </p>
                
                {isLoadingLeaderboard ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="text-yellow-400 animate-pulse text-xl">LOADING SCORES...</div>
                    </div>
                ) : leaderboard.length === 0 ? (
                    <p className="text-gray-500 mt-10">No records yet. Be the first!</p>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-700">
                                <th className="p-2">RANK</th>
                                <th className="p-2">PLAYER</th>
                                <th className="p-2 text-right">SCORE</th>
                                <th className="p-2 text-center">MODE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((entry, idx) => (
                                <tr key={idx} className={`border-b border-gray-800 hover:bg-gray-800 transition-colors ${idx === 0 ? 'text-yellow-300 font-bold' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-gray-400'}`}>
                                    <td className="p-2 pl-4">{idx + 1}</td>
                                    <td className="p-2">{entry.name}</td>
                                    <td className="p-2 text-right font-mono">{entry.score}</td>
                                    <td className="p-2 text-center">
                                        <span className={`text-xs px-2 py-1 rounded ${entry.mode === 'hardcore' ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'}`}>
                                            {entry.mode === 'hardcore' ? 'HC' : 'CL'}
                                        </span>
                                        {entry.isMasacre && <span className="ml-1 text-xs text-red-500 font-bold">☠️</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                
                <button 
                    onClick={() => setShowLeaderboard(false)}
                    className="mt-auto mb-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-bold uppercase"
                >
                    Close
                </button>
            </div>
        )}

        {(!gameState.isGameActive || gameState.winner) && !showLeaderboard && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center p-4 z-40">
            {gameState.winner ? (
              <>
                {gameState.isMasacre ? (
                   <div className="mb-4 animate-pulse">
                      <h2 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 via-orange-500 to-red-600 drop-shadow-2xl" style={{ fontFamily: '"Bangers", system-ui' }}>
                        MASACRE!
                      </h2>
                      <p className="text-3xl text-red-500 font-bold mt-2 uppercase tracking-widest">Perfection</p>
                   </div>
                ) : (
                   <h2 className="text-5xl font-bold text-yellow-400 mb-4" style={{ fontFamily: '"Bangers", system-ui', letterSpacing: '2px' }}>GAME OVER</h2>
                )}
                <p className="text-6xl mb-4 text-transparent bg-clip-text bg-gradient-to-t from-gray-300 to-white drop-shadow-lg uppercase" style={{ fontFamily: '"Bangers", system-ui' }}>
                    {gameState.winner} wins!
                </p>

                {!scoreSubmitted ? (
                    <div className="bg-gray-800 p-6 rounded-lg border-2 border-blue-500 shadow-2xl mb-6 animate-fade-in-up">
                        <h3 className="text-xl text-blue-300 mb-2 uppercase font-bold">New High Score: <span className="text-white">{finalScore}</span></h3>
                        <p className="text-xs text-gray-400 mb-4">Enter your name for the Hall of Fame</p>
                        <form onSubmit={handleSubmitScore} className="flex flex-col gap-3">
                            <input 
                                type="text" 
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="AAA"
                                maxLength={10}
                                className="bg-gray-900 text-center text-2xl text-white border border-gray-600 rounded p-2 uppercase tracking-widest focus:outline-none focus:border-blue-400"
                                autoFocus
                            />
                            <button 
                                type="submit"
                                disabled={!playerName.trim() || isSubmitting}
                                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded uppercase transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? 'Saving...' : 'Submit Score'}
                            </button>
                        </form>
                    </div>
                ) : (
                   <div className="mb-8 text-green-400 font-bold text-xl animate-pulse">SCORE SAVED!</div> 
                )}
                
                <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => startGame('classic')}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg rounded-lg shadow-lg transition-transform transform hover:scale-105"
                    >
                      Play Classic
                    </button>
                    <button
                      onClick={() => startGame('hardcore')}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg shadow-lg transition-transform transform hover:scale-105 border-2 border-orange-500"
                    >
                      🔥 Hardcore
                    </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-4">Controls</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-lg">
                  <p className="text-blue-400 font-semibold">Player 1:</p>
                  <p className="text-gray-200">'W' (Up) & 'S' (Down)</p>
                  <p className="text-red-400 font-semibold">Player 2:</p>
                  <p className="text-gray-200">'↑' (Up) & '↓' (Down)</p>
                </div>
                 <p className="text-sm mt-6 text-gray-400 max-w-md">
                   First to 5 (win by 2).<br/>
                   <strong>Space/Enter</strong> to Pause.
                 </p>
                 
                 <div className="mt-8 flex gap-4 justify-center">
                    <button
                      onClick={() => startGame('classic')}
                      className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl rounded-lg shadow-lg transition-transform transform hover:scale-105"
                    >
                      Classic Mode
                    </button>
                    <button
                      onClick={() => startGame('hardcore')}
                      className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xl rounded-lg shadow-lg transition-transform transform hover:scale-105 border-2 border-yellow-500"
                    >
                      🔥 Hardcore
                    </button>
                 </div>
                 <p className="text-xs text-gray-500 mt-2">Hardcore: Faster speed, constant chaos.</p>
              </>
            )}
          </div>
        )}
      </div>
      <footer className="mt-6 text-gray-500 text-sm">
        Built with React, TypeScript, and Tailwind CSS.
      </footer>
    </div>
  );
};

export default App;
