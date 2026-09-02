'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useGameStore } from '../../hooks/useGameStore';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { Creature } from '../../types/game';

const MAX_TEAM_COST = 600;

export default function BuilderPage() {
  const { creatures, isLoaded, deleteCreature, addTeam, setActiveTeamId, activeTeamId, teams, deleteTeam } = useGameStore();
  const [teamSize, setTeamSize] = useState<number>(3); // Default 3 slots visually
  const [selectedTeam, setSelectedTeam] = useState<(Creature | null)[]>(Array(5).fill(null));
  
  // To handle multiple saved teams in UI, let's just make it simple: saving a team creates a new one or overwrites.
  // We'll add a team name state.
  const [teamName, setTeamName] = useState('マイチーム');

  const handleSizeChange = (size: number) => {
    setTeamSize(size);
    setSelectedTeam(prev => {
      const newTeam = Array(5).fill(null);
      for(let i=0; i<size; i++){
         newTeam[i] = prev[i] || null;
      }
      return newTeam;
    });
  };

  const currentTeamCost = selectedTeam.reduce((acc, c) => acc + (c ? c.cost : 0), 0);

  const handleSelectSlot = (creature: Creature) => {
    if (currentTeamCost + creature.cost > MAX_TEAM_COST) {
      alert(`コストオーバーです！（最大${MAX_TEAM_COST}pt）`);
      return;
    }
    const emptySlot = selectedTeam.findIndex((m, idx) => m === null && idx < teamSize);
    if (emptySlot !== -1) {
      setSelectedTeam(prev => {
        const newTeam = [...prev];
        newTeam[emptySlot] = creature;
        return newTeam;
      });
    } else {
      alert('編成枠がいっぱいです。枠を空けるか出撃枠を増やしてください。');
    }
  };

  const handleClearSlot = (index: number) => {
    setSelectedTeam(prev => {
      const newTeam = [...prev];
      newTeam[index] = null;
      return newTeam;
    });
  };

  const handleSaveTeam = () => {
    const validCreatures = selectedTeam.filter((c): c is Creature => c !== null);
    if (validCreatures.length === 0) {
      alert('1体以上編成してください。');
      return;
    }
    
    // Create team object
    const newTeam = {
      name: teamName,
      size: teamSize,
      creatures: validCreatures,
    };
    
    addTeam(newTeam);
    alert('チームを保存しました！');
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">チーム編成・図鑑</h1>
        <button 
          onClick={handleSaveTeam}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors"
        >
          <Save className="w-4 h-4" />
          新規チーム保存
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
        
        {/* Left: Team Builder */}
        <section className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-lg font-bold">編成</h2>
              <div className="text-xs text-slate-400 mt-1">出撃枠: {teamSize}体</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">総コスト</div>
              <div className={`text-xl font-bold ${currentTeamCost > MAX_TEAM_COST ? 'text-red-400' : 'text-emerald-400'}`}>
                {currentTeamCost} <span className="text-sm font-normal text-slate-400">/ {MAX_TEAM_COST}pt</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map(size => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                className={`flex-1 py-1 text-sm rounded-lg font-semibold transition-colors ${
                  teamSize === size 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {size}枠
              </button>
            ))}
          </div>
          
          <input 
             type="text" 
             value={teamName}
             onChange={e => setTeamName(e.target.value)}
             className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-sm mb-4"
             placeholder="チーム名"
          />

          <div className="flex-1 overflow-y-auto space-y-2">
            {selectedTeam.slice(0, teamSize).map((member, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-700 rounded-xl p-3 min-h-[90px] flex items-center justify-between">
                {member ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="text-3xl bg-slate-800 w-12 h-12 flex items-center justify-center rounded-lg border border-slate-600">
                      {member.appearance}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm flex items-center justify-between">
                        {member.name}
                        <span className="text-amber-400 text-xs">{member.cost}pt</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
                        <span>H:{member.stats.hp} A:{member.stats.atk} D:{member.stats.def}</span>
                        <span>M:{member.stats.mov} R:{member.stats.rng} S:{member.stats.sense}</span>
                      </div>
                    </div>
                    <button onClick={() => handleClearSlot(idx)} className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-12 flex items-center justify-center text-slate-500 gap-2 border-2 border-dashed border-slate-700 rounded-lg">
                    <span className="text-sm">右のボックスから追加</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Right: Box / Inventory & Saved Teams */}
        <section className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">クリーチャー図鑑</h2>
            <Link href="/creator" className="flex items-center gap-1 text-sm bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded-full hover:bg-emerald-600/40">
              <Plus className="w-4 h-4" /> 新規作成
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 gap-2 content-start mb-6">
            {creatures.length === 0 ? (
              <div className="text-slate-500 text-center py-6 text-sm">
                クリーチャーがいません。
              </div>
            ) : (
              creatures.map(c => (
                <div key={c.id} className="bg-slate-900 border border-slate-700 rounded-lg p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className="text-2xl">{c.appearance}</div>
                     <div>
                       <div className="font-bold text-xs">{c.name} <span className="text-amber-400 ml-1">{c.cost}pt</span></div>
                       <div className="text-[10px] text-slate-400">
                         H:{c.stats.hp} A:{c.stats.atk} D:{c.stats.def} | M:{c.stats.mov} R:{c.stats.rng} S:{c.stats.sense}
                       </div>
                     </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleSelectSlot(c)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold"
                    >
                      配置
                    </button>
                    <button onClick={() => { if (confirm('削除しますか？')) deleteCreature(c.id); }} 
                      className="p-1 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <hr className="border-slate-700 mb-4" />

          <h2 className="text-sm font-bold mb-3 text-slate-300">保存済みチーム (バトル用)</h2>
          <div className="overflow-y-auto max-h-40 space-y-2">
            {teams.length === 0 ? (
              <div className="text-slate-500 text-center py-2 text-xs">保存されたチームはありません。</div>
            ) : (
              teams.map(t => (
                <div key={t.id} className={`p-3 rounded-lg border flex items-center justify-between ${activeTeamId === t.id ? 'bg-amber-900/40 border-amber-500' : 'bg-slate-900 border-slate-700'}`}>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-2">
                      {t.name}
                      {activeTeamId === t.id && <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded">選択中</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {t.creatures.length}体編成 / 計 {t.creatures.reduce((sum,c)=>sum+c.cost, 0)}pt
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveTeamId(t.id)}
                      className={`px-3 py-1 text-xs rounded font-bold ${activeTeamId === t.id ? 'bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >
                      {activeTeamId === t.id ? '出撃セット' : '選択'}
                    </button>
                    <button onClick={() => { if (confirm('チームを削除しますか？')) deleteTeam(t.id); }} 
                      className="p-1 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
