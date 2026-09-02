'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '../../hooks/useGameStore';
import { CreatureStats, calculateTotalCost, calculateStatCost } from '../../types/game';
import { ArrowLeft, Save, Sparkles, ChevronRight, Hash } from 'lucide-react';
import Link from 'next/link';
import { Toast } from '../../components/Toast';

const appearances = [
  '/creatures/knight.jpg',
  '/creatures/mage.jpg',
  '/creatures/ninja.jpg',
  '/creatures/heavy.jpg',
  '/creatures/mecha.jpg'
];
const MAX_COST = 600;

export default function CreatorPage() {
  const router = useRouter();
  const { addCreature, isLoaded } = useGameStore();

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
  }, []);

  const [name, setName] = useState('');
  const [appearance, setAppearance] = useState(appearances[0]);
  const [stats, setStats] = useState<CreatureStats>({
    hp: 1,
    atk: 0,
    def: 0,
    mov: 0,
    rng: 0,
    sense: 0,
  });

  if (!isLoaded) return null;

  const currentCost = calculateTotalCost(stats);
  const remainingCost = MAX_COST - currentCost;

  const getNextCost = (key: keyof CreatureStats, currentVal: number) => {
    return calculateStatCost(key, currentVal + 1) - calculateStatCost(key, currentVal);
  };

  const getRefundCost = (key: keyof CreatureStats, currentVal: number) => {
    if (currentVal <= 0) return 0;
    return calculateStatCost(key, currentVal) - calculateStatCost(key, currentVal - 1);
  };

  const updateStat = (key: keyof CreatureStats, delta: number) => {
    setStats(prev => {
      const currentVal = prev[key];
      const newVal = currentVal + delta;
      
      if (key === 'hp' && newVal < 1) return prev;
      if (newVal < 0) return prev;
      
      const newTotalCost = calculateTotalCost({ ...prev, [key]: newVal });
      if (newTotalCost > MAX_COST) return prev;

      return { ...prev, [key]: newVal };
    });
  };

  const handleDirectStatChange = (key: keyof CreatureStats, rawValue: string) => {
    let newVal = parseInt(rawValue, 10);
    if (isNaN(newVal)) return;

    if (key === 'hp' && newVal < 1) newVal = 1;
    if (key !== 'hp' && newVal < 0) newVal = 0;

    setStats(prev => {
      // Find the maximum affordable value using binary search or simple loop
      let testVal = newVal;
      while (testVal >= prev[key]) {
        const testCost = calculateTotalCost({ ...prev, [key]: testVal });
        if (testCost <= MAX_COST) {
           break; // found highest affordable
        }
        testVal--;
      }
      return { ...prev, [key]: testVal };
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      showToast('名前を入力してください');
      return;
    }
    addCreature({
      name,
      appearance,
      cost: currentCost,
      stats,
    });
    showToast(`保存しました！ (コスト: ${currentCost}pt)`);
    router.push('/');
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 md:p-6 bg-amber-50 relative">
      <Toast message={toastMsg} isVisible={toastVisible} onClose={() => setToastVisible(false)} />
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="p-3 bg-white border-2 border-slate-200 rounded-2xl hover:border-slate-400 hover:shadow-md transition-all">
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">クリーチャー作成</h1>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all active:translate-y-1"
        >
          <Save className="w-5 h-5" />
          保存
        </button>
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto pb-10 px-2">
        
        {/* Basic Info */}
        <section className="bg-white p-6 rounded-3xl border-4 border-slate-200 flex gap-6 items-center shadow-sm">
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Name</h2>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="クリーチャー名"
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl p-4 text-xl font-bold focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
              maxLength={12}
            />
          </div>
          <div className="w-28 flex flex-col items-center">
            <h2 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Icon (変更)</h2>
            <button className="w-20 h-20 bg-slate-50 border-2 border-slate-200 rounded-full flex items-center justify-center relative group hover:border-blue-400 transition-colors">
              {/* Left Arm */}
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-5 rounded-full bg-amber-700 border-2 border-amber-950/20 shadow-sm anim-arm-left z-0" />
              {/* Right Arm */}
              <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-5 rounded-full bg-amber-700 border-2 border-amber-950/20 shadow-sm anim-arm-right z-0" />
              {/* Left Foot */}
              <div className="absolute left-2 -bottom-1.5 w-4.5 h-3 rounded-full bg-amber-700 border-2 border-amber-950/20 shadow-md anim-foot-left z-0" />
              {/* Right Foot */}
              <div className="absolute right-2 -bottom-1.5 w-4.5 h-3 rounded-full bg-amber-700 border-2 border-amber-950/20 shadow-md anim-foot-right z-0" />

              <div className="w-full h-full rounded-full overflow-hidden z-10 border-2 border-white shadow-sm flex items-center justify-center">
                {appearance.startsWith('/') ? <img src={appearance} className="w-full h-full object-cover" /> : <span className="text-5xl">{appearance}</span>}
              </div>

              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border-4 border-slate-200 rounded-2xl shadow-xl flex-wrap justify-center items-center p-3 hidden group-hover:flex w-64 z-30 gap-2">
                 {appearances.map(app => (
                   <div key={app} onClick={(e) => { e.stopPropagation(); setAppearance(app); }} className="cursor-pointer hover:scale-110 rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-400 transition-all w-16 h-16 shadow-sm">
                      {app.startsWith('/') ? <img src={app} className="w-full h-full object-cover" /> : <span className="text-3xl flex items-center justify-center w-full h-full">{app}</span>}
                   </div>
                 ))}
              </div>
            </button>
          </div>
        </section>

        {/* Point Allocation */}
        <section className="bg-white p-6 rounded-3xl border-4 border-slate-200 shadow-sm relative">
          <div className="sticky top-0 bg-white/90 backdrop-blur-sm pb-4 z-10 border-b-2 border-slate-100 mb-6 -mx-2 px-2 pt-2">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">ステータス振り分け</h2>
                <div className="text-sm text-slate-500 font-medium mt-1">作成コスト: <strong className="text-slate-800 text-xl">{currentCost}</strong> pt (最大600)</div>
              </div>
              <div className="text-right bg-slate-50 px-4 py-2 rounded-2xl border-2 border-slate-200">
                <span className="text-xs font-bold text-slate-400 block mb-1">残りポイント</span>
                <span className={`text-3xl font-black ${remainingCost === 0 ? 'text-emerald-500' : 'text-blue-500'}`}>
                  {remainingCost}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-200 shadow-inner">
              <div 
                className={`h-full transition-all duration-300 ${remainingCost === 0 ? 'bg-emerald-400' : 'bg-blue-400'}`}
                style={{ width: `${(currentCost / MAX_COST) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-6">
            <StatRow 
              label="HP (体力)" 
              value={stats.hp} 
              nextCost={getNextCost('hp', stats.hp)}
              onUpdate={(d) => updateStat('hp', d)}
              onDirectChange={(val) => handleDirectStatChange('hp', val)}
              canIncrease={remainingCost >= getNextCost('hp', stats.hp)}
              canDecrease={stats.hp > 1}
            />
            <StatRow 
              label="ATK (攻撃力)" 
              value={stats.atk} 
              nextCost={getNextCost('atk', stats.atk)}
              onUpdate={(d) => updateStat('atk', d)}
              onDirectChange={(val) => handleDirectStatChange('atk', val)}
              canIncrease={remainingCost >= getNextCost('atk', stats.atk)}
              canDecrease={stats.atk > 0}
            />
            <StatRow 
              label="DEF (防御力)" 
              value={stats.def} 
              nextCost={getNextCost('def', stats.def)}
              onUpdate={(d) => updateStat('def', d)}
              onDirectChange={(val) => handleDirectStatChange('def', val)}
              canIncrease={remainingCost >= getNextCost('def', stats.def)}
              canDecrease={stats.def > 0}
            />
            <hr className="border-2 border-slate-100 my-6" />
            <StatRow 
              label="MOV (移動力)" 
              value={stats.mov} 
              nextCost={getNextCost('mov', stats.mov)}
              onUpdate={(d) => updateStat('mov', d)}
              canIncrease={remainingCost >= getNextCost('mov', stats.mov)}
              canDecrease={stats.mov > 0}
            />
            <StatRow 
              label="RNG (射程)" 
              value={stats.rng} 
              nextCost={getNextCost('rng', stats.rng)}
              onUpdate={(d) => updateStat('rng', d)}
              canIncrease={remainingCost >= getNextCost('rng', stats.rng)}
              canDecrease={stats.rng > 0}
            />
            <StatRow 
              label="SENSE (索敵)" 
              value={stats.sense} 
              nextCost={getNextCost('sense', stats.sense)}
              onUpdate={(d) => updateStat('sense', d)}
              canIncrease={remainingCost >= getNextCost('sense', stats.sense)}
              canDecrease={stats.sense > 0}
            />
          </div>
        </section>

      </div>
    </div>
  );
}

function StatRow({ 
  label, value, nextCost, onUpdate, onDirectChange, canIncrease, canDecrease 
}: { 
  label: string; value: number; nextCost: number; 
  onUpdate: (delta: number) => void;
  onDirectChange?: (newVal: string) => void;
  canIncrease: boolean;
  canDecrease: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-bold text-slate-700 text-lg">{label}</div>
        <div className="text-xs text-amber-500 font-bold bg-amber-50 inline-block px-2 py-1 rounded-lg mt-1 border border-amber-200">次UP: {nextCost}pt</div>
      </div>
      
      <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-2 border-2 border-slate-200">
        <button 
          onClick={() => onUpdate(-1)}
          disabled={!canDecrease}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border-2 border-slate-200 hover:border-rose-400 hover:text-rose-500 text-slate-400 shadow-sm disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-400 transition-all font-bold text-2xl active:translate-y-1"
        >
          -
        </button>
        {onDirectChange ? (
          <input 
            type="number"
            value={value}
            onChange={(e) => onDirectChange(e.target.value)}
            className="w-20 h-12 text-center font-black text-2xl bg-white text-slate-800 border-2 border-slate-200 focus:outline-none focus:border-blue-400 rounded-xl transition-colors"
            min={0}
          />
        ) : (
          <div className="w-16 text-center font-black text-2xl text-slate-800">
            {value}
          </div>
        )}
        <button 
          onClick={() => onUpdate(1)}
          disabled={!canIncrease}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-400 hover:text-emerald-500 text-slate-400 shadow-sm disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-400 transition-all font-bold text-2xl active:translate-y-1"
        >
          +
        </button>
      </div>
    </div>
  );
}
