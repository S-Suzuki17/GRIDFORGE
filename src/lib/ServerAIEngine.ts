import { Token, deduceMoveTypes, isPlayerInCheck, isCheckmate } from './GameEngine';
import { IdentityPool } from './IdentityPool';
import { PieceType } from '../config/gameConfig';
import { ISMCTS } from './ISMCTS';

export interface AIMove {
    tokenId: string;
    targetRow: number;
    targetCol: number;
    possibleTypes: PieceType[];
    promotedTo?: PieceType;
}

// 簡易的な駒の価値（確率計算用の重み）
const PIECE_VALUES = {
    King: 1000,
    Queen: 90,
    Rook: 50,
    Bishop: 30,
    Knight: 30,
    Pawn: 10
};

// 特定の駒に対する期待価値を計算
function getExpectedValue(token: Token, pool: IdentityPool): number {
    const probs = token.probabilities;
    let expected = 0;
    let totalProb = 0;
    for (const [type, prob] of Object.entries(probs)) {
        expected += PIECE_VALUES[type as keyof typeof PIECE_VALUES] * prob;
        totalProb += prob;
    }
    return totalProb > 0 ? expected / totalProb : 0;
}

export function calculateDeepMove(level: number, tokens: Token[], pool: IdentityPool, cpuPlayer: 'white' | 'black' = 'black'): AIMove | null {
    // Level 4: 1000ms search time
    // Level 5: 8000ms search time (for Vercel 10s limit)
    const timeoutMs = level === 5 ? 8000 : 1000;
    
    // First, fallback to old logic if ISMCTS fails to find a move 
    // (though ISMCTS should almost always find one if it exists).
    
    const mcts = new ISMCTS(tokens, pool, cpuPlayer);
    const bestMove = mcts.search(timeoutMs);

    if (bestMove) {
        const token = tokens.find(t => t.id === bestMove.tokenId);
        const possibilities = pool.piecePossibilities.get(bestMove.tokenId);
        if (token && possibilities) {
            const moveTypes = deduceMoveTypes(token, bestMove.targetRow, bestMove.targetCol, tokens);
            bestMove.possibleTypes = moveTypes.filter(mt => possibilities.has(mt));
            
            // Auto-promote CPU pawns to Queen
            const isBackRank = (token.player === 'white' && bestMove.targetRow === 0) || (token.player === 'black' && bestMove.targetRow === 7);
            if (isBackRank && bestMove.possibleTypes.includes('Pawn') && !token.promotedTo) {
                // To avoid collapsing non-pawns unnecessarily, we only auto-promote if the ONLY valid move type was Pawn, 
                // OR if it's a highly likely pawn move. But to keep it simple and powerful, if it CAN be a pawn, make it a Queen.
                // Wait, if it could be a Queen already, promoting to Queen is fine.
                bestMove.promotedTo = 'Queen';
                bestMove.possibleTypes = ['Pawn']; // Force collapse to Pawn
            }
        }
        return bestMove;
    }

    // --- Fallback (Greedy) if MCTS returned null ---
    const cpuTokens = tokens.filter(t => t.player === cpuPlayer && !t.isCaptured);
    const validMoves: AIMove[] = [];
    for (const token of cpuTokens) {
        const possibilities = pool.piecePossibilities.get(token.id);
        if (!possibilities || possibilities.size === 0) continue;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (token.row === r && token.col === c) continue;
                if (tokens.some(t => !t.isCaptured && t.row === r && t.col === c && t.player === cpuPlayer)) continue;
                const moveTypes = deduceMoveTypes(token, r, c, tokens);
                const validTypesForMove = moveTypes.filter(mt => possibilities.has(mt));
                if (validTypesForMove.length > 0) {
                    const isBackRank = (token.player === 'white' && r === 0) || (token.player === 'black' && r === 7);
                    if (isBackRank && validTypesForMove.includes('Pawn') && !token.promotedTo) {
                        validMoves.push({ tokenId: token.id, targetRow: r, targetCol: c, possibleTypes: ['Pawn'], promotedTo: 'Queen' });
                    } else {
                        validMoves.push({ tokenId: token.id, targetRow: r, targetCol: c, possibleTypes: validTypesForMove });
                    }
                }
            }
        }
    }
    if (validMoves.length === 0) return null;
    return validMoves[Math.floor(Math.random() * validMoves.length)];
}
