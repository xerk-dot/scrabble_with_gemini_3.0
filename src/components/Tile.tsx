import React from 'react';
import { Tile as TileType } from '@/lib/types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import styles from './Tile.module.css';

interface TileProps {
    tile: TileType;
    id: string;
    disabled?: boolean;
}

export const Tile: React.FC<TileProps> = ({ tile, id, disabled }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        data: tile,
        disabled,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.8 : 1,
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
