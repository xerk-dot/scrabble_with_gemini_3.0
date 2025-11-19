import { BoardState, Tile } from './types';
import { PlacedTile } from './validation';

export const calculateScore = (
    board: BoardState,
    placedTiles: PlacedTile[]
): number => {
    let totalScore = 0;

    // Determine orientation
    const xs = placedTiles.map((t) => t.x);
    const ys = placedTiles.map((t) => t.y);
    const isRow = new Set(ys).size === 1;

    // Helper to calculate score for a single word
    const scoreWord = (startX: number, startY: number, dx: number, dy: number): number => {
        let x = startX;
        let y = startY;

        // Find start of word
        while (x - dx >= 0 && y - dy >= 0 && x - dx < 15 && y - dy < 15 && (board[y - dy][x - dx].tile || placedTiles.some(t => t.x === x - dx && t.y === y - dy))) {
            x -= dx;
            y -= dy;
        }

        let wordScore = 0;
        let wordMultiplier = 1;
        let tilesInWord = 0;

        let currentX = x;
        let currentY = y;

        while (currentX >= 0 && currentY >= 0 && currentX < 15 && currentY < 15) {
            const placedTile = placedTiles.find(t => t.x === currentX && t.y === currentY);
            const boardTile = board[currentY][currentX].tile;
            const tile = boardTile || placedTile?.tile;

            if (!tile) break;

            tilesInWord++;
            let letterScore = tile.score;

            // Apply bonuses ONLY if it's a newly placed tile
            if (placedTile) {
                const bonus = board[currentY][currentX].bonus;
                if (bonus === 'DL') letterScore *= 2;
                if (bonus === 'TL') letterScore *= 3;
                if (bonus === 'DW' || bonus === 'START') wordMultiplier *= 2;
                if (bonus === 'TW') wordMultiplier *= 3;
                if (bonus === 'HAZARD') wordScore -= 10;
            }

            wordScore += letterScore;
            currentX += dx;
            currentY += dy;
        }

        return tilesInWord > 1 ? wordScore * wordMultiplier : 0;
    };

    // Score primary word
    if (placedTiles.length > 0) {
        const startX = placedTiles[0].x;
        const startY = placedTiles[0].y;
        totalScore += scoreWord(startX, startY, isRow ? 1 : 0, isRow ? 0 : 1);
    }

    // Score perpendicular words
    for (const pt of placedTiles) {
        totalScore += scoreWord(pt.x, pt.y, isRow ? 0 : 1, isRow ? 1 : 0);
    }

    // Bingo bonus (using all 7 tiles)
    if (placedTiles.length === 7) {
        totalScore += 50;
    }

    return totalScore;
};
