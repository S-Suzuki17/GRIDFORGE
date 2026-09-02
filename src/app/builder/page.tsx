'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useGameStore } from '../../hooks/useGameStore';
import { ArrowLeft, Plus, Trash2, Save, Check } from 'lucide-react';
import { Creature } from '../../types/game';
import { Toast } from '../../components/Toast';

const MAX_TEAM_COST = 600;

export default function BuilderPage() {
  const { creatures, isLoaded, deleteCreature, addTeam, setActiveTeamId, activeTeamId, teams, deleteTeam } = useGameStore();
  const [teamSize, setTeamSize] = useState<number>(3); // Default 3 slots visually
  const [selectedTeam, setSelectedTeam] = useState<(Creature | null)[]>(Array(5).fill(null));
  
  const [teamName, setTeamName] = useState('マイチーム');

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
  }, []);

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
      showToast(`コストオーバーです！（最大${MAX_TEAM_COST}pt）`);
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
      showToast('編成枠がいっぱいです。枠を空けるか出撃枠を増やしてください。');
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
      showToast('1体以上編成してください。');
      return;
    }
    
    // Create team object
    const newTeam = {
      name: teamName,
      size: teamSize,
      creatures: validCreatures,
    };
    
    addTeam(newTeam);
    showToast('チームを保存しました！');
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 bg-amber-50 relative">
      <Toast message={toastMsg} isVisible={toastVisible} onClose={() => setToastVisible(false)} />
      <div className="flex items-center justify-between mb-6 pt-4">
        <Link href="/" className="p-3 bg-white border-2 border-slate-200 rounded-2xl hover:border-slate-400 hover:shadow-md transition-all">
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">チーム編成・図鑑</h1>
        <button 
          onClick={handleSaveTeam}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all active:translate-y-1"
        >
          <Save className="w-5 h-5" />
          新規チーム保存
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-120px)] pb-6">
        
        {/* Left: Team Builder */}
        <section className="bg-white p-6 rounded-3xl border-4 border-slate-200 flex flex-col shadow-sm">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">編成ボード</h2>
              <div className="text-sm text-slate-500 font-medium mt-1">出撃枠: {teamSize}体</div>
            </div>
            <div className="text-right bg-slate-50 px-4 py-2 rounded-2xl border-2 border-slate-200">
              <span className="text-xs font-bold text-slate-400 block mb-1">総コスト</span>
              <div className={`text-2xl font-black ${currentTeamCost > MAX_TEAM_COST ? 'text-red-500' : 'text-emerald-500'}`}>
                {currentTeamCost} <span className="text-sm font-bold text-slate-400">/ {MAX_TEAM_COST}pt</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4 bg-slate-100 p-2 rounded-2xl border-2 border-slate-200">
            {[1, 2, 3, 4, 5].map(size => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                className={`flex-1 py-2 text-sm rounded-xl font-bold transition-all ${
                  teamSize === size 
                    ? 'bg-blue-500 text-white shadow-md transform -translate-y-0.5' 
                    : 'bg-white text-slate-500 hover:bg-slate-50'
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
             className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 font-bold rounded-2xl p-3 text-lg mb-4 focus:outline-none focus:border-blue-400 transition-colors"
             placeholder="チーム名"
          />

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {selectedTeam.slice(0, teamSize).map((member, idx) => (
              <div key={idx} className="bg-white border-2 border-slate-200 shadow-sm rounded-2xl p-3 min-h-[90px] flex items-center justify-between">
                {member ? (
                  <div className="flex items-center gap-4 w-full">
                    <div className="text-4xl bg-slate-50 w-16 h-16 flex items-center justify-center rounded-2xl border-2 border-slate-200 shadow-inner">
                      {member.appearance}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 flex items-center justify-between">
                        {member.name}
                        <span className="text-amber-500 font-black bg-amber-50 px-2 py-1 rounded-lg text-sm border border-amber-200">{member.cost} pt</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2 flex gap-3 font-medium">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">HP:{member.stats.hp} ATK:{member.stats.atk} DEF:{member.stats.def}</span>
                        <span className="bg-slate-100 px-2 py-1 rounded-md">MOV:{member.stats.mov} RNG:{member.stats.rng} SEN:{member.stats.sense}</span>
                      </div>
                    </div>
                    <button onClick={() => handleClearSlot(idx)} className="p-3 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-16 flex items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
                    <span className="text-sm font-bold">空きスロット（図鑑から追加）</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Right: Box / Inventory & Saved Teams */}
        <section className="flex flex-col gap-6 h-full">
          {/* Box / Inventory */}
          <div className="bg-white p-6 rounded-3xl border-4 border-slate-200 flex flex-col shadow-sm flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">図鑑（手札）</h2>
              <Link href="/creator" className="flex items-center gap-1 text-sm bg-emerald-100 text-emerald-700 font-bold px-4 py-2 rounded-xl hover:bg-emerald-200 transition-colors">
                <Plus className="w-4 h-4" /> 新規作成
              </Link>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 gap-3 content-start">
              {creatures.length === 0 ? (
                <div className="text-slate-400 text-center py-8 text-sm font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  クリーチャーがいません。<br/>まずは作成しましょう！
                </div>
              ) : (
                creatures.map(c => (
                  <div key={c.id} className="bg-white border-2 border-slate-200 shadow-sm rounded-2xl p-3 flex items-center justify-between group hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="text-3xl bg-slate-50 w-12 h-12 flex items-center justify-center rounded-xl border border-slate-200">{c.appearance}</div>
                       <div>
                         <div className="font-bold text-sm text-slate-800">{c.name} <span className="text-amber-500 font-black ml-2">{c.cost}pt</span></div>
                         <div className="text-[10px] font-medium text-slate-500 mt-1">
                           H:{c.stats.hp} A:{c.stats.atk} D:{c.stats.def} | M:{c.stats.mov} R:{c.stats.rng} S:{c.stats.sense}
                         </div>
                       </div>
                    </div>
                    <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleSelectSlot(c)}
                        className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-sm active:translate-y-1"
                      >
                        配置
                      </button>
                      <button onClick={() => { deleteCreature(c.id); showToast(`${c.name}を削除しました`); }} 
                        className="p-2 text-slate-400 hover:text-white hover:bg-rose-500 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Saved Teams */}
          <div className="bg-white p-6 rounded-3xl border-4 border-slate-200 flex flex-col shadow-sm h-64">
            <h2 className="text-lg font-bold mb-4 text-slate-800">保存済みチーム (バトル用)</h2>
            <div className="overflow-y-auto space-y-3 pr-2">
              {teams.length === 0 ? (
                <div className="text-slate-400 text-center py-6 text-xs font-bold">保存されたチームはありません。</div>
              ) : (
                teams.map(t => (
                  <div key={t.id} className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-colors ${activeTeamId === t.id ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <div>
                      <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        {t.name}
                        {activeTeamId === t.id && <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-md font-bold flex items-center gap-1"><Check className="w-3 h-3"/>選択中</span>}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1">
                        {t.creatures.length}体編成 / 計 {t.creatures.reduce((sum,c)=>sum+c.cost, 0)}pt
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setActiveTeamId(t.id)}
                        className={`px-4 py-2 text-xs rounded-xl font-bold shadow-sm active:translate-y-1 transition-colors ${activeTeamId === t.id ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {activeTeamId === t.id ? '出撃セット' : '選択'}
                      </button>
                      <button onClick={() => { deleteTeam(t.id); showToast(`チーム「${t.name}」を削除しました`); }} 
                        className="p-2 text-slate-400 hover:text-white hover:bg-rose-500 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
