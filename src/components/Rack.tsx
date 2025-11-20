import React from 'react';
import { useGame } from '@/context/GameContext';
import { Tile } from './Tile';
import { useDroppable } from '@dnd-kit/core';
import styles from './Rack.module.css';

interface RackProps {
    showTeamColors?: boolean;
}

export const Rack: React.FC<RackProps> = ({ showTeamColors = true }) => {
    const { gameState } = useGame();
    const player = gameState.players[0]; // Assuming human is always index 0 for now

    const { setNodeRef } = useDroppable({
        id: 'rack',
    });

    const { shuffleRack, recallAll } = useGame();

    if (!player) return null;

    return (
        <div className={styles.rackContainer}>
            <div ref={setNodeRef} className={styles.rack}>
                {player.rack.map((tile) => (
                    <Tile
                        key={tile.id}
                        tile={tile}
                        id={tile.id}
                        players={showTeamColors ? gameState.players : undefined}
                        gameMode={showTeamColors ? gameState.gameMode : undefined}
                    />
                ))}
            </div>
            <div className={styles.rackControls}>
                <button className={styles.button} onClick={shuffleRack} title="Shuffle Rack">
                    🔀
                </button>
                <button className={styles.button} onClick={recallAll} title="Return Tiles">
                    ⬇️
                </button>
            </div>
        </div>
    );
};
