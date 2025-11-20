
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ScoreBoard from './components/ScoreBoard';
import GameBoard from './components/GameBoard';
import { useGameLogic } from './hooks/useGameLogic';
import { LeaderboardEntry, GameMode, SkinType } from './types';
import { GAME_WIDTH, GAME_HEIGHT, AVAILABLE_SKINS } from './constants';

// --- CONFIGURATION FOR GLOBAL LEADERBOARD ---
// CRITICAL FIX: Explicit access to variables is required for Vite to bundle them correctly.
// Dynamic access (e.g. env[key]) fails in production builds.

const getEnvConfig = () => {
    let binId = '';
    let apiKey = '';

    // 1. Try Vite (import.meta.env) - EXPLICIT ACCESS
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            // We must access these properties directly for Vite's define replacement to work
            binId = (import.meta as any).env.VITE_JSONBIN_BIN_ID || '';
            apiKey = (import.meta as any).env.VITE_JSONBIN_API_KEY || '';
        }
    } catch (e) {}

    // 2. Fallback to process.env (CRA/Node) - EXPLICIT ACCESS
    if (!binId || !apiKey) {
        try {
            if (typeof process !== 'undefined' && process.env) {
                binId = binId || process.env.REACT_APP_JSONBIN_BIN_ID || process.env.VITE_JSONBIN_BIN_ID || '';
                apiKey = apiKey || process.env.REACT_APP_JSONBIN_API_KEY || process.env.VITE_JSONBIN_API_KEY || '';
            }
        } catch (e) {}
    }

    // 3. AUTO-FIX: Detect swapped keys (Common Mistake)
    // JSONBin Master Keys usually start with "$2a$" (bcrypt hash format)
    // Bin IDs are usually simple alphanumeric strings (e.g., 60d5f...)
    if (binId.trim().startsWith('$2a$') && !apiKey.trim().startsWith('$2a$')) {
         console.warn("Detected swapped JSONBin keys (Bin ID looked like API Key). Swapping automatically.");
         const temp = binId;
         binId = apiKey;
         apiKey = temp;
    }

    return { binId: binId.trim(), apiKey: apiKey.trim() };
};

const { binId: JSONBIN_BIN_ID, apiKey: JSONBIN_API_KEY } = getEnvConfig();

const LOCAL_STORAGE_KEY = 'pongXtremeLeaderboard';

// --- LEADERBOARD SERVICE ---
const LeaderboardService = {
  // Helper to check if cloud config is valid
  isCloudConfigured() {
    return JSONBIN_BIN_ID.length > 0 && JSONBIN_API_KEY.length > 0;
  },

  // Helper to construct URL only when needed
  getUrl() {
    return `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
  },

  async get(): Promise<LeaderboardEntry[]> {
    // Cloud Mode
    if (this.isCloudConfigured()) {
      try {
        // Remove Content-Type for GET requests to avoid preflight issues on some proxies
        const response = await fetch(this.getUrl(), {
          headers: {
            'X-Master-Key': JSONBIN_API_KEY
          }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            // Parse JSON error if possible to be cleaner
            try {
                const jsonError = JSON.parse(errorText);
                throw new Error(`Cloud Error (${response.status}): ${jsonError.message || errorText}`);
            } catch {
                 throw new Error(`Cloud Error (${response.status}): ${errorText.substring(0, 50)}`);
            }
        }

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
        console.warn("Cloud fetch error:", error);
        throw error; // Propagate error for UI diagnostics
      }
    }
    // Local Mode
    return this.getLocal();
  },

  async save(newEntry: LeaderboardEntry): Promise<LeaderboardEntry[]> {
    // 1. Get latest data first
    let currentList: LeaderboardEntry[] = [];
    try {
        // We use get() logic but catch error here to allow offline saving if cloud is down
        currentList = await this.get();
        if (!Array.isArray(currentList)) currentList = [];
    } catch (e) {
        console.log("Could not fetch latest for save, starting with empty or local");
        // Try local as fallback for base
        currentList = this.getLocal();
    }
    
    // 2. Process List
    const updatedList = [...currentList, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep top 10

    // 3. Save Cloud
    if (this.isCloudConfigured()) {
      try {
        // Map 'name' to 'user' to match the user's requested structure
        const payload = { 
            users: updatedList.map(entry => ({
                user: entry.name,  // Rename 'name' to 'user' for JSONBin
                score: entry.score,
                mode: entry.mode,
                isMasacre: entry.isMasacre,
                date: entry.date
            })) 
        };

        const response = await fetch(this.getUrl(), {
          method: 'PUT',
          headers: {
            'X-Master-Key': JSONBIN_API_KEY,
            'Content-Type': 'application/json'
            // 'X-Bin-Versioning': 'false' // Removed as it causes issues on some free plans
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Cloud Save Error (${response.status}): ${errorText.substring(0, 50)}`);
        }

      } catch (error) {
        console.error("Cloud save error:", error);
        this.saveLocal(updatedList);
        throw error; // Re-throw to notify UI
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{connected: boolean, type: 'cloud' | 'local', error?: string}>({ connected: true, type: 'local' });
  
  // Input State for Pre-game
  const [player1Name, setPlayer1Name] = useState('PLAYER 1');
  const [player2Name, setPlayer2Name] = useState('PLAYER 2');
  const [player1Skin, setPlayer1Skin] = useState<SkinType>('default');
  const [player2Skin, setPlayer2Skin] = useState<SkinType>('default');
  
  // Scaling State
  const [gameScale, setGameScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Improved Scale Calculation Logic using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            
            // Padding safety
            const availableWidth = width - 20;
            const availableHeight = height - 20;

            const scaleX = availableWidth / GAME_WIDTH;
            const scaleY = availableHeight / GAME_HEIGHT;

            // Use the smallest scale to fit, max 1.5
            const newScale = Math.min(scaleX, scaleY, 1.5);
            setGameScale(Math.max(newScale, 0.2)); // Min scale to prevent disappearance
        }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Load leaderboard
  const loadLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true);
    
    if (LeaderboardService.isCloudConfigured()) {
        try {
            const data = await LeaderboardService.get();
            setLeaderboard(Array.isArray(data) ? data : []);
            setConnectionStatus({ connected: true, type: 'cloud' });
        } catch (e: any) {
            // Fallback to local display but show error
            const localData = LeaderboardService.getLocal();
            setLeaderboard(localData);
            setConnectionStatus({ connected: false, type: 'cloud', error: e.message });
        } finally {
            setIsLoadingLeaderboard(false);
        }
    } else {
        const data = LeaderboardService.getLocal();
        setLeaderboard(Array.isArray(data) ? data : []);
        setConnectionStatus({ connected: true, type: 'local' });
        setIsLoadingLeaderboard(false);
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
      setSaveError(null);
    }
  }, [gameState.isGameActive]);

  const handleStartGame = (mode: GameMode) => {
      const p1 = player1Name.trim() || 'PLAYER 1';
      const p2 = player2Name.trim() || 'PLAYER 2';
      startGame(mode, p1, p2, player1Skin, player2Skin);
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
    setSaveError(null);
    const points = calculateScore();
    
    const newEntry: LeaderboardEntry = {
      name: gameState.winner.toUpperCase().substring(0, 10), 
      score: points,
      mode: gameState.mode,
      isMasacre: gameState.isMasacre,
      date: new Date().toLocaleDateString()
    };

    try {
        const updatedList = await LeaderboardService.save(newEntry);
        setLeaderboard(Array.isArray(updatedList) ? updatedList : []);
        setScoreSubmitted(true);
        setShowLeaderboard(true);
    } catch (e: any) {
        // Show error UI
        setSaveError(e.message || 'Unknown error');
        setScoreSubmitted(true); // Technically saved locally, but warn user
    } finally {
        setIsSubmitting(false);
    }
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
    <div className="h-full w-full bg-gray-900 text-white flex flex-col items-center font-mono overflow-hidden">
      {/* Header Area */}
      <header className="shrink-0 w-full flex flex-col items-center justify-center py-2 relative z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <h1 className="text-3xl md:text-4xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-red-400 cursor-pointer drop-shadow-lg" onClick={() => setShowLeaderboard(false)}>
          PONG XTREME
        </h1>
        <p className="text-gray-400 text-[10px]">Chaotic Arcade Pong</p>
        
        {!gameState.isGameActive && !gameState.winner && (
           <button 
             onClick={() => setShowLeaderboard(!showLeaderboard)}
             className="absolute right-4 top-1/2 -translate-y-1/2 text-xs border border-yellow-500 text-yellow-400 px-3 py-1 rounded hover:bg-yellow-500 hover:text-black transition-colors flex items-center gap-1"
           >
             🏆 RANK
           </button>
        )}
      </header>
      
      {/* Scoreboard */}
      <div className="shrink-0 w-full flex justify-center py-2 z-10">
          <ScoreBoard score={gameState.score} playerNames={gameState.playerNames} />
      </div>

      {/* Game Container - Fills remaining space and scales content */}
      <div ref={containerRef} className="flex-1 w-full flex items-center justify-center relative overflow-hidden p-2">
         {/* Scalable Wrapper */}
         <div 
            style={{ 
                width: GAME_WIDTH, 
                height: GAME_HEIGHT,
                transform: `scale(${gameScale})`,
            }}
            className="relative shadow-2xl origin-center"
         >
            <GameBoard gameState={gameState} />
            
            {/* Leaderboard Overlay */}
            {showLeaderboard && !gameState.isGameActive && (
                <div className="absolute inset-0 bg-gray-900 z-50 flex flex-col items-center p-6 overflow-y-auto border-4 border-yellow-600 rounded-lg shadow-2xl">
                    <h2 className="text-4xl font-bold text-yellow-400 mb-2 uppercase tracking-widest border-b-4 border-yellow-500 pb-2" style={{ fontFamily: '"Bangers", system-ui' }}>
                        HALL OF FAME
                    </h2>
                    
                    {/* CONNECTION DIAGNOSTICS - SIMPLIFIED */}
                    <div className="w-full mb-4 p-2 rounded border text-xs flex flex-col gap-2 bg-gray-800 border-gray-700">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span>STATUS:</span>
                                {connectionStatus.type === 'local' ? (
                                    <span className="text-orange-400 font-bold flex items-center gap-1">🔴 LOCAL MODE</span>
                                ) : connectionStatus.connected ? (
                                    <span className="text-green-400 font-bold flex items-center gap-1">🟢 CLOUD CONNECTED</span>
                                ) : (
                                    <span className="text-red-400 font-bold flex items-center gap-1">❌ CONNECTION FAILED</span>
                                )}
                            </div>
                         </div>
                    </div>
                    {connectionStatus.error && (
                        <div className="w-full mb-4 p-2 bg-red-900/50 border border-red-500 text-red-200 text-xs rounded break-all">
                            <strong>Error:</strong> {connectionStatus.error}
                        </div>
                    )}

                    
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
                    ) : gameState.isDramaticFinish ? (
                        <div className="mb-4">
                           <h2 className="text-7xl font-black text-black drop-shadow-[0_5px_0_rgba(255,215,0,1)]" 
                               style={{ 
                                   fontFamily: '"Bangers", system-ui', 
                                   WebkitTextStroke: '2px #FCD34D', // Yellow stroke
                                   letterSpacing: '4px'
                               }}>
                             DRAMATIC FINISH
                           </h2>
                        </div>
                    ) : (
                       <h2 className="text-5xl font-bold text-yellow-400 mb-4" style={{ fontFamily: '"Bangers", system-ui', letterSpacing: '2px' }}>GAME OVER</h2>
                    )}
                    
                    <p className="text-6xl mb-4 text-transparent bg-clip-text bg-gradient-to-t from-gray-300 to-white drop-shadow-lg uppercase" style={{ fontFamily: '"Bangers", system-ui' }}>
                        {gameState.winner} wins!
                    </p>

                    {!scoreSubmitted ? (
                        <div className="bg-gray-800 p-6 rounded-lg border-2 border-blue-500 shadow-2xl mb-6 animate-fade-in-up relative">
                            <h3 className="text-xl text-blue-300 mb-2 uppercase font-bold">High Score: <span className="text-white">{finalScore}</span></h3>
                            {saveError && (
                                <div className="mb-2 text-xs text-red-400 bg-red-900/20 p-1 rounded border border-red-800 break-all">
                                    ⚠️ Save Error: {saveError}. <br/> Saved locally.
                                </div>
                            )}
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
                       <div className="mb-8 flex flex-col items-center animate-pulse">
                           <div className={`font-bold text-xl ${saveError ? 'text-orange-400' : 'text-green-400'}`}>
                               {saveError ? 'SAVED LOCALLY ONLY' : 'SCORE UPDATED!'}
                           </div> 
                           {saveError && (
                               <div className="mt-2 text-xs text-red-300 bg-red-900/60 p-3 rounded border border-red-600 max-w-xs break-words shadow-lg select-text">
                                   <strong>Error:</strong> {saveError}
                                   <div className="mt-1 text-[10px] text-gray-400">Check Console & Env Vars</div>
                               </div>
                           )}
                       </div> 
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
                                   onFocus={(e) => e.target.select()} 
                                   placeholder="PLAYER 1"
                                   maxLength={10}
                                   className="w-full bg-gray-800 border-2 border-blue-500 text-blue-300 text-center font-bold py-2 rounded uppercase focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-800"
                               />
                               <div className="mt-1">
                                    <select 
                                        value={player1Skin}
                                        onChange={(e) => setPlayer1Skin(e.target.value as SkinType)}
                                        className="w-full bg-gray-900 border border-blue-500 text-gray-300 text-xs rounded p-1 focus:outline-none cursor-pointer"
                                    >
                                        {Object.entries(AVAILABLE_SKINS).map(([key, skin]) => (
                                            <option key={key} value={key}>{skin.icon} {skin.name}</option>
                                        ))}
                                    </select>
                               </div>
                               {p1Stats && (
                                   <div className="text-[10px] text-blue-300 bg-blue-900/30 rounded py-1 px-2 flex justify-between items-center animate-fade-in mt-1">
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
                                   onFocus={(e) => e.target.select()} 
                                   placeholder="PLAYER 2"
                                   maxLength={10}
                                   className="w-full bg-gray-800 border-2 border-red-500 text-red-300 text-center font-bold py-2 rounded uppercase focus:outline-none focus:ring-2 focus:ring-red-400 placeholder-red-800"
                               />
                               <div className="mt-1">
                                    <select 
                                        value={player2Skin}
                                        onChange={(e) => setPlayer2Skin(e.target.value as SkinType)}
                                        className="w-full bg-gray-900 border border-red-500 text-gray-300 text-xs rounded p-1 focus:outline-none cursor-pointer"
                                    >
                                        {Object.entries(AVAILABLE_SKINS).map(([key, skin]) => (
                                            <option key={key} value={key}>{skin.icon} {skin.name}</option>
                                        ))}
                                    </select>
                               </div>
                               {p2Stats && (
                                   <div className="text-[10px] text-red-300 bg-red-900/30 rounded py-1 px-2 flex justify-between items-center animate-fade-in mt-1">
                                       <span>🏆 Wins: {p2Stats.wins}</span>
                                       <span>🔥 Best: {p2Stats.bestScore}</span>
                                   </div>
                               )}
                           </div>
                       </div>
                    </div>
                    
                    <h3 className="text-gray-400 mb-4 text-sm tracking-widest">SELECT DIFFICULTY</h3>
                    <div className="flex gap-6">
                        <button
                          onClick={() => handleStartGame('classic')}
                          className="group relative px-8 py-4 bg-gray-800 border-2 border-blue-500 text-blue-400 font-bold rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:bg-blue-900 hover:scale-105 transition-all duration-200 overflow-hidden"
                        >
                          <span className="relative z-10 text-xl tracking-wider">CLASSIC</span>
                          <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors"></div>
                        </button>

                        <button
                          onClick={() => handleStartGame('hardcore')}
                          className="group relative px-8 py-4 bg-gray-800 border-2 border-red-600 text-red-500 font-bold rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.5)] hover:bg-red-900 hover:scale-105 transition-all duration-200 overflow-hidden"
                        >
                           <span className="relative z-10 text-xl tracking-wider flex items-center gap-2">
                               🔥 HARDCORE 🔥
                           </span>
                           <div className="absolute inset-0 bg-red-600/10 group-hover:bg-red-600/20 transition-colors animate-pulse"></div>
                        </button>
                    </div>
                    
                    <div className="mt-8 text-gray-500 text-xs flex flex-col gap-1">
                        <p>W: UP | S: DOWN (Player 1)</p>
                        <p>ARROWS (Player 2)</p>
                        <p className="text-yellow-500/70 mt-2">SPACE/ENTER: START & PAUSE</p>
                    </div>
                  </>
                )}
              </div>
            )}
         </div>
      </div>
      
      <footer className="shrink-0 w-full py-2 text-center text-[10px] text-gray-600 bg-gray-900/90 border-t border-gray-800 z-10">
        PONG XTREME &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;
