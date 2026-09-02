export interface CreatureStats {
  hp: number;    // 1pt = 1
  atk: number;   // 1pt = 1
  def: number;   // 1pt = 1
  mov: number;   // 30pt = 1
  rng: number;   // 30pt = 1
  sense: number; // 40pt = 1
}

export interface Creature {
  id: string;
  name: string;
  appearance: string;
  cost: number;
  stats: CreatureStats;
  createdAt: number;
}

export interface Team {
  id: string;
  name: string;
  size: number;
  creatures: Creature[];
  createdAt: number;
}

export const calculateStatCost = (key: keyof CreatureStats, val: number): number => {
  let base = 1, threshold = 20, inc = 1;
  
  if (key === 'mov' || key === 'rng') {
    base = 30; threshold = 2; inc = 30;
  } else if (key === 'sense') {
    base = 40; threshold = 1; inc = 40;
  }

  let cost = 0;
  for(let i = 1; i <= val; i++) {
    const tier = Math.floor((i - 1) / threshold);
    cost += base + tier * inc;
  }
  return cost;
};

export const calculateTotalCost = (stats: CreatureStats): number => {
  return (
    calculateStatCost('hp', stats.hp) +
    calculateStatCost('atk', stats.atk) +
    calculateStatCost('def', stats.def) +
    calculateStatCost('mov', stats.mov) +
    calculateStatCost('rng', stats.rng) +
    calculateStatCost('sense', stats.sense)
  );
};
