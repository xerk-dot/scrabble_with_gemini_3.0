import React from 'react';
import { useGame } from '@/context/GameContext';
import { Square } from './Square';
import styles from './Board.module.css';

interface BoardProps {
    theme?: 'classic' | 'theme1' | 'theme2';
    showTeamColors?: boolean;
}

export const Board: React.FC<BoardProps> = ({ theme = 'classic', showTeamColors = true }) => {
    const { gameState, currentMoveTiles } = useGame();
    const { board } = gameState;

    if (!board || board.length === 0) return <div>Loading Board...</div>;

    return (
        <div className={`${styles.boardContainer} ${theme === 'theme1' ? styles.theme1Board : theme === 'theme2' ? styles.theme2Board : ''}`}>
            <div className={styles.board}>
                {board.map((row, y) => (
                    <div key={y} className={styles.row}>
                        {row.map((square, x) => {
                            const tempTile = currentMoveTiles.find(t => t.x === x && t.y === y);
                            const displaySquare = tempTile ? { ...square, tile: tempTile.tile } : square;
                            return (
                                <Square
                                    key={`${x}-${y}`}
                                    square={displaySquare}
                                    players={showTeamColors ? gameState.players : undefined}
                                    gameMode={showTeamColors ? gameState.gameMode : undefined}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};
