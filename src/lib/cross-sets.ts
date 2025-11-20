/**
 * Cross-set calculation for Scrabble AI
 * Determines which letters are valid at each position based on perpendicular words
 */

import { BoardState } from './types';
import { DAWGNode, getNodeAtPrefix } from './dawg';

export interface CrossSet {
    letters: Set<string>; // Valid letters at this position
    isAnchor: boolean;     // Is this an anchor point?
}

/**
 * Calculate cross-sets for all positions on the board
 * @param board - Current board state
 * @param dawg - DAWG root node for word validation
 * @returns Map of position -> CrossSet
 */
export function calculateCrossSets(
    board: BoardState,
    dawg: DAWGNode
): Map<string, CrossSet> {
    const crossSets = new Map<string, CrossSet>();
    const rows = board.length;
    const cols = board[0]?.length || 0;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // Skip occupied squares
            if (board[y][x].tile) continue;

            // Calculate horizontal cross-set (for vertical plays)
            const horizCrossSet = calculateCrossSetAt(board, x, y, true, dawg);

            // Calculate vertical cross-set (for horizontal plays)
            const vertCrossSet = calculateCrossSetAt(board, x, y, false, dawg);

            // Store both (we'll use the appropriate one based on play direction)
            crossSets.set(`${x},${y},H`, {
                letters: horizCrossSet,
                isAnchor: isAnchor(board, x, y, rows, cols)
            });

            crossSets.set(`${x},${y},V`, {
                letters: vertCrossSet,
                isAnchor: isAnchor(board, x, y, rows, cols)
            });
        }
    }

    return crossSets;
}

/**
 * Calculate which letters are valid at a specific position
 * @param board - Current board state
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param isHorizontal - true for horizontal cross-check, false for vertical
 * @param dawg - DAWG root node
 * @returns Set of valid letters
 */
function calculateCrossSetAt(
    board: BoardState,
    x: number,
    y: number,
    isHorizontal: boolean,
    dawg: DAWGNode
): Set<string> {
    const rows = board.length;
    const cols = board[0]?.length || 0;

    // Find perpendicular neighbors
    const dx = isHorizontal ? 1 : 0;
    const dy = isHorizontal ? 0 : 1;

    const beforeX = x - dx;
    const beforeY = y - dy;
    const afterX = x + dx;
    const afterY = y + dy;

    // Check if there are tiles before or after
    const hasBefore = beforeX >= 0 && beforeY >= 0 &&
        beforeX < cols && beforeY < rows &&
        board[beforeY][beforeX].tile;
    const hasAfter = afterX >= 0 && afterY >= 0 &&
        afterX < cols && afterY < rows &&
        board[afterY][afterX].tile;

    // If no perpendicular tiles, all letters are valid
    if (!hasBefore && !hasAfter) {
        return getAllLetters();
    }

    // Find the prefix (letters before)
    let prefix = '';
    let px = beforeX;
    let py = beforeY;

    while (px >= 0 && py >= 0 && px < cols && py < rows && board[py][px].tile) {
        prefix = board[py][px].tile!.letter + prefix;
        px -= dx;
        py -= dy;
    }

    // Find the suffix (letters after)
    let suffix = '';
    let sx = afterX;
    let sy = afterY;

    while (sx >= 0 && sy >= 0 && sx < cols && sy < rows && board[sy][sx].tile) {
        suffix += board[sy][sx].tile!.letter;
        sx += dx;
        sy += dy;
    }

    // Find all letters that form valid words with prefix and suffix
    const validLetters = new Set<string>();

    for (let charCode = 65; charCode <= 90; charCode++) {
        const letter = String.fromCharCode(charCode);
        const word = prefix + letter + suffix;

        // Check if this forms a valid word
        if (isValidWordInDAWG(dawg, word)) {
            validLetters.add(letter);
        }
    }

    return validLetters;
}

/**
 * Check if a position is an anchor (empty square adjacent to a tile)
 */
function isAnchor(
    board: BoardState,
    x: number,
    y: number,
    rows: number,
    cols: number
): boolean {
    // Check all four neighbors
    const neighbors = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
    ];

    for (const n of neighbors) {
        if (n.x >= 0 && n.x < cols && n.y >= 0 && n.y < rows) {
            if (board[n.y][n.x].tile) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Get all 26 letters
 */
function getAllLetters(): Set<string> {
    const letters = new Set<string>();
    for (let charCode = 65; charCode <= 90; charCode++) {
        letters.add(String.fromCharCode(charCode));
    }
    return letters;
}

/**
 * Check if a word is valid in the DAWG
 */
function isValidWordInDAWG(dawg: DAWGNode, word: string): boolean {
    let currentNode = dawg;

    for (const letter of word) {
        const child = currentNode.children.get(letter);
        if (!child) {
            return false;
        }
        currentNode = child;
    }

    return currentNode.isEndOfWord;
}

/**
 * Get cross-set for a specific position and direction
 * @param crossSets - Pre-calculated cross-sets
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param isHorizontalPlay - true if playing horizontally
 * @returns Set of valid letters, or all letters if not found
 */
export function getCrossSetAt(
    crossSets: Map<string, CrossSet>,
    x: number,
    y: number,
    isHorizontalPlay: boolean
): Set<string> {
    // For horizontal plays, we check vertical cross-sets (and vice versa)
    const key = `${x},${y},${isHorizontalPlay ? 'V' : 'H'}`;
    const crossSet = crossSets.get(key);

    return crossSet?.letters || getAllLetters();
}
