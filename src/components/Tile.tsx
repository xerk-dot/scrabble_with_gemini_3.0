import React from 'react';
import { Tile as TileType, Player } from '@/lib/types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getPlayerColor } from '@/lib/teamColors';
import styles from './Tile.module.css';

interface TileProps {
    tile: TileType;
    id: string;
    disabled?: boolean;
    players?: Player[]; // For team coloring
    gameMode?: string; // To check if in TEAMS mode
}

export const Tile: React.FC<TileProps> = ({ tile, id, disabled, players, gameMode }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        data: tile,
        disabled,
    });

    // Get team color if in TEAMS mode
    let tileColor = '#f4d03f'; // Default yellow
    if (gameMode === 'TEAMS' && tile.playerId && players) {
        const player = players.find(p => p.id === tile.playerId);
        if (player && player.teamId) {
            const playerIndex = players.indexOf(player);
            tileColor = getPlayerColor(player.teamId, playerIndex);
        }
    }

    const style = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.8 : 1,
        backgroundColor: tileColor,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`${styles.tile} ${tile.isBlank ? styles.blank : ''}`}
        >
            <span className={styles.letter}>{tile.letter === '_' ? '' : tile.letter}</span>
            <span className={styles.score}>{tile.score}</span>
        </div>
    );
};
