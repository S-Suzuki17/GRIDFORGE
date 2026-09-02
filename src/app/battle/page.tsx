'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, EyeOff, X, Crosshair } from 'lucide-react';
import { useGameStore } from '../../hooks/useGameStore';
import { Creature, CreatureStats, calculateTotalCost, calculateStatCost } from '../../types/game';
import { Toast } from '../../components/Toast';

type CellState = {
  type: 'empty' | 'wall';
  unit?: BattleUnit | null;
  isPlayerArea: boolean;
  isEnemyArea: boolean;
};

type BattleUnit = {
  id: string;
  isEnemy: boolean;
  isCommander: boolean;
  name: string;
  appearance: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  mov: number;
  rng: number;
  sense: number;
  hasActed?: boolean;
};

type Coordinate = { x: number, y: number };

export default function BattlePage() {
  const { isLoaded, teams, activeTeamId } = useGameStore();
  const [phase, setPhase] = useState<'placement' | 'battle' | 'result'>('placement');
  const [currentTurn, setCurrentTurn] = useState<'player' | 'enemy'>('player');
  const [resultMessage, setResultMessage] = useState('');
  const [board, setBoard] = useState<CellState[][]>([]);
  const boardRef = useRef<CellState[][]>([]);
  
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  
  const [inspectedUnitId, setInspectedUnitId] = useState<string | null>(null);
  const inspectedUnit = useMemo(() => {
    if (!inspectedUnitId) return null;
    for (const row of board) {
      for (const cell of row) {
         if (cell.unit && cell.unit.id === inspectedUnitId) return cell.unit;
      }
    }
    return null;
  }, [inspectedUnitId, board]);

  // Battle State
  const [activeUnitPos, setActiveUnitPos] = useState<Coordinate | null>(null);
  const [activeAction, setActiveAction] = useState<'move' | 'attack' | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<Coordinate[]>([]);

  const displayUnit = inspectedUnit || (activeUnitPos ? board[activeUnitPos.y][activeUnitPos.x].unit : null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
  }, []);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  
  const [pendingPlacement, setPendingPlacement] = useState<BattleUnit[]>([]);
  const [selectedToPlace, setSelectedToPlace] = useState<BattleUnit | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const newBoard: CellState[][] = Array(7).fill(null).map((_, y) => 
      Array(7).fill(null).map((_, x) => ({
        type: 'empty', isEnemyArea: y <= 1, isPlayerArea: y >= 5, unit: null,
      }))
    );
    const wallCount = Math.floor(Math.random() * 6);
    let wallsPlaced = 0;
    while (wallsPlaced < wallCount) {
      const rx = Math.floor(Math.random() * 7);
      const ry = Math.floor(Math.random() * 3) + 2; 
      if (newBoard[ry][rx].type === 'empty') {
        newBoard[ry][rx].type = 'wall';
        wallsPlaced++;
      }
    }
    setBoard(newBoard);

    const active = teams.find(t => t.id === activeTeamId) || teams[0];
    const teamCreatures = active ? active.creatures : [];

    const commander: BattleUnit = {
      id: 'commander_player', isEnemy: false, isCommander: true,
      name: 'PLAYER', appearance: '/creatures/mecha.jpg', hp: 100, maxHp: 100, atk: 15, def: 5,
      mov: 2, rng: 2, sense: 2, hasActed: false
    };

    const friendlyUnits: BattleUnit[] = teamCreatures.map((c, i) => ({
      id: `friendly_${i}_${c.id}`, isEnemy: false, isCommander: false,
      name: c.name, appearance: c.appearance, hp: c.stats.hp, maxHp: c.stats.hp,
      atk: c.stats.atk, def: c.stats.def,
      mov: c.stats.mov,
      rng: c.stats.rng,
      sense: c.stats.sense,
      hasActed: false
    }));

    setPendingPlacement([commander, ...friendlyUnits]);
  }, [isLoaded, teams, activeTeamId]);

  // Shared BFS for MOV, RNG, and SENSE
  // isMovement: if true, blocked by units. If false, blocked only by walls.
  const calculateBFS = useCallback((startX: number, startY: number, maxDist: number, isMovement: boolean, currentBoard: CellState[][]) => {
    const reachable: Coordinate[] = [];
    const visited = new Set<string>();
    const queue: { x: number, y: number, dist: number }[] = [{ x: startX, y: startY, dist: 0 }];
    
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const key = `${curr.x},${curr.y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      
      if (curr.dist > 0) {
        reachable.push({ x: curr.x, y: curr.y });
      }

      if (curr.dist < maxDist) {
        const neighbors = [
          { x: curr.x, y: curr.y - 1 }, { x: curr.x, y: curr.y + 1 },
          { x: curr.x - 1, y: curr.y }, { x: curr.x + 1, y: curr.y }
        ];
        
        for (const n of neighbors) {
          if (n.x >= 0 && n.x < 7 && n.y >= 0 && n.y < 7) {
            const cell = currentBoard[n.y][n.x];
            // Walls block everything (MOV, RNG, SENSE)
            if (cell.type === 'wall') continue;
            
            // For movement, other units block the path
            if (isMovement && cell.unit && !(n.x === startX && n.y === startY)) continue;

            queue.push({ x: n.x, y: n.y, dist: curr.dist + 1 });
          }
        }
      }
    }
    return reachable;
  }, []);

  // Damage calculation with Flanking Bonus
  const calculateDamage = useCallback((attacker: BattleUnit, attackerX: number, attackerY: number, defender: BattleUnit, defX: number, defY: number, currentBoard: CellState[][]) => {
    const neighbors = [
      {x: defX, y: defY - 1}, {x: defX, y: defY + 1},
      {x: defX - 1, y: defY}, {x: defX + 1, y: defY}
    ];
    let supportCount = 0;
    for (const n of neighbors) {
      if (n.x >= 0 && n.x < 7 && n.y >= 0 && n.y < 7) {
        if (n.x === attackerX && n.y === attackerY) continue; // Skip the attacker
        const u = currentBoard[n.y][n.x].unit;
        if (u && u.isEnemy === attacker.isEnemy) {
          supportCount++;
        }
      }
    }
    
    const baseDamage = Math.max(1, attacker.atk - defender.def);
    const bonusDamage = supportCount * 15; // +15 damage per supporting ally!
    return { damage: baseDamage + bonusDamage, supportCount };
  }, []);

  // Calculate visible cells based on all friendly units' SENSE
  const visibleCells = useMemo(() => {
    if (phase !== 'battle') return new Set<string>();
    const visible = new Set<string>();
    board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell.unit && !cell.unit.isEnemy) {
          visible.add(`${x},${y}`); // See own cell
          if (cell.unit.sense > 0) {
            const seen = calculateBFS(x, y, cell.unit.sense, false, board);
            seen.forEach(s => visible.add(`${s.x},${s.y}`));
          }
        }
      });
    });
    return visible;
  }, [board, phase, calculateBFS]);

  const handleCellClick = (x: number, y: number) => {
    const cell = board[y][x];

    if (phase === 'placement') {
      if (cell.isPlayerArea && cell.type === 'empty' && !cell.unit && selectedToPlace) {
        const newBoard = [...board];
        newBoard[y] = [...newBoard[y]];
        newBoard[y][x] = { ...newBoard[y][x], unit: selectedToPlace };
        setBoard(newBoard);
        setPendingPlacement(prev => prev.filter(u => u.id !== selectedToPlace.id));
        setSelectedToPlace(null);
      } else if (cell.isPlayerArea && cell.unit && !cell.unit.isEnemy) {
        const unitToReturn = cell.unit;
        const newBoard = [...board];
        newBoard[y] = [...newBoard[y]];
        newBoard[y][x] = { ...newBoard[y][x], unit: null };
        setBoard(newBoard);
        setPendingPlacement(prev => [...prev, unitToReturn]);
        if (selectedToPlace) setSelectedToPlace(null);
      }
      return;
    }

    if (phase === 'battle') {
      const isVisible = visibleCells.has(`${x},${y}`);
      const isHiddenEnemy = cell.unit?.isEnemy && !isVisible;
      if (cell.unit && !isHiddenEnemy) {
        setInspectedUnitId(cell.unit.id);
      }

      if (currentTurn !== 'player') return;

      const isHighlighted = highlightedCells.some(c => c.x === x && c.y === y);

      if (activeAction === 'move' && activeUnitPos && isHighlighted) {
        // Execute Move
        const newBoard = [...board];
        const unit = newBoard[activeUnitPos.y][activeUnitPos.x].unit!;
        
        newBoard[activeUnitPos.y] = [...newBoard[activeUnitPos.y]];
        newBoard[activeUnitPos.y][activeUnitPos.x] = { ...newBoard[activeUnitPos.y][activeUnitPos.x], unit: null };
        
        newBoard[y] = [...newBoard[y]];
        newBoard[y][x] = { ...newBoard[y][x], unit: unit };
        
        setBoard(newBoard);
        setActiveUnitPos({ x, y });
        setActiveAction('attack');
        const attackable = calculateBFS(x, y, unit.rng, false, board);
        setHighlightedCells(attackable.filter(c => visibleCells.has(`${c.x},${c.y}`)));
        return;
      }

      if (activeAction === 'attack' && activeUnitPos && isHighlighted) {
        // Execute Attack if there is an enemy
        if (cell.unit && cell.unit.isEnemy) {
           const attacker = board[activeUnitPos.y][activeUnitPos.x].unit!;
           const defender = cell.unit;
           
           // Check if visible
           if (!visibleCells.has(`${x},${y}`)) {
              showToast('見えない敵を攻撃することはできません。');
              return;
           }

           const { damage, supportCount } = calculateDamage(attacker, activeUnitPos.x, activeUnitPos.y, defender, x, y, board);
           const newHp = defender.hp - damage;
           
           const newBoard = [...board];
           newBoard[y] = [...newBoard[y]];
           
           let alertMsg = supportCount > 0 
             ? `包囲ボーナス！(+${supportCount * 15}) 敵に ${damage} ダメージ！` 
             : `敵に ${damage} ダメージ！`;
           
           if (newHp <= 0) {
             // Enemy defeated
             alertMsg += '撃破しました！';
             showToast(alertMsg);
             newBoard[y][x] = { ...newBoard[y][x], unit: null };
             if (defender.isCommander) { 
               setPhase('result');
               setResultMessage('VICTORY! 敵将を討ち取りました！');
             } else {
               const hasEnemies = newBoard.some(r => r.some(c => c.unit && c.unit.isEnemy));
               if (!hasEnemies) {
                 setPhase('result');
                 setResultMessage('VICTORY! すべての敵を撃破しました！');
               }
             }
           } else {
             alertMsg += `（残りHP: ${newHp}）`;
             showToast(alertMsg);
             newBoard[y][x] = { ...newBoard[y][x], unit: { ...defender, hp: newHp } };
           }
           // End attacker's turn
           newBoard[activeUnitPos.y] = [...newBoard[activeUnitPos.y]];
           newBoard[activeUnitPos.y][activeUnitPos.x] = { ...newBoard[activeUnitPos.y][activeUnitPos.x], unit: { ...attacker, hasActed: true } };
           
           setBoard(newBoard);
           setActiveUnitPos(null);
           setActiveAction(null);
           setHighlightedCells([]);
           return;
        }
      }

      // Select a friendly unit
      if (cell.unit && !cell.unit.isEnemy && !cell.unit.hasActed) {
        if (activeAction === 'attack') {
          showToast('移動完了後は、攻撃対象を選択するか待機してください。');
          return;
        }
        if (activeUnitPos?.x === x && activeUnitPos?.y === y) {
          // Deselect
          setActiveUnitPos(null);
          setActiveAction(null);
          setHighlightedCells([]);
        } else {
          // Select for Move
          setActiveUnitPos({ x, y });
          setActiveAction('move');
          setHighlightedCells(calculateBFS(x, y, cell.unit.mov, true, board));
        }
      }
    }
  };

  const skipAction = () => {
    if (activeUnitPos && activeAction) {
      if (activeAction === 'move') {
        // Skip move, go to attack
        const unit = board[activeUnitPos.y][activeUnitPos.x].unit!;
        setActiveAction('attack');
        const attackable = calculateBFS(activeUnitPos.x, activeUnitPos.y, unit.rng, false, board);
        setHighlightedCells(attackable.filter(c => visibleCells.has(`${c.x},${c.y}`)));
      } else if (activeAction === 'attack') {
        // Skip attack, end turn for this unit
        const newBoard = [...board];
        const unit = newBoard[activeUnitPos.y][activeUnitPos.x].unit!;
        newBoard[activeUnitPos.y] = [...newBoard[activeUnitPos.y]];
        newBoard[activeUnitPos.y][activeUnitPos.x] = { ...newBoard[activeUnitPos.y][activeUnitPos.x], unit: { ...unit, hasActed: true } };
        setBoard(newBoard);
        setActiveUnitPos(null);
        setActiveAction(null);
        setHighlightedCells([]);
      }
    }
  };

  const startBattle = () => {
    if (pendingPlacement.length > 0) {
      showToast('すべてのユニットを配置してください');
      return;
    }
    const numEnemies = Math.floor(Math.random() * 5) + 1; // 1 to 5
    let remainingPts = 600;
    
    const enemies = Array(numEnemies).fill(null).map((_, i) => ({
      id: `enemy_rand_${i}`,
      isEnemy: true,
      isCommander: false,
      name: `CPU兵 ${i+1}`,
      appearance: ['/creatures/knight.jpg', '/creatures/mage.jpg', '/creatures/ninja.jpg', '/creatures/heavy.jpg', '/creatures/mecha.jpg'][Math.floor(Math.random() * 5)],
      hp: 1, maxHp: 1, atk: 0, def: 0, mov: 1, rng: 1, sense: 0,
      hasActed: false
    }));

    // Deduct base costs
    remainingPts -= numEnemies * calculateTotalCost({ hp: 1, atk: 0, def: 0, mov: 1, rng: 1, sense: 0 });

    while(remainingPts > 0) {
      const e = enemies[Math.floor(Math.random() * enemies.length)];
      
      const getNextCost = (key: keyof CreatureStats, val: number) => {
         return calculateStatCost(key, val + 1) - calculateStatCost(key, val);
      };

      const options: {key: string, cost: number}[] = [];
      const hpCost = getNextCost('hp', e.hp);
      if (remainingPts >= hpCost) options.push({key: 'hp', cost: hpCost});
      
      const atkCost = getNextCost('atk', e.atk);
      if (remainingPts >= atkCost) options.push({key: 'atk', cost: atkCost});
      
      const defCost = getNextCost('def', e.def);
      if (remainingPts >= defCost) options.push({key: 'def', cost: defCost});
      
      const movCost = getNextCost('mov', e.mov);
      if (remainingPts >= movCost) options.push({key: 'mov', cost: movCost});
      
      const rngCost = getNextCost('rng', e.rng);
      if (remainingPts >= rngCost) options.push({key: 'rng', cost: rngCost});
      
      const senseCost = getNextCost('sense', e.sense);
      if (remainingPts >= senseCost) options.push({key: 'sense', cost: senseCost});

      if (options.length === 0) break; // Should not happen since HP cost starts low, but just in case

      const pick = options[Math.floor(Math.random() * options.length)];
      (e as any)[pick.key] += 1;
      remainingPts -= pick.cost;
    }
    
    enemies.forEach(e => e.maxHp = e.hp);

    const enemyUnits: BattleUnit[] = [
      {
        id: 'commander_enemy', isEnemy: true, isCommander: true,
        name: 'CPU大将', appearance: '/creatures/heavy.jpg', hp: 100, maxHp: 100, atk: 15, def: 5,
        mov: 2, rng: 2, sense: 2, hasActed: false
      },
      ...enemies
    ];

    const availableCells: {x: number, y: number}[] = [];
    for(let y=0; y<=1; y++) {
      for(let x=0; x<7; x++) {
         if (board[y][x].type === 'empty') availableCells.push({x, y});
      }
    }
    
    for(let i = availableCells.length - 1; i > 0; i--) {
       const j = Math.floor(Math.random() * (i + 1));
       [availableCells[i], availableCells[j]] = [availableCells[j], availableCells[i]];
    }

    const newBoard = [...board].map(row => [...row]);
    enemyUnits.forEach((unit, idx) => {
       if (idx < availableCells.length) {
         const {x, y} = availableCells[idx];
         newBoard[y][x] = { ...newBoard[y][x], unit };
       }
    });

    setBoard(newBoard);
    setPhase('battle');
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  useEffect(() => {
    if (currentTurn === 'enemy' && phase === 'battle') {
      const runEnemyTurn = async () => {
        // Collect all enemies on the board
        const enemyIds: string[] = [];
        boardRef.current.forEach(row => row.forEach(c => {
          if (c.unit && c.unit.isEnemy) enemyIds.push(c.unit.id);
        }));

        for (const eId of enemyIds) {
          await delay(600); // Wait between units
          
          let ex = -1, ey = -1;
          let enemyUnit = null;
          for (let y = 0; y < 7; y++) {
            for (let x = 0; x < 7; x++) {
              const u = boardRef.current[y][x].unit;
              if (u && u.id === eId) { ex = x; ey = y; enemyUnit = u; break; }
            }
          }
          if (!enemyUnit) continue; // Enemy might have died somehow

          // 1. Move phase
          // Find player units
          const playerUnits: {x: number, y: number, unit: BattleUnit}[] = [];
          boardRef.current.forEach((r, y) => r.forEach((c, x) => {
            if (c.unit && !c.unit.isEnemy) playerUnits.push({x, y, unit: c.unit});
          }));

          if (playerUnits.length === 0) continue;

          // Find target by evaluating distance and commander status
          playerUnits.sort((a, b) => {
             const distA = Math.abs(a.x - ex) + Math.abs(a.y - ey);
             const distB = Math.abs(b.x - ex) + Math.abs(b.y - ey);
             
             // Huge penalty to distance score if it's the commander, making them the primary target
             const scoreA = distA + (a.unit.isCommander ? -100 : 0);
             const scoreB = distB + (b.unit.isCommander ? -100 : 0);
             return scoreA - scoreB;
          });
          const target = playerUnits[0];

          // Calculate all reachable cells
          const reachable = calculateBFS(ex, ey, enemyUnit.mov, true, boardRef.current);
          reachable.push({x: ex, y: ey}); // including staying in place
          
          // Pick the cell that gets us closest to the target
          reachable.sort((a, b) => {
             const distA = Math.abs(a.x - target.x) + Math.abs(a.y - target.y);
             const distB = Math.abs(b.x - target.x) + Math.abs(b.y - target.y);
             return distA - distB;
          });

          const bestMove = reachable[0];
          
          let newBoard = [...boardRef.current];
          if (bestMove.x !== ex || bestMove.y !== ey) {
             const unitToMove = newBoard[ey][ex].unit!;
             newBoard[ey] = [...newBoard[ey]];
             newBoard[ey][ex] = { ...newBoard[ey][ex], unit: null };
             
             newBoard[bestMove.y] = [...newBoard[bestMove.y]];
             newBoard[bestMove.y][bestMove.x] = { ...newBoard[bestMove.y][bestMove.x], unit: unitToMove };
             
             setBoard(newBoard);
             boardRef.current = newBoard;
             ex = bestMove.x; 
             ey = bestMove.y;
             await delay(400); // short pause after move
          }

          // 2. Attack phase
          const attackable = calculateBFS(ex, ey, enemyUnit.rng, false, boardRef.current);
          let targetToAttack = null;
          for (const cell of attackable) {
             const u = boardRef.current[cell.y][cell.x].unit;
             if (u && !u.isEnemy) {
               targetToAttack = { x: cell.x, y: cell.y, unit: u };
               if (u.isCommander) break; // Prefer commander
             }
          }

          if (targetToAttack) {
             const { damage, supportCount } = calculateDamage(enemyUnit, ex, ey, targetToAttack.unit, targetToAttack.x, targetToAttack.y, boardRef.current);
             const newHp = targetToAttack.unit.hp - damage;
             
             newBoard = [...boardRef.current];
             newBoard[targetToAttack.y] = [...newBoard[targetToAttack.y]];
             
             if (newHp <= 0) {
                newBoard[targetToAttack.y][targetToAttack.x] = { ...newBoard[targetToAttack.y][targetToAttack.x], unit: null };
                if (targetToAttack.unit.isCommander) {
                   setPhase('result');
                   setResultMessage('DEFEAT... 大将が討たれました');
                }
             } else {
                newBoard[targetToAttack.y][targetToAttack.x] = { ...newBoard[targetToAttack.y][targetToAttack.x], unit: { ...targetToAttack.unit, hp: newHp } };
             }
             
             setBoard(newBoard);
             boardRef.current = newBoard;
          }

          // Mark as acted
          newBoard = [...boardRef.current];
          newBoard[ey] = [...newBoard[ey]];
          newBoard[ey][ex] = { ...newBoard[ey][ex], unit: { ...newBoard[ey][ex].unit!, hasActed: true } };
          setBoard(newBoard);
          boardRef.current = newBoard;
        }

        await delay(500);

        // Turn ends, pass back to player
        // Reset all units hasActed
        const finalBoard = boardRef.current.map(row => row.map(c => {
          if (c.unit) return { ...c, unit: { ...c.unit, hasActed: false } };
          return c;
        }));
        setBoard(finalBoard);
        setCurrentTurn('player');
      };

      runEnemyTurn();
    }
  }, [currentTurn, phase, calculateBFS]);

  const endTurn = () => {
    setActiveUnitPos(null);
    setActiveAction(null);
    setHighlightedCells([]);
    setCurrentTurn('enemy');
  };

  if (!isLoaded || board.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-amber-50 relative overflow-hidden">
      <Toast message={toastMsg} isVisible={toastVisible} onClose={() => setToastVisible(false)} />
      <div className="absolute inset-0 opacity-40 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #fef3c7 0%, #fdf8f6 100%)' }} />
           
      <div className="relative z-10 p-4 max-w-4xl mx-auto w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="p-3 bg-white border-2 border-slate-200 rounded-2xl hover:border-slate-400 hover:shadow-md transition-all">
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-wider">
              GRIDFORGE
            </h1>
            <div className="text-slate-500 text-sm font-bold mt-1">
              {phase === 'placement' ? '— 配置フェーズ —' : phase === 'battle' ? '— バトルフェーズ —' : '— 決着 —'}
            </div>
          </div>
          {phase === 'placement' ? (
            <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 hover:border-slate-400 rounded-xl text-sm font-bold text-slate-600 shadow-sm transition-all active:translate-y-1">
              <RefreshCw className="w-4 h-4" /> 地形変更
            </button>
          ) : phase === 'battle' ? (
            <button onClick={endTurn} className="px-5 py-2 bg-blue-500 hover:bg-blue-400 rounded-xl font-bold text-sm text-white shadow-md active:translate-y-1 transition-all">
              ターン終了
            </button>
          ) : <div className="w-24"></div>}
        </div>

        {phase === 'result' ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-8 drop-shadow-sm">{resultMessage}</h2>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white text-xl rounded-2xl font-bold shadow-lg hover:shadow-xl active:translate-y-1 transition-all">
              もう一度プレイ
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
              <div className="grid grid-cols-7 gap-1 sm:gap-2 p-3 sm:p-5 bg-white rounded-3xl border-4 border-slate-200 shadow-xl mb-4 relative">
                {board.map((row, y) => 
                  row.map((cell, x) => {
                    let cellBg = "bg-slate-50"; 
                    let cellBorder = "border-2 border-slate-200";

                    if (cell.isPlayerArea) {
                      cellBg = phase === 'placement' ? "bg-blue-50 hover:bg-blue-100 cursor-pointer" : "bg-slate-50";
                      if (phase === 'placement') cellBorder = "border-2 border-blue-200 border-dashed";
                    }
                    if (cell.isEnemyArea) {
                      cellBg = "bg-rose-50";
                      cellBorder = "border-2 border-rose-100";
                    }
                    if (cell.type === 'wall') {
                      cellBg = "bg-amber-100";
                      cellBorder = "border-4 border-amber-300 shadow-sm";
                    }

                    const isVisible = visibleCells.has(`${x},${y}`);
                    const isHiddenEnemy = phase === 'battle' && cell.unit && cell.unit.isEnemy && !isVisible;
                    
                    if (phase === 'battle' && !isVisible) {
                      cellBg = "bg-slate-200";
                      cellBorder = "border-2 border-slate-300";
                    }
                    
                    const isHighlighted = highlightedCells.some(c => c.x === x && c.y === y);
                    const isActive = activeUnitPos?.x === x && activeUnitPos?.y === y;

                    // Highlight colors
                    let highlightClass = '';
                    if (isHighlighted) {
                      if (activeAction === 'move') highlightClass = 'bg-cyan-100 border-cyan-400 border-4 cursor-pointer hover:bg-cyan-200 shadow-inner z-10';
                      if (activeAction === 'attack') highlightClass = 'bg-rose-100 border-rose-400 border-4 cursor-pointer hover:bg-rose-200 shadow-inner z-10';
                    }

                    return (
                      <div 
                        key={`${x}-${y}`} 
                        onClick={() => handleCellClick(x, y)}
                        className={`w-11 h-11 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-colors relative
                          ${cellBg}
                          ${cellBorder}
                          ${highlightClass}
                          ${isActive ? 'ring-4 ring-amber-400 ring-offset-2 z-20' : ''}
                          ${phase === 'battle' && cell.unit && !cell.unit.isEnemy && !cell.unit.hasActed && !isActive ? 'cursor-pointer hover:ring-4 hover:ring-blue-300 hover:ring-offset-1' : ''}
                        `}
                      >
                        {cell.type === 'wall' && (
                          <div className={`text-2xl sm:text-4xl drop-shadow-sm ${phase === 'battle' && !isVisible ? 'opacity-40 grayscale' : ''}`}>🪨</div>
                        )}
                        
                        {cell.unit && !isHiddenEnemy && (
                          <div className={`text-2xl sm:text-4xl w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white border-4 flex items-center justify-center rounded-full shadow-[0_4px_0_rgba(0,0,0,0.1)] relative select-none transform transition-transform ${cell.unit.isEnemy ? 'border-rose-400' : 'border-blue-400'} ${cell.unit.hasActed ? 'opacity-50 grayscale scale-95' : 'hover:scale-105'} ${isActive ? 'scale-110 -translate-y-1 shadow-[0_6px_0_rgba(0,0,0,0.15)]' : ''}`}>
                            {cell.unit.appearance.startsWith('/') ? <img src={cell.unit.appearance} className="w-full h-full object-cover rounded-full" /> : cell.unit.appearance}
                            <div className={`absolute -bottom-2 -right-1 text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-md text-white shadow-sm ${cell.unit.isEnemy ? 'bg-rose-500' : 'bg-blue-500'}`}>
                              {cell.unit.hp}
                            </div>
                          </div>
                        )}
                        
                        {/* Target reticle for attack phase if enemy is visible */}
                        {isHighlighted && activeAction === 'attack' && cell.unit && cell.unit.isEnemy && isVisible && (
                          <div className="absolute inset-0 flex items-center justify-center text-rose-500 animate-pulse pointer-events-none z-30">
                             <Crosshair className="w-10 h-10 sm:w-14 sm:h-14 drop-shadow-md" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white border-4 border-slate-200 p-4 rounded-3xl min-h-[140px] shadow-sm">
              {phase === 'placement' && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3 overflow-x-auto pb-3 px-2">
                    {pendingPlacement.map(unit => (
                      <div 
                        key={unit.id}
                        onClick={() => setSelectedToPlace(selectedToPlace?.id === unit.id ? null : unit)}
                        className={`cursor-pointer min-w-[70px] p-2 rounded-2xl border-4 text-center transition-all shadow-sm active:translate-y-1 ${
                          selectedToPlace?.id === unit.id ? 'bg-amber-50 border-amber-400 -translate-y-2 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-3xl mb-1 flex items-center justify-center h-10">{unit.appearance.startsWith('/') ? <img src={unit.appearance} className="w-10 h-10 object-cover rounded-full" /> : unit.appearance}</div>
                        <div className="text-[10px] font-black text-slate-700 truncate">{unit.isCommander ? '大将' : unit.name}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-1 px-2">
                    <span className="text-sm font-bold text-slate-500">点線の青マスをタップして配置</span>
                    <button 
                      onClick={startBattle}
                      disabled={pendingPlacement.length > 0}
                      className="px-6 py-3 bg-rose-500 hover:bg-rose-400 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-all shadow-md active:translate-y-1 disabled:shadow-none disabled:active:translate-y-0"
                    >
                      バトル開始
                    </button>
                  </div>
                </div>
              )}

              {phase === 'battle' && (
                <div className="flex flex-col h-full justify-center px-2">
                  {displayUnit && (
                    <div className={`mb-4 p-3 rounded-2xl border-2 text-sm flex flex-wrap justify-between items-center shadow-inner ${displayUnit.isEnemy ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl bg-white w-10 h-10 rounded-full flex items-center justify-center border-2 border-slate-200 shadow-sm">{displayUnit.appearance.startsWith('/') ? <img src={displayUnit.appearance} className="w-full h-full object-cover rounded-full" /> : displayUnit.appearance}</span>
                        <span className="font-black text-lg flex items-center gap-2">
                          {displayUnit.name}
                          {displayUnit.isEnemy && <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full">ENEMY</span>}
                        </span>
                      </div>
                      <div className="flex gap-2 sm:gap-4 font-bold">
                        <span className="bg-white px-2 py-1 rounded-lg border border-slate-200"><span className="text-rose-500 mr-1">HP</span>{displayUnit.hp}/{displayUnit.maxHp}</span>
                        <span className="bg-white px-2 py-1 rounded-lg border border-slate-200"><span className="text-amber-500 mr-1">ATK</span>{displayUnit.atk}</span>
                        <span className="bg-white px-2 py-1 rounded-lg border border-slate-200"><span className="text-blue-500 mr-1">DEF</span>{displayUnit.def}</span>
                        <span className="bg-white px-2 py-1 rounded-lg border border-slate-200"><span className="text-emerald-500 mr-1">MOV</span>{displayUnit.mov}</span>
                        <span className="bg-white px-2 py-1 rounded-lg border border-slate-200"><span className="text-purple-500 mr-1">RNG</span>{displayUnit.rng}</span>
                        <span className="bg-white px-2 py-1 rounded-lg border border-slate-200"><span className="text-cyan-500 mr-1">SNS</span>{displayUnit.sense}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      {activeUnitPos ? (
                          <div className="flex items-center gap-3">
                            <span className="text-base font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-xl border-2 border-amber-200">
                              {activeAction === 'move' ? '移動先を選択' : '攻撃対象を選択'}
                            </span>
                            <button 
                              onClick={skipAction}
                              className="px-4 py-2 bg-slate-100 border-2 border-slate-200 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                            >
                              {activeAction === 'move' ? '移動しない' : '攻撃しない (待機)'}
                            </button>
                            {activeAction === 'move' && (
                              <button 
                                onClick={() => { setActiveUnitPos(null); setActiveAction(null); setHighlightedCells([]); }}
                                className="p-2 bg-slate-100 border-2 border-slate-200 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-colors"
                              >
                                <X className="w-5 h-5"/>
                              </button>
                            )}
                          </div>
                      ) : (
                          <span className="text-sm font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border-2 border-slate-100">
                            {currentTurn === 'player' ? '未行動のユニットをタップして指示を出してください' : '相手のターンです...'}
                          </span>
                      )}
                    </div>
                    <div className={`px-5 py-2 border-4 rounded-2xl text-lg font-black shadow-sm transform -rotate-2 transition-all duration-500 ${currentTurn === 'player' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-rose-100 border-rose-300 text-rose-700 scale-110'}`}>
                      {currentTurn === 'player' ? 'PLAYER TURN' : 'ENEMY TURN'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
