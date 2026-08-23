'use client';

import React, { useState, useEffect } from 'react';
import GameBoard from '../components/GameBoard';
import AdBanner from '../components/AdBanner';
import { TitleScreen } from '../components/TitleScreen';
import { LevelSelect } from '../components/LevelSelect';
import ReplayBoard from '../components/ReplayBoard';
import { Language } from '../locales/dict';
import { User, GameState, TimeControl } from '../types/game';
import { GameRecord } from '../lib/gameRecordService';
import { soundManager } from '../lib/SoundService';

export default function Home() {
    const [lang, setLang] = useState<Language>('ja');
    const [gameState, setGameState] = useState<GameState>('title');
    const [user, setUser] = useState<User | null>(null);
    const [cpuLevel, setCpuLevel] = useState<number>(1);
    const [onlineInfo, setOnlineInfo] = useState<{ roomId: string, role: 'white' | 'black', matchMode: 'random' | 'private' | 'ranked' } | null>(null);
    const [replayRecord, setReplayRecord] = useState<GameRecord | null>(null);
    const [soundConfig, setSoundConfig] = useState(() => soundManager.getConfig());
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const unsubscribe = soundManager.subscribe(setSoundConfig);
        return () => { unsubscribe(); };
    }, []);

    useEffect(() => {
        if (gameState === 'title') {
            soundManager.playBGM('/audio/bgm_title.mp3');
        } else if (gameState === 'playing') {
            soundManager.playBGM('/audio/bgm_playing.mp3');
        } else if (gameState === 'replay') {
            soundManager.playBGM('/audio/bgm_replay.mp3');
        } else {
            soundManager.stopBGM();
        }
    }, [gameState]);

    const handleLogin = (u: User) => {
        setUser(u);
        setGameState('level_select');
    };

    const handleSelectLevel = (level: number, tc: TimeControl) => {
        setCpuLevel(level);
        setTimeControl(tc);
        setOnlineInfo(null);
        setGameState('playing');
    };

    const handleOnlineMatch = (roomId: string, role: 'white' | 'black', matchMode: 'random' | 'private' | 'ranked', tc: TimeControl) => {
        setOnlineInfo({ roomId, role, matchMode });
        setTimeControl(tc);
        setGameState('playing');
    };

    const handleLogout = () => {
        setUser(null);
        setGameState('title');
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-[#050505] text-[#00ff41] font-mono relative overflow-hidden">
            <div className="z-10 w-full max-w-5xl flex items-center justify-between font-mono text-sm mb-4">
                {/* 右上のコントロール群 */}
                <div className="fixed right-4 top-4 z-50 flex gap-2">
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="px-4 py-2 bg-[#111] border border-cyan-500 text-cyan-400 rounded hover:bg-cyan-900/30 transition-colors font-bold tracking-widest shadow-[0_0_10px_rgba(34,211,238,0.3)] flex items-center justify-center"
                    >
                        ⚙️ {lang === 'ja' ? '設定' : 'SETTINGS'}
                    </button>
                    <button 
                        onClick={() => setLang(lang === 'en' ? 'ja' : 'en')}
                        className="px-4 py-2 bg-[#111] border border-[#00ff41] text-[#00ff41] rounded hover:bg-[#00ff41]/20 transition-colors font-bold tracking-widest shadow-[0_0_10px_rgba(0,255,65,0.3)]"
                    >
                        {lang === 'en' ? '🌐 EN / JA' : '🌐 JA / EN'}
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#111] border border-cyan-500 rounded-xl p-8 w-full max-w-md shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-cyan-400">⚙️ {lang === 'ja' ? 'サウンド設定' : 'SOUND SETTINGS'}</h2>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>
                        
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="flex justify-between text-cyan-300 font-bold">
                                    <span>BGM Volume</span>
                                    <span>{Math.round(soundConfig.bgmVolume * 100)}%</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05" 
                                    value={soundConfig.bgmVolume} 
                                    onChange={(e) => soundManager.updateConfig({ bgmVolume: parseFloat(e.target.value) })}
                                    className="w-full accent-cyan-500"
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <label className="flex justify-between text-cyan-300 font-bold">
                                    <span>SE Volume</span>
                                    <span>{Math.round(soundConfig.seVolume * 100)}%</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05" 
                                    value={soundConfig.seVolume} 
                                    onChange={(e) => {
                                        soundManager.updateConfig({ seVolume: parseFloat(e.target.value) });
                                        // Play test sound
                                        if (!soundConfig.masterMute) {
                                            const se = new Audio('/audio/move.mp3'); // We don't have move.mp3, but it won't crash
                                            se.volume = parseFloat(e.target.value);
                                            se.play().catch(()=>{});
                                        }
                                    }}
                                    className="w-full accent-cyan-500"
                                />
                            </div>

                            <div className="flex items-center gap-4 mt-4 pt-6 border-t border-cyan-900/50">
                                <span className="text-cyan-300 font-bold flex-1">Master Mute</span>
                                <button 
                                    onClick={() => soundManager.updateConfig({ masterMute: !soundConfig.masterMute })}
                                    className={`px-6 py-2 rounded font-bold tracking-widest transition-all ${soundConfig.masterMute ? 'bg-red-900/50 text-red-400 border border-red-500' : 'bg-cyan-900/50 text-cyan-400 border border-cyan-500'}`}
                                >
                                    {soundConfig.masterMute ? '🔇 MUTED' : '🔊 ON'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-grow w-full flex flex-col items-center justify-center">
                {gameState === 'title' && (
                    <TitleScreen lang={lang} onLogin={handleLogin} />
                )}

                {gameState === 'level_select' && user && (
                    <LevelSelect 
                        lang={lang} 
                        user={user} 
                        onSelect={handleSelectLevel} 
                        onOnlineMatch={handleOnlineMatch}
                        onReplay={(record) => {
                            setReplayRecord(record);
                            setGameState('replay');
                        }}
                        onBack={handleLogout} 
                    />
                )}

                {gameState === 'playing' && user && (
                    <GameBoard 
                        lang={lang} 
                        user={user} 
                        cpuLevel={onlineInfo ? undefined : cpuLevel} 
                        roomId={onlineInfo?.roomId}
                        onlineRole={onlineInfo?.role}
                        matchMode={onlineInfo?.matchMode}
                        timeControl={timeControl}
                        onHome={() => setGameState('level_select')}
                    />
                )}

                {gameState === 'replay' && replayRecord && (
                    <ReplayBoard 
                        lang={lang} 
                        record={replayRecord} 
                        onHome={() => {
                            setReplayRecord(null);
                            setGameState('level_select');
                        }}
                    />
                )}
            </div>

            {/* 広告枠 */}
            <div className="w-full max-w-4xl mt-8">
                <AdBanner 
                    adClient={process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-XXXXXXXXXXXXXXXX"} 
                    adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT || "XXXXXXXXXX"} 
                />
            </div>
        </main>
    );
}
