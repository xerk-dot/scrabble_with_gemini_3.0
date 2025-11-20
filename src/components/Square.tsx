import React from 'react';
import { Square as SquareType, Player } from '@/lib/types';
import { useDroppable } from '@dnd-kit/core';
import { Tile } from './Tile';
import styles from './Square.module.css';

interface SquareProps {
    square: SquareType;
    players?: Player[];
    gameMode?: string;
}

export const Square: React.FC<SquareProps> = ({ square, players, gameMode }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `cell-${square.x}-${square.y}`,
        data: square,
    });

    const getBonusLabel = () => {
        switch (square.bonus) {
            case 'TW': return 'TRIPLE WORD SCORE';
            case 'DW': return 'DOUBLE WORD SCORE';
            case 'TL': return 'TRIPLE LETTER SCORE';
            case 'DL': return 'DOUBLE LETTER SCORE';
            case 'START': return '★';
            case 'HAZARD': return '⚠';
            default: return '';
        }
    };

    const bonusClass = square.bonus ? styles[square.bonus] : '';

    return (
        <div
            ref={setNodeRef}
            className={`${styles.square} ${bonusClass} ${isOver ? styles.over : ''}`}
        >
            {!square.tile && square.bonus && (
                <span className={styles.bonusLabel}>{getBonusLabel()}</span>
            )}
            {square.tile && (
                <Tile
                    tile={square.tile}
                    id={`board-${square.tile.id}`}
                    disabled
                    players={players}
                    gameMode={gameMode}
                />
            )}
        </div>
    );
};
