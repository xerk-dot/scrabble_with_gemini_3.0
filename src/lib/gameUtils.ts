import { BOARD_SIZE, BOARD_VARIANTS, BoardVariant, TILE_DISTRIBUTION } from './constants';
import { BoardState, Tile, Square } from './types';

export const initializeBoard = (variant: BoardVariant = 'STANDARD'): BoardState => {
    const board: BoardState = [];
    let bonusMap = BOARD_VARIANTS[variant];

    if (variant === 'RANDOM') {
        bonusMap = {};
        // Always keep start
        bonusMap['7,7'] = 'START';

        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (x === 7 && y === 7) continue;

                const rand = Math.random();
                const key = `${x},${y}`;

                if (rand < 0.02) bonusMap[key] = 'TW';
                else if (rand < 0.06) bonusMap[key] = 'DW';
                else if (rand < 0.10) bonusMap[key] = 'TL';
                else if (rand < 0.18) bonusMap[key] = 'DL';
            }
        }
    } else if (variant === 'HAZARDS') {
        bonusMap = {};
        bonusMap['7,7'] = 'START';

        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (x === 7 && y === 7) continue;

                const rand = Math.random();
                const key = `${x},${y}`;

                // Hazards appear more frequently but are dangerous
                if (rand < 0.05) bonusMap[key] = 'HAZARD'; // -10 points
                else if (rand < 0.07) bonusMap[key] = 'TW';
                else if (rand < 0.10) bonusMap[key] = 'DW';
                else if (rand < 0.15) bonusMap[key] = 'TL';
                else if (rand < 0.20) bonusMap[key] = 'DL';
            }
        }
    }

    for (let y = 0; y < BOARD_SIZE; y++) {
        const row: Square[] = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            const key = `${x},${y}`;
            row.push({
                x,
                y,
                bonus: bonusMap[key] || null,
                tile: null,
            });
        }
        board.push(row);
    }
    return board;
};

export const createTileBag = (): Tile[] => {
    const bag: Tile[] = [];
    let idCounter = 0;

    Object.entries(TILE_DISTRIBUTION).forEach(([letter, { count, score }]) => {
        for (let i = 0; i < count; i++) {
            bag.push({
                id: `tile-${idCounter++}`,
                letter,
                score,
                isBlank: letter === '_',
            });
        }
    });

    // Shuffle bag
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }

    return bag;
};

export const drawTiles = (bag: Tile[], count: number): { drawn: Tile[]; newBag: Tile[] } => {
    const drawn = bag.slice(0, count);
    const newBag = bag.slice(count);
    return { drawn, newBag };
};
