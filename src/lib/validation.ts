import { BoardState, Tile, Square } from './types';

export interface PlacedTile {
    x: number;
    y: number;
    tile: Tile;
}

export const validateMove = (
    board: BoardState,
    placedTiles: PlacedTile[],
    isFirstMove: boolean,
    currentPlayer?: { movesMade?: number },
    mustStartOnStar?: boolean
): { isValid: boolean; message?: string; words?: string[] } => {
    if (placedTiles.length === 0) {
        return { isValid: false, message: 'No tiles placed.' };
    }

    // 1. Check if tiles are in a straight line (row or column)
    const xs = placedTiles.map((t) => t.x);
    const ys = placedTiles.map((t) => t.y);
    const uniqueXs = Array.from(new Set(xs));
    const uniqueYs = Array.from(new Set(ys));

    const isRow = uniqueYs.length === 1;
    const isCol = uniqueXs.length === 1;

    if (!isRow && !isCol) {
        return { isValid: false, message: 'Tiles must be placed in a straight line.' };
    }

    // 2. Check for gaps and connectivity
    // Sort tiles by position
    placedTiles.sort((a, b) => (isRow ? a.x - b.x : a.y - b.y));

    const start = isRow ? placedTiles[0].x : placedTiles[0].y;
    const end = isRow ? placedTiles[placedTiles.length - 1].x : placedTiles[placedTiles.length - 1].y;
    const fixedCoord = isRow ? uniqueYs[0] : uniqueXs[0];

    let connectedToExisting = false;

    for (let i = start; i <= end; i++) {
        const x = isRow ? i : fixedCoord;
        const y = isRow ? fixedCoord : i;

        const placedTile = placedTiles.find((t) => t.x === x && t.y === y);
        const boardTile = board[y][x].tile;

        if (!placedTile && !boardTile) {
            return { isValid: false, message: 'Tiles must be contiguous (no gaps).' };
        }

        if (boardTile) {
            connectedToExisting = true;
        }
    }

    const rows = board.length;
    const cols = board[0].length;

    // 3. Check mustStartOnStar rule (Mega Board only)
    // Rule: Each player's first move must be on a star. After all players have made their first move, normal rules apply.
    if (mustStartOnStar && currentPlayer && (currentPlayer.movesMade === 0 || currentPlayer.movesMade === undefined)) {
        // This is the player's first move - must be on a star
        const coversStart = placedTiles.some((t) => board[t.y][t.x].bonus === 'START');
        if (!coversStart) {
            return { isValid: false, message: 'Your first move must cover a star square (★).' };
        }

        // CRITICAL: First move must NOT connect to tiles on OTHER stars or non-star squares
        // It's OK for tiles to be adjacent to each other if they're all on the SAME star
        // Create a set of positions for tiles being placed in this move
        const placedPositions = new Set(placedTiles.map(pt => `${pt.x},${pt.y}`));

        // Check if any placed tile is adjacent to an existing tile (not part of current move)
        for (const pt of placedTiles) {
            const neighbors = [
                { x: pt.x + 1, y: pt.y },
                { x: pt.x - 1, y: pt.y },
                { x: pt.x, y: pt.y + 1 },
                { x: pt.x, y: pt.y - 1 },
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < cols && n.y >= 0 && n.y < rows) {
                    // Check if this neighbor has a tile AND is not part of the current move
                    if (board[n.y][n.x].tile && !placedPositions.has(`${n.x},${n.y}`)) {
                        // There's an existing tile adjacent - this is not allowed for first moves
                        return { isValid: false, message: 'Your first move must be independent - do not connect to existing words.' };
                    }
                }
            }
        }
    }

    // 4. Check connectivity for first move vs subsequent moves
    if (isFirstMove) {
        const coversStart = placedTiles.some((t) => board[t.y][t.x].bonus === 'START');
        if (!coversStart) {
            return { isValid: false, message: 'First move must cover a center square (★).' };
        }
        if (placedTiles.length < 2) {
            return { isValid: false, message: 'First move must consist of at least two letters.' };
        }
    } else {
        // For subsequent moves, must connect to existing words
        // UNLESS player must start on star independently (first move with mustStartOnStar rule)
        const mustPlaceIndependently = mustStartOnStar && currentPlayer && (currentPlayer.movesMade === 0 || currentPlayer.movesMade === undefined);

        if (!mustPlaceIndependently) {
            // Normal connectivity check
            let connectedToExisting = false;

            // Check if any placed tile uses an existing tile
            for (const pt of placedTiles) {
                if (board[pt.y][pt.x].tile) {
                    connectedToExisting = true;
                    break;
                }
            }

            if (!connectedToExisting) {
                // Check adjacency
                for (const pt of placedTiles) {
                    const neighbors = [
                        { x: pt.x + 1, y: pt.y },
                        { x: pt.x - 1, y: pt.y },
                        { x: pt.x, y: pt.y + 1 },
                        { x: pt.x, y: pt.y - 1 },
                    ];

                    for (const n of neighbors) {
                        if (n.x >= 0 && n.x < cols && n.y >= 0 && n.y < rows) {
                            if (board[n.y][n.x].tile) {
                                connectedToExisting = true;
                                break;
                            }
                        }
                    }
                    if (connectedToExisting) break;
                }
            }

            if (!connectedToExisting) {
                return { isValid: false, message: 'Tiles must be connected to existing words.' };
            }
        }
    }

    // 4. Identify formed words
    const words: string[] = [];

    // Helper to get full word from a position and direction
    const getWordAt = (startX: number, startY: number, dx: number, dy: number): string | null => {
        let x = startX;
        let y = startY;

        // Find start of word
        while (x - dx >= 0 && y - dy >= 0 && x - dx < cols && y - dy < rows && board[y - dy][x - dx].tile) {
            x -= dx;
            y -= dy;
        }

        let word = '';
        let currentX = x;
        let currentY = y;

        while (currentX >= 0 && currentY >= 0 && currentX < cols && currentY < rows) {
            const tile = board[currentY][currentX].tile || placedTiles.find(t => t.x === currentX && t.y === currentY)?.tile;
            if (!tile) break;
            word += tile.letter;
            currentX += dx;
            currentY += dy;
        }

        return word.length > 1 ? word : null;
    };

    // Check primary word
    const primaryWord = getWordAt(isRow ? placedTiles[0].x : fixedCoord, isRow ? fixedCoord : placedTiles[0].y, isRow ? 1 : 0, isRow ? 0 : 1);
    if (primaryWord) words.push(primaryWord);

    // Check perpendicular words for each placed tile
    for (const pt of placedTiles) {
        const perpWord = getWordAt(pt.x, pt.y, isRow ? 0 : 1, isRow ? 1 : 0);
        if (perpWord) words.push(perpWord);
    }

    return { isValid: true, words };
};
