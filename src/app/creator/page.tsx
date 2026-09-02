'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '../../hooks/useGameStore';
import { CreatureStats, calculateTotalCost, calculateStatCost } from '../../types/game';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

const appearances = ['👾', '👻', '🤖', '👺', '👽', '🐉', '🦖', '🦇', '🦋', '🦂'];
const MAX_COST = 600;

export default function CreatorPage() {
  const router = useRouter();
  const { addCreature, isLoaded } = useGameStore();

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
      alert('名前を入力してください');
      return;
    }
    addCreature({
      name,
      appearance,
      cost: currentCost,
      stats,
    });
    alert(`保存しました！ (コスト: ${currentCost}pt)`);
    router.push('/');
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">クリーチャー作成</h1>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition-colors"
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto pb-10">
        
        {/* Basic Info */}
        <section className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-4 items-center">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-400 mb-2">名前</h2>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="クリーチャー名"
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 text-lg focus:outline-none focus:border-blue-500"
              maxLength={12}
            />
          </div>
          <div className="w-24 flex flex-col items-center">
            <h2 className="text-sm font-semibold text-slate-400 mb-2">外見</h2>
            <button className="text-4xl w-16 h-16 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center relative overflow-hidden group">
              {appearance}
              <div className="absolute inset-0 bg-black/80 flex-wrap justify-center items-center p-1 hidden group-hover:flex overflow-y-auto text-sm">
                 {appearances.map(app => (
                   <div key={app} onClick={(e) => { e.stopPropagation(); setAppearance(app); }} className="cursor-pointer hover:bg-white/20 rounded p-1">{app}</div>
                 ))}
              </div>
            </button>
          </div>
        </section>

        {/* Point Allocation */}
        <section className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="sticky top-0 bg-slate-800 pb-4 z-10 border-b border-slate-700 mb-4">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h2 className="font-semibold">ステータス振り分け</h2>
                <div className="text-xs text-slate-400">作成コスト: <strong className="text-white text-lg">{currentCost}</strong> pt (最大600pt)</div>
              </div>
              <div className="text-right">
                <span className="text-sm text-slate-400">残り</span>
                <span className={`text-2xl font-bold ml-2 ${remainingCost === 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {remainingCost}
                </span>
                <span className="text-sm text-slate-400 ml-1">/ {MAX_COST} pt</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${remainingCost === 0 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${(currentCost / MAX_COST) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-4">
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
            <hr className="border-slate-700" />
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
        <div className="font-semibold">{label}</div>
        <div className="text-[10px] text-amber-400 font-bold tracking-wider">次UP: {nextCost}pt</div>
      </div>
      
      <div className="flex items-center gap-4 bg-slate-900 rounded-lg p-1 border border-slate-700">
        <button 
          onClick={() => onUpdate(-1)}
          disabled={!canDecrease}
          className="w-10 h-10 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 font-bold text-xl"
        >
          -
        </button>
        {onDirectChange ? (
          <input 
            type="number"
            value={value}
            onChange={(e) => onDirectChange(e.target.value)}
            className="w-16 py-1 text-center font-bold text-xl bg-slate-800 text-white border border-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded"
            min={0}
          />
        ) : (
          <div className="w-12 text-center font-bold text-xl">
            {value}
          </div>
        )}
        <button 
          onClick={() => onUpdate(1)}
          disabled={!canIncrease}
          className="w-10 h-10 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 font-bold text-xl"
        >
          +
        </button>
      </div>
    </div>
  );
}
