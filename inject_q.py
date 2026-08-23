import re

with open('src/lib/ServerAIEngine.ts', 'r', encoding='utf-8') as f:
    code = f.read()

quiescence_code = '''
    const quiescence = (alpha: number, beta: number, isMaximizingPlayer: boolean, currentTokens: Token[], currentPool: IdentityPool): number => {
        if (Date.now() - startTime > timeoutMs) return isMaximizingPlayer ? -Infinity : Infinity; 
        
        const standPat = evaluateState(currentTokens, currentPool, cpuPlayer);
        
        if (isMaximizingPlayer) {
            if (standPat >= beta) return beta;
            alpha = Math.max(alpha, standPat);
        } else {
            if (standPat <= alpha) return alpha;
            beta = Math.min(beta, standPat);
        }

        const currentPlayer = isMaximizingPlayer ? cpuPlayer : opponent;
        const nextMoves = getValidMoves(currentTokens, currentPool, currentPlayer).filter(m => 
            currentTokens.some(t => !t.isCaptured && t.row === m.targetRow && t.col === m.targetCol)
        );

        if (nextMoves.length === 0) return standPat;

        if (isMaximizingPlayer) {
            let maxEval = standPat;
            for (const move of nextMoves) {
                const { nextTokens: simTokens, nextPool: simPool } = applyMoveAndResolve(currentTokens, currentPool, move);
                if (!simPool.resolveGlobalConstraints(simTokens)) continue;
                if (isPlayerInCheck(currentPlayer, simTokens, simPool)) continue;
                
                const evalScore = quiescence(alpha, beta, false, simTokens, simPool);
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = standPat;
            for (const move of nextMoves) {
                const { nextTokens: simTokens, nextPool: simPool } = applyMoveAndResolve(currentTokens, currentPool, move);
                if (!simPool.resolveGlobalConstraints(simTokens)) continue;
                if (isPlayerInCheck(currentPlayer, simTokens, simPool)) continue;
                
                const evalScore = quiescence(alpha, beta, true, simTokens, simPool);
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    };
'''

# Find the start of alphaBeta
idx = code.find('const alphaBeta = (depth: number, alpha: number, beta: number, isMaximizingPlayer: boolean, currentTokens: Token[], currentPool: IdentityPool): number => {')
if idx != -1:
    code = code[:idx] + quiescence_code + '\n' + code[idx:]

# Replace evaluateState with quiescence where depth === 0
code = code.replace(
    'if (depth === 0) {\n            return evaluateState(currentTokens, currentPool, cpuPlayer);\n        }',
    'if (depth === 0) {\n            return quiescence(alpha, beta, isMaximizingPlayer, currentTokens, currentPool);\n        }'
)

code = code.replace(
    'return maxEval === -Infinity ? evaluateState(currentTokens, currentPool, cpuPlayer) : maxEval;',
    'return maxEval === -Infinity ? quiescence(alpha, beta, isMaximizingPlayer, currentTokens, currentPool) : maxEval;'
)

code = code.replace(
    'return minEval === Infinity ? evaluateState(currentTokens, currentPool, cpuPlayer) : minEval;',
    'return minEval === Infinity ? quiescence(alpha, beta, isMaximizingPlayer, currentTokens, currentPool) : minEval;'
)

code = code.replace(
    'if (nextMoves.length === 0) {\n            return evaluateState(currentTokens, currentPool, cpuPlayer);\n        }',
    'if (nextMoves.length === 0) {\n            return quiescence(alpha, beta, isMaximizingPlayer, currentTokens, currentPool);\n        }'
)

with open('src/lib/ServerAIEngine.ts', 'w', encoding='utf-8') as f:
    f.write(code)
