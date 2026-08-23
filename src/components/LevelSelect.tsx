'use client';

import React from 'react';
import { dict, Language } from '../locales/dict';
import { User, TimeControl } from '../types/game';
import { supabase } from '../lib/supabaseClient';
import { GameRecord, getGameRecords, Profile, getTopProfiles } from '../lib/gameRecordService';
import { soundManager } from '../lib/SoundService';

interface LevelSelectProps {
    lang: Language;
    user: User;
    onSelect: (level: number, tc: TimeControl) => void;
    onOnlineMatch?: (roomId: string, role: 'white' | 'black', matchMode: 'random' | 'private' | 'ranked', tc: TimeControl) => void;
    onReplay?: (record: GameRecord) => void;
    onBack: () => void;
}

export function LevelSelect({ lang, user, onSelect, onOnlineMatch, onReplay, onBack }: LevelSelectProps) {
    const t = dict[lang];
    const [adLevel, setAdLevel] = React.useState<number | null>(null);
    const [adProgress, setAdProgress] = React.useState(0);
    const [showOnlineMenu, setShowOnlineMenu] = React.useState(false);
    const [joinRoomId, setJoinRoomId] = React.useState('');
    const [isSearching, setIsSearching] = React.useState(false);
    const [showReplays, setShowReplays] = React.useState(false);
    const [replays, setReplays] = React.useState<GameRecord[]>([]);
    const [loadingReplays, setLoadingReplays] = React.useState(false);
    const [showLeaderboard, setShowLeaderboard] = React.useState(false);
    const [leaderboard, setLeaderboard] = React.useState<Profile[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = React.useState(false);
    const [timeControl, setTimeControl] = React.useState<TimeControl>('10m');
    const channelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);

    React.useEffect(() => {
        if (isSearching) {
            soundManager.playBGM('/audio/bgm_waiting.mp3');
        } else {
            soundManager.playBGM('/audio/bgm_title.mp3');
        }
    }, [isSearching]);

    const loadLeaderboard = async () => {
        setLoadingLeaderboard(true);
        const data = await getTopProfiles();
        setLeaderboard(data);
        setLoadingLeaderboard(false);
    };

    const loadReplays = async () => {
        setLoadingReplays(true);
        const data = await getGameRecords(10);
        setReplays(data);
        setLoadingReplays(false);
    };

    const handleLevelClick = (level: number) => {
        if (level >= 4) {
            setAdLevel(level);
            setAdProgress(0);
            
            const interval = setInterval(() => {
                setAdProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        return 100;
                    }
                    return prev + 2;
                });
            }, 50);
        } else {
            onSelect(level, timeControl);
        }
    };

    const handleAdFinish = () => {
        if (adLevel) {
            onSelect(adLevel, timeControl);
            setAdLevel(null);
        }
    };

    const cancelSearch = React.useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        setIsSearching(false);
    }, []);

    const startRandomMatch = React.useCallback((mode: 'random' | 'ranked') => {
        setIsSearching(true);
        
        const myId = user.id + '_' + Date.now();
        const matchedRef = { current: false };
        const channelName = mode === 'ranked' ? `matchmaking_ranked_${timeControl}` : `matchmaking_lobby_${timeControl}`;
        const channel = supabase.channel(channelName, {
            config: { presence: { key: myId } }
        });
        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                if (matchedRef.current) return;
                
                const state = channel.presenceState();
                const keys = Object.keys(state);
                
                if (keys.length >= 2) {
                    // Sort all keys deterministically
                    const sorted = keys.sort();
                    
                    // Pair up: [0]+[1], [2]+[3], etc.
                    for (let i = 0; i < sorted.length - 1; i += 2) {
                        const hostKey = sorted[i];
                        const joinerKey = sorted[i + 1];
                        
                        if (hostKey === myId) {
                            // I'm the host for this pair
                            matchedRef.current = true;
                            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
                            channel.send({
                                type: 'broadcast',
                                event: 'match_ready',
                                payload: { roomId, hostKey: myId, joinerKey, mode }
                            });
                            setTimeout(() => {
                                cancelSearch();
                                onOnlineMatch?.(roomId, 'white', mode, timeControl);
                            }, 300);
                            return;
                        }
                    }
                }
            })
            .on('broadcast', { event: 'match_ready' }, ({ payload }) => {
                if (matchedRef.current) return;
                
                // Only respond if I'm the specifically designated joiner
                if (payload.joinerKey === myId) {
                    matchedRef.current = true;
                    cancelSearch();
                    onOnlineMatch?.(payload.roomId, 'black', payload.mode, timeControl);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ userId: user.id, name: user.name });
                }
            });
    }, [user, onOnlineMatch, cancelSearch]);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full text-cyan-400">
            {/* Ad overlay */}
            {adLevel && (
                <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-gray-900 border border-cyan-500/30 p-8 rounded-lg max-w-md w-full text-center shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                        <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center justify-center gap-2">
                            <span className="text-yellow-400">⚡</span> Cloud Compute Required
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Levels 4 & 5 use Serverless AI (AWS Lambda) for massive calculation power. 
                            Watch a short ad to unlock server time for this match!
                        </p>
                        
                        <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden mb-6 border border-gray-700">
                            <div 
                                className="h-full bg-cyan-500 transition-all duration-75"
                                style={{ width: `${adProgress}%` }}
                            />
                        </div>

                        {adProgress < 100 ? (
                            <p className="text-cyan-500 animate-pulse text-sm font-mono">Simulating Ad... {adProgress}%</p>
                        ) : (
                            <button 
                                onClick={handleAdFinish}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded transition-colors"
                            >
                                Play Level {adLevel}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Random Match searching overlay */}
            {isSearching && (
                <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-gray-900 border border-cyan-500/30 p-8 rounded-lg max-w-md w-full text-center shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                        <div className="text-4xl mb-6 animate-spin inline-block">🔍</div>
                        <h3 className="text-2xl font-bold text-cyan-300 mb-4">
                            Searching for Opponent...
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Waiting for another player to join the queue.
                        </p>
                        <div className="flex justify-center mb-6">
                            <div className="flex gap-1">
                                <div className="w-3 h-3 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-3 h-3 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-3 h-3 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                        <button
                            onClick={cancelSearch}
                            className="px-6 py-2 bg-red-900/50 hover:bg-red-800/50 border border-red-500 rounded text-red-300 font-bold transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="text-center mb-12">
                <p className="text-cyan-500 mb-2">Welcome, Agent {user.name} [{user.id}]</p>
                <h2 className="text-4xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                    {t.selectLevel}
                </h2>
            </div>

            <div className="w-full max-w-md flex flex-col gap-4 mt-8">
                
                {/* 持ち時間設定 */}
                <div className="flex flex-col gap-2 mb-2 p-4 bg-cyan-950/20 border border-cyan-900 rounded">
                    <span className="text-cyan-400 font-bold text-sm tracking-widest">{t.timeLimit}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setTimeControl('10s')} className={`flex-1 py-2 rounded text-xs font-bold transition-all ${timeControl === '10s' ? 'bg-cyan-600 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-cyan-950/30 text-cyan-500 border border-cyan-800'}`}>{t.tc10s}</button>
                        <button onClick={() => setTimeControl('3m')} className={`flex-1 py-2 rounded text-xs font-bold transition-all ${timeControl === '3m' ? 'bg-cyan-600 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-cyan-950/30 text-cyan-500 border border-cyan-800'}`}>{t.tc3m}</button>
                        <button onClick={() => setTimeControl('10m')} className={`flex-1 py-2 rounded text-xs font-bold transition-all ${timeControl === '10m' ? 'bg-cyan-600 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-cyan-950/30 text-cyan-500 border border-cyan-800'}`}>{t.tc10m}</button>
                    </div>
                </div>

                <button 
                    onClick={() => handleLevelClick(5)}
                    className="group relative w-full p-4 bg-black/40 border border-red-500/50 hover:bg-red-950/30 transition-all rounded text-left overflow-hidden hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                    <div className="absolute inset-0 w-1 bg-red-500 group-hover:w-full transition-all duration-300 opacity-10" />
                    <div className="relative z-10 flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xl font-bold text-red-400 tracking-wider">🤖 VS CPU</span>
                        </div>
                        <span className="text-xs text-red-500/70">{t.lv5Desc}</span>
                    </div>
                </button>

                {/* ── Online Multiplayer ── */}
                <div className="flex items-center justify-center gap-2 my-2 opacity-50">
                    <div className="h-px w-full bg-cyan-900" />
                    <span className="text-xs uppercase tracking-widest text-cyan-600 whitespace-nowrap">{t.onlineMultiplayer}</span>
                    <div className="h-px w-full bg-cyan-900" />
                </div>

                {/* Ranked Match */}
                <button 
                    onClick={() => startRandomMatch('ranked')}
                    className="group relative w-full p-4 bg-fuchsia-950/40 border border-fuchsia-500/50 hover:bg-fuchsia-900/30 transition-all rounded text-left overflow-hidden hover:shadow-[0_0_20px_rgba(217,70,239,0.3)]">
                    <div className="absolute inset-0 w-1 bg-fuchsia-500 group-hover:w-full transition-all duration-300 opacity-10" />
                    <div className="relative z-10 flex justify-between items-center">
                        <span className="text-xl font-bold text-fuchsia-400 tracking-wider">🏆 {t.rankedMatch}</span>
                        <span className="text-xs text-fuchsia-500 border border-fuchsia-500/50 px-2 py-1 rounded">{t.rated}</span>
                    </div>
                </button>

                {/* Random Match */}
                <button 
                    onClick={() => startRandomMatch('random')}
                    className="group relative w-full p-4 bg-emerald-950/40 border border-emerald-500/50 hover:bg-emerald-900/30 transition-all rounded text-left overflow-hidden hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <div className="absolute inset-0 w-1 bg-emerald-500 group-hover:w-full transition-all duration-300 opacity-10" />
                    <div className="relative z-10 flex justify-between items-center">
                        <span className="text-xl font-bold text-emerald-400 tracking-wider">🎲 {t.randomMatch}</span>
                        <span className="text-xs text-emerald-500 border border-emerald-500/50 px-2 py-1 rounded">{t.unrated}</span>
                    </div>
                </button>

                {!showOnlineMenu ? (
                    <button 
                        onClick={() => setShowOnlineMenu(true)}
                        className="group relative w-full p-4 bg-blue-900/40 border border-blue-500/50 hover:bg-blue-800/50 transition-all rounded text-left overflow-hidden hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        <div className="absolute inset-0 w-1 bg-blue-500 group-hover:w-full transition-all duration-300 opacity-10" />
                        <div className="relative z-10 flex justify-between items-center">
                            <span className="text-xl font-bold text-blue-300 tracking-wider">🔒 {t.privateMatch}</span>
                        </div>
                    </button>
                ) : (
                    <div className="p-4 bg-black/60 border border-cyan-500/50 rounded flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-cyan-400 font-bold text-sm">🔒 {t.privateMatch}</span>
                        </div>
                        <button 
                            onClick={() => {
                                const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
                                onOnlineMatch?.(newRoomId, 'white', 'private', timeControl);
                            }}
                            className="w-full p-3 bg-blue-900/50 hover:bg-blue-800/50 border border-blue-400 rounded text-blue-300 font-bold transition-colors"
                        >
                            {t.hostMatch}
                        </button>
                        
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder={t.roomId}
                                value={joinRoomId}
                                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                                className="flex-1 bg-black/50 border border-cyan-800 rounded px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400"
                            />
                            <button 
                                onClick={() => {
                                    if(joinRoomId) onOnlineMatch?.(joinRoomId, 'black', 'private', timeControl);
                                }}
                                className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 border border-red-400 rounded text-red-300 font-bold transition-colors"
                            >
                                {t.joinMatch}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Replays ── */}
                <div className="flex items-center justify-center gap-2 my-2 opacity-50 mt-8">
                    <div className="h-px w-full bg-cyan-900" />
                    <span className="text-xs uppercase tracking-widest text-cyan-600 whitespace-nowrap">{t.gameReplays}</span>
                    <div className="h-px w-full bg-cyan-900" />
                </div>

                {!showReplays ? (
                    <button 
                        onClick={() => {
                            setShowReplays(true);
                            loadReplays();
                        }}
                        className="group relative w-full p-4 bg-gray-900/40 border border-gray-500/50 hover:bg-gray-800/50 transition-all rounded text-left overflow-hidden hover:shadow-[0_0_20px_rgba(156,163,175,0.3)]">
                        <div className="absolute inset-0 w-1 bg-gray-500 group-hover:w-full transition-all duration-300 opacity-10" />
                        <div className="relative z-10 flex justify-between items-center">
                            <span className="text-xl font-bold text-gray-300 tracking-wider">📺 {t.watchReplays}</span>
                        </div>
                    </button>
                ) : (
                    <div className="p-4 bg-black/60 border border-gray-500/50 rounded flex flex-col gap-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 font-bold text-sm">📺 {t.watchReplays}</span>
                            <button onClick={() => setShowReplays(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>
                        
                        {loadingReplays ? (
                            <div className="text-center text-gray-500 py-4 animate-pulse">{t.loading}</div>
                        ) : replays.length === 0 ? (
                            <div className="text-center text-gray-500 py-4">{t.noRecords}</div>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {replays.map(r => (
                                    <button 
                                        key={r.id}
                                        onClick={() => onReplay?.(r)}
                                        className="w-full text-left p-3 bg-gray-900/50 hover:bg-gray-800 border border-gray-700 rounded transition-colors flex justify-between items-center"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-300">
                                                {r.white_player} <span className="text-gray-600">{t.vs}</span> {r.black_player}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(r.created_at!).toLocaleDateString()} • {r.mode.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${r.winner === 'white_wins' ? 'bg-blue-900 text-blue-300' : r.winner === 'black_wins' ? 'bg-red-900 text-red-300' : 'bg-gray-800 text-gray-400'}`}>
                                                {r.winner === 'white_wins' ? t.whiteWon : r.winner === 'black_wins' ? t.blackWon : t.draw}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Leaderboard ── */}
                <div className="flex items-center justify-center gap-2 my-2 opacity-50 mt-8">
                    <div className="h-px w-full bg-cyan-900" />
                    <span className="text-xs uppercase tracking-widest text-cyan-600 whitespace-nowrap">{t.globalRankings}</span>
                    <div className="h-px w-full bg-cyan-900" />
                </div>

                {!showLeaderboard ? (
                    <button 
                        onClick={() => {
                            setShowLeaderboard(true);
                            loadLeaderboard();
                        }}
                        className="group relative w-full p-4 bg-fuchsia-900/40 border border-fuchsia-500/50 hover:bg-fuchsia-800/50 transition-all rounded text-left overflow-hidden hover:shadow-[0_0_20px_rgba(217,70,239,0.3)]">
                        <div className="absolute inset-0 w-1 bg-fuchsia-500 group-hover:w-full transition-all duration-300 opacity-10" />
                        <div className="relative z-10 flex justify-between items-center">
                            <span className="text-xl font-bold text-fuchsia-300 tracking-wider">🏆 {t.top10Players}</span>
                        </div>
                    </button>
                ) : (
                    <div className="p-4 bg-black/60 border border-fuchsia-500/50 rounded flex flex-col gap-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-fuchsia-400 font-bold text-sm">🏆 {t.top10Players}</span>
                            <button onClick={() => setShowLeaderboard(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>
                        
                        {loadingLeaderboard ? (
                            <div className="text-center text-gray-500 py-4 animate-pulse">{t.loading}</div>
                        ) : leaderboard.length === 0 ? (
                            <div className="text-center text-gray-500 py-4">{t.noRankedPlayers}</div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {leaderboard.map((p, index) => (
                                    <div 
                                        key={p.id}
                                        className="w-full flex justify-between items-center p-3 bg-fuchsia-950/30 border border-fuchsia-900/50 rounded"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`text-lg font-black ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                                                #{index + 1}
                                            </span>
                                            <span className="font-bold text-gray-200">{p.name}</span>
                                        </div>
                                        <div className="text-fuchsia-400 font-mono font-bold tracking-widest">
                                            {p.rating}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <button onClick={onBack} className="mt-12 text-cyan-600 hover:text-cyan-400">
                {t.logout}
            </button>
        </div>
    );
}
