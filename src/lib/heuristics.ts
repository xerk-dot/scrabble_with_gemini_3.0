/**
 * Strategic heuristics for Scrabble AI
 * Evaluates moves beyond just immediate score
 */

import { Tile, BoardState } from './types';
import { PlacedTile } from './validation';

/**
 * Evaluate the quality of remaining rack tiles after a move
 * Good racks have balanced vowels/consonants, no duplicates, and valuable tiles
 */
export function evaluateRackLeave(remainingTiles: Tile[]): number {
    if (remainingTiles.length === 0) return 0;

    let penalty = 0; // Only penalize bad situations, don't reward good ones
    const letters = remainingTiles.map(t => t.letter);
    const vowels = letters.filter(l => 'AEIOU'.includes(l)).length;
    const consonants = letters.filter(l => !'AEIOU'.includes(l) && l !== '_').length;

    // 1. Q without U is very bad
    if (letters.includes('Q') && !letters.includes('U')) {
        penalty -= 8;
    }

    // 2. All vowels or all consonants is bad
    if (vowels === letters.length && letters.length > 0) {
        penalty -= 10; // All vowels
    }
    if (consonants === letters.length && letters.length > 0) {
        penalty -= 10; // All consonants
    }

    // 3. Too many duplicates is bad
    const unique = new Set(letters).size;
    const duplicates = letters.length - unique;
    if (duplicates > 2) {
        penalty -= (duplicates - 2) * 3; // Only penalize excessive duplicates
    }

    // 4. Extreme vowel imbalance
    const vowelRatio = letters.length > 0 ? vowels / letters.length : 0;
    if (vowelRatio > 0.7 || vowelRatio < 0.15) {
        penalty -= 5; // Very imbalanced
    }

    return penalty; // Will be 0 or negative
}

/**
 * Evaluate board control - avoid creating opportunities for opponent
 */
export function evaluateBoardControl(
    board: BoardState,
    placedTiles: PlacedTile[]
): number {
    let score = 0;
    const rows = board.length;
    const cols = board[0]?.length || 0;

    for (const placed of placedTiles) {
        const { x, y } = placed;

        // Check adjacent squares for bonus opportunities we're creating
        const adjacent = [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 }
        ];

        for (const adj of adjacent) {
            if (adj.x < 0 || adj.x >= cols || adj.y < 0 || adj.y >= rows) continue;

            const square = board[adj.y][adj.x];

            // If we're placing next to a bonus square (and not using it), penalize
            if (!square.tile) {
                switch (square.bonus) {
                    case 'TW':
                        score -= 20; // Very bad - giving opponent triple word
                        break;
                    case 'DW':
                        score -= 12; // Bad - giving opponent double word
                        break;
                    case 'TL':
                        score -= 6; // Moderate - triple letter
                        break;
                    case 'DL':
                        score -= 3; // Minor - double letter
                        break;
                }
            }
        }

        // Bonus: If we're using a bonus square ourselves, that's good positioning
        const ourSquare = board[y][x];
        if (ourSquare.bonus === 'TW' || ourSquare.bonus === 'DW') {
            score += 5; // Reward for using premium squares
        }
    }

    return score;
}

/**
 * Calculate remaining rack after placing tiles
 */
export function getRemainingRack(rack: Tile[], placedTiles: PlacedTile[]): Tile[] {
    const usedIds = new Set(placedTiles.map(pt => pt.tile.id));
    return rack.filter(tile => !usedIds.has(tile.id));
}

/**
 * Combine all heuristics into a single adjusted score
 * @param baseScore - The immediate score from the move
 * @param remainingRack - Tiles left in rack after move
 * @param board - Current board state
 * @param placedTiles - Tiles being placed
 * @returns Adjusted score considering future potential
 */
export function calculateHeuristicScore(
    baseScore: number,
    remainingRack: Tile[],
    board: BoardState,
    placedTiles: PlacedTile[]
): number {
    const rackLeaveScore = evaluateRackLeave(remainingRack);
    const boardControlScore = evaluateBoardControl(board, placedTiles);

    // Make heuristics VERY subtle - only a tiebreaker between similar moves
    // A 20-point move should almost never lose to a 15-point move due to heuristics
    const adjustedScore = baseScore +
        (rackLeaveScore * 0.3) +   // Penalties only, so this reduces bad moves
        (boardControlScore * 0.1); // Avoid creating opportunities

    return adjustedScore;
}
