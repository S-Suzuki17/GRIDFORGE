'use client';

import React from 'react';
import { PieceType } from '../config/gameConfig';

interface QuantumPieceProps {
    id: string;
    player: 'white' | 'black';
    probabilities: Record<PieceType, number>;
    isSelected: boolean;
    onClick: () => void;
    promotedTo?: PieceType;
}

const PIECE_SYMBOLS: Record<PieceType, string> = {
    King: '♚', Queen: '♛', Rook: '♜', Bishop: '♝', Knight: '♞', Pawn: '♟'
};

export const QuantumPieceUI: React.FC<QuantumPieceProps> = ({ id, player, probabilities, isSelected, onClick, promotedTo }) => {
    const possibleTypes = (Object.keys(probabilities) as PieceType[]).filter(type => probabilities[type] > 0);
    
    // If it's promoted, it is definitively that piece visually
    const confirmedType = promotedTo ? promotedTo : (possibleTypes.length === 1 ? possibleTypes[0] : null);

    const isWhite = player === 'white';
    const baseColor = isWhite ? 'bg-blue-900' : 'bg-red-950';
    const glowColor = isWhite ? 'ring-blue-400' : 'ring-red-500';
    const textColor = isWhite ? 'text-blue-100' : 'text-red-100';
    const borderColor = isWhite ? 'border-blue-400' : 'border-red-500';

    return (
        <>
            {/* 量子ゆらぎアニメーション用のインラインCSS */}
            <style>{`
                @keyframes quantum-jitter {
                    0% { transform: translate(0px, 0px) scale(1) rotate(0deg); opacity: 0.8; }
                    33% { transform: translate(1px, -1px) scale(1.1) rotate(2deg); opacity: 1; }
                    66% { transform: translate(-1px, 1px) scale(0.9) rotate(-2deg); opacity: 0.9; }
                    100% { transform: translate(0px, 0px) scale(1) rotate(0deg); opacity: 0.8; }
                }
                .quantum-icon {
                    animation: quantum-jitter 1s infinite alternate ease-in-out;
                    display: inline-block;
                }
            `}</style>

            <div 
                onClick={onClick}
                className={`
                    relative w-12 h-12 cursor-pointer transition-all duration-300
                    flex items-center justify-center overflow-hidden
                    ${confirmedType ? 'rounded-lg' : 'rounded-full'} /* 未確定は丸形、確定は少し四角く */
                    ${isSelected ? `ring-4 ${glowColor} scale-110 z-10` : `hover:scale-105 hover:ring-2 hover:${glowColor}/50 border-2 ${borderColor}/30`}
                    ${confirmedType ? `bg-[#111] border-2 ${borderColor}` : `${baseColor} shadow-[0_0_15px_currentColor] ${textColor}`}
                `}
            >
                {confirmedType ? (
                    <span className={`text-3xl ${textColor} drop-shadow-[0_0_8px_currentColor] transition-transform duration-500 scale-110`}>
                        {PIECE_SYMBOLS[confirmedType]}
                    </span>
                ) : (
                    // 未確定時：絵柄がそれぞれランダムに揺らぐ
                    <div className="flex flex-wrap justify-center items-center content-center p-0.5 w-full h-full">
                        {possibleTypes.map((type, index) => (
                            <span 
                                key={type} 
                                title={type} 
                                className={`quantum-icon text-[13px] leading-none m-[1px] ${textColor}`}
                                // 絵柄ごとにアニメーションのタイミングをずらす
                                style={{ animationDelay: `${(index * 0.17) % 1}s` }}
                            >
                                {PIECE_SYMBOLS[type]}
                            </span>
                        ))}
                    </div>
                )}

                {!confirmedType && (
                    <div className="absolute bottom-0 w-full flex justify-center opacity-60">
                        {possibleTypes.map(type => (
                            <div 
                                key={type} 
                                className={`h-[2px] ${isWhite ? 'bg-blue-300' : 'bg-red-400'}`}
                                style={{ width: `${Math.max(probabilities[type] * 100, 10)}%` }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};
