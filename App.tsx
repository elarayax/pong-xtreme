
import React, { useState, useEffect, useCallback } from 'react';
import ScoreBoard from './components/ScoreBoard';
import GameBoard from './components/GameBoard';
import { useGameLogic } from './hooks/useGameLogic';
import { LeaderboardEntry, GameMode } from './types';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

// --- CONFIGURATION FOR GLOBAL LEADERBOARD ---
// SECURITY UPDATE: We now use Environment Variables.
// 1. In Vercel (Settings -> Environment Variables), add:
//    REACT_APP_JSONBIN_BIN_ID
//    REACT_APP_JSONBIN_API_KEY
// 2. Locally, create a .env file with these keys.
// 
// NOTE: If these are missing, the game gracefully falls back to LocalStorage.

const JSONBIN_BIN_ID = process.env.REACT_APP_JSONBIN_BIN_ID || '';
const JSONBIN_API_KEY = process.env.REACT_APP_JSONBIN_API_KEY || '';

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
        
        let rawList: any[] = [];
        
        // ROBUST PARSING STRATEGY
        if (Array.isArray(data.record)) {
            // Case 1: Root array
            rawList = data.record;
        } else if (data.record && Array.isArray(data.record.users)) {
            // Case 2: Wrapped in 'users' (User's custom structure)
            // We need to map 'user' field to 'name' if 'name' is missing
            rawList = data.record.users.map((u: any) => ({
                ...u,
                name: u.name || u.user || 'Unknown', // Map 'user' to 'name'
                score: u.score || (u.wins ? u.wins * 100 : 0) // Fallback score if using custom structure
            }));
        }

        // VALIDATION & SANITIZATION
        const cleanData = rawList.filter((item: any) => 
            typeof item === 'object' && 
            item !== null &&
            (typeof item.name === 'string' || typeof item.user === 'string') && 
            typeof item.score === 'number'
        ).map((item: any) => ({
            // Normalize data structure
            name: item.name || item.user,
            score: item.score,
            mode: item.mode || 'classic',
            isMasacre: !!item.isMasacre,
            date: item.date || new Date().toLocaleDateString()
        }));

        return cleanData;

      } catch (error) {
        console.warn("Cloud fetch error, falling back to local:", error);
        return this.getLocal();
      }
    }
    // Local Mode
    return this.getLocal();
  },

  async save(newEntry: LeaderboardEntry): Promise<LeaderboardEntry[]> {
    // 1. Get latest data first
    let currentList: LeaderboardEntry[] = [];
    try {
        currentList = await this.get();
        if (!Array.isArray(currentList)) currentList = [];
    } catch (e) {
        currentList = [];
    }
    
    // 2. Process List
    const updatedList = [...currentList, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep top 10

    // 3. Save Cloud
    if (this.isCloudConfigured()) {
      try {
        // We wrap in "users" to match the user's preferred structure format if they wish.
        const payload = { users: updatedList };

        const response = await fetch(this.getUrl(), {
          method: 'PUT',
          headers: {
            'X-Master-Key': JSONBIN_API_KEY.trim(),
            'Content-Type': 'application/json',
            'X-Bin-Versioning': 'false' // IMPORTANT: Prevent version history to update the bin in-place
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Cloud save failed: ${response.status} ${response.statusText}`);
        }

      } catch (error) {
        console.error("Cloud save error:", error);
        this.saveLocal(updatedList);
      }
    } else {
        this.saveLocal(updatedList);
    }
    
    return updatedList;
  },

  getLocal(): LeaderboardEntry[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
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
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Input State for Pre-game
  const [player1Name, setPlayer1Name] = useState('PLAYER 1');
  const [player2Name, setPlayer2Name] = useState('PLAYER 2');
  
  // Scaling State
  const [gameScale, setGameScale] = useState(1);

  // Scale Calculation Logic
  useEffect(() => {
    const handleResize = () => {
        const availableWidth = window.innerWidth - 40; // 20px padding each side
        // Reserve space for Header (~80px), Scoreboard (~100px), Footer (~30px) and margins
        // Approx 220px needed vertically outside game
        const verticalOverhead = 220; 
        const availableHeight = window.innerHeight - verticalOverhead;

        const scaleX = availableWidth / GAME_WIDTH;
        const scaleY = availableHeight / GAME_HEIGHT;

        // Use the smallest scale to fit both dimensions, max cap at 1.2 for large screens
        const newScale = Math.min(scaleX, scaleY, 1.2);
        
        // Ensure it doesn't get too small to be unplayable, though CSS transform handles it fine
        setGameScale(Math.max(newScale, 0.3));
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Init

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load leaderboard
  const loadLeaderboard = useCallback(async () => {
    if (LeaderboardService.isCloudConfigured()) {
        setIsLoadingLeaderboard(true);
        try {
            const data = await LeaderboardService.get();
            setLeaderboard(Array.isArray(data) ? data : []);
        } catch (e) {
            setLeaderboard([]);
        } finally {
            setIsLoadingLeaderboard(false);
        }
    } else {
        const data = LeaderboardService.get();
        setLeaderboard(Array.isArray(data) ? data : []);
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
    }
  }, [gameState.isGameActive]);

  const handleStartGame = (mode: GameMode) => {
      const p1 = player1Name.trim() || 'PLAYER 1';
      const p2 = player2Name.trim() || 'PLAYER 2';
      startGame(mode, p1, p2);
  };

  const calculateScore = () => {
    const winnerScore = gameState.winner === gameState.playerNames.player1 ? gameState.score.player1 : gameState.score.player2;
    const loserScore = gameState.winner === gameState.playerNames.player1 ? gameState.score.player2 : gameState.score.player1;
    const diff = winnerScore - loserScore;
    
    let points = diff * 100;
    
    if (gameState.mode === 'hardcore') {
      points *= 2;
    }
    
    if (gameState.isMasacre) {
      points += 1000;
    }
    
    return points;
  };

  const handleSubmitScore = async () => {
    if (isSubmitting || !gameState.winner) return;

    setIsSubmitting(true);
    const points = calculateScore();
    
    const newEntry: LeaderboardEntry = {
      name: gameState.winner.toUpperCase().substring(0, 10), 
      score: points,
      mode: gameState.mode,
      isMasacre: gameState.isMasacre,
      date: new Date().toLocaleDateString()
    };

    const updatedList = await LeaderboardService.save(newEntry);
    setLeaderboard(Array.isArray(updatedList) ? updatedList : []);
    
    setScoreSubmitted(true);
    setIsSubmitting(false);
    setShowLeaderboard(true);
  };

  const finalScore = calculateScore();

  // Helper to get stats for a specific player name from leaderboard
  const getPlayerStats = (name: string) => {
      if (!name || name.trim() === '') return null;
      const cleanName = name.trim().toUpperCase();
      if (!Array.isArray(leaderboard)) return null;
      
      const playerEntries = leaderboard.filter(entry => entry.name && entry.name.toUpperCase() === cleanName);
      
      if (playerEntries.length === 0) return null;

      const bestScore = Math.max(...playerEntries.map(e => e.score));
      const wins = playerEntries.length;

      return { wins, bestScore };
  };

  const p1Stats = getPlayerStats(player1Name);
  const p2Stats = getPlayerStats(player2Name);

  return (
    <div className="h-full w-full bg-gray-900 text-white flex flex-col items-center p-2 font-mono overflow-hidden">
      {/* Header Area - Flexible but compact */}
      <header className="shrink-0 text-center relative w-full max-w-3xl flex flex-col items-center mb-2 z-10">
        <h1 className="text-3xl md:text-5xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-red-400 cursor-pointer drop-shadow-lg" onClick={() => setShowLeaderboard(false)}>
          PONG XTREME
        </h1>
        <p className="text-gray-400 text-xs mt-1">Chaotic Arcade Pong</p>
        
        {!gameState.isGameActive && !gameState.winner && (
           <button 
             onClick={() => setShowLeaderboard(!showLeaderboard)}
             className="absolute right-0 top-1 text-[10px] md:text-xs border border-yellow-500 text-yellow-400 px-2 py-1 rounded hover:bg-yellow-500 hover:text-black transition-colors flex items-center gap-1"
           >
             🏆 RANK
           </button>
        )}
      </header>
      
      {/* Scoreboard - Shrinks if needed */}
      <div className="shrink-0 w-full flex justify-center mb-2 z-10">
          <ScoreBoard score={gameState.score} playerNames={gameState.playerNames} />
      </div>

      {/* Game Container - Fills remaining space and scales content */}
      <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden">
         {/* Scalable Wrapper */}
         <div 
            style={{ 
                width: GAME_WIDTH, 
                height: GAME_HEIGHT,
                transform: `scale(${gameScale})`,
                transformOrigin: 'center center' 
            }}
            className="relative shadow-2xl"
         >
            <GameBoard gameState={gameState} />
            
            {/* Leaderboard Overlay (Inside scaled area for consistent look) */}
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
                    ) : (!Array.isArray(leaderboard) || leaderboard.length === 0) ? (
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

            {/* Game Over / Start Screen Overlay */}
            {(!gameState.isGameActive || gameState.winner) && !showLeaderboard && (
              <div className="absolute inset-0 bg-black bg-opacity-85 flex flex-col items-center justify-center text-center p-4 z-40 backdrop-blur-sm">
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
                            <h3 className="text-xl text-blue-300 mb-2 uppercase font-bold">High Score: <span className="text-white">{finalScore}</span></h3>
                            <p className="text-xs text-gray-400 mb-4">Update profile for {gameState.winner}</p>
                            <button 
                                onClick={handleSubmitScore}
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded uppercase transition-colors flex items-center justify-center gap-2 shadow-lg"
                            >
                                {isSubmitting ? 'Updating...' : '💾 Save Score'}
                            </button>
                        </div>
                    ) : (
                       <div className="mb-8 text-green-400 font-bold text-xl animate-pulse">SCORE UPDATED!</div> 
                    )}
                    
                    <div className="flex gap-4 justify-center">
                        <button
                          onClick={() => handleStartGame('classic')}
                          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg rounded-lg shadow-lg transition-transform transform hover:scale-105"
                        >
                          Play Again
                        </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-6 w-full max-w-md">
                       <h3 className="text-xl text-yellow-400 font-bold mb-3 uppercase tracking-wider">WHO IS FIGHTING?</h3>
                       <div className="flex gap-4 items-start">
                           <div className="flex-1 flex flex-col gap-1">
                               <input 
                                   type="text"
                                   value={player1Name}
                                   onChange={(e) => setPlayer1Name(e.target.value)}
                                   placeholder="PLAYER 1"
                                   maxLength={10}
                                   className="w-full bg-gray-800 border-2 border-blue-500 text-blue-300 text-center font-bold py-2 rounded uppercase focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-800"
                               />
                               {p1Stats && (
                                   <div className="text-[10px] text-blue-300 bg-blue-900/30 rounded py-1 px-2 flex justify-between items-center animate-fade-in">
                                       <span>🏆 Wins: {p1Stats.wins}</span>
                                       <span>🔥 Best: {p1Stats.bestScore}</span>
                                   </div>
                               )}
                           </div>
                           <div className="flex items-center text-gray-500 font-black italic mt-2">VS</div>
                           <div className="flex-1 flex flex-col gap-1">
                               <input 
                                   type="text"
                                   value={player2Name}
                                   onChange={(e) => setPlayer2Name(e.target.value)}
                                   placeholder="PLAYER 2"
                                   maxLength={10}
                                   className="w-full bg-gray-800 border-2 border-red-500 text-red-300 text-center font-bold py-2 rounded uppercase focus:outline-none focus:ring-2 focus:ring-red-400 placeholder-red-800"
                               />
                               {p2Stats && (
                                   <div className="text-[10px] text-red-300 bg-red-900/30 rounded py-1 px-2 flex justify-between items-center animate-fade-in">
                                       <span>🏆 Wins: {p2Stats.wins}</span>
                                       <span>🔥 Best: {p2Stats.bestScore}</span>
                                   </div>
                               )}
                           </div>
                       </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-2">Select Mode</h2>
                    
                     <div className="mt-4 flex gap-4 justify-center">
                        <button
                          onClick={() => handleStartGame('classic')}
                          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl rounded-lg shadow-lg transition-transform transform hover:scale-105"
                        >
                          Classic
                        </button>
                        <button
                          onClick={() => handleStartGame('hardcore')}
                          className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xl rounded-lg shadow-lg transition-transform transform hover:scale-105 border-2 border-yellow-500"
                        >
                          🔥 Hardcore
                        </button>
                     </div>
                     <p className="text-xs text-gray-500 mt-4">Hardcore: Faster speed, constant chaos.</p>
                     <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mt-4 opacity-60">
                      <p>P1: <span className="text-blue-400">W / S</span></p>
                      <p>P2: <span className="text-red-400">↑ / ↓</span></p>
                      <p className="col-span-2 text-center mt-1">Space to Pause</p>
                    </div>
                  </>
                )}
              </div>
            )}
         </div>
      </div>
      
      <footer className="shrink-0 mt-1 text-gray-600 text-[10px]">
        Built with React & Tailwind.
      </footer>
    </div>
  );
};

export default App;
