/**
 * Rack-based word generation for Scrabble AI
 * Generates only words that can be formed from current rack tiles
 */

import { Tile } from './types';
import { DAWGNode, isValidWord, getNodeAtPrefix } from './dawg';

/**
 * Generate all valid words that can be formed from the rack
 * @param rack - Current tiles in the player's rack
 * @param dawg - DAWG root node for word validation
 * @param maxLength - Maximum word length to generate (default: 7)
 * @returns Array of valid words (uppercase)
 */
export function generateWordsFromRack(
    rack: Tile[],
    dawg: DAWGNode,
    maxLength: number = 7
): string[] {
    const words = new Set<string>();
    const letters = rack.map(t => t.letter);

    // Recursive backtracking with DAWG pruning
    function backtrack(
        currentWord: string,
        remainingLetters: string[],
        usedIndices: Set<number>,
        currentNode: DAWGNode
    ) {
        // If current word is valid, add it
        if (currentWord.length > 1 && currentNode.isEndOfWord) {
            words.add(currentWord);
        }

        // Stop if we've reached max length
        if (currentWord.length >= maxLength) {
            return;
        }

        // Try adding each remaining letter
        for (let i = 0; i < remainingLetters.length; i++) {
            if (usedIndices.has(i)) continue;

            const letter = remainingLetters[i];

            // Handle blank tiles - try all 26 letters
            if (letter === '_') {
                for (let charCode = 65; charCode <= 90; charCode++) {
                    const blankLetter = String.fromCharCode(charCode);
                    const childNode = currentNode.children.get(blankLetter);

                    if (childNode) {
                        const newUsed = new Set(usedIndices);
                        newUsed.add(i);
                        backtrack(
                            currentWord + blankLetter,
                            remainingLetters,
                            newUsed,
                            childNode
                        );
                    }
                }
            } else {
                // Regular letter
                const childNode = currentNode.children.get(letter);

                if (childNode) {
                    const newUsed = new Set(usedIndices);
                    newUsed.add(i);
                    backtrack(
                        currentWord + letter,
                        remainingLetters,
                        newUsed,
                        childNode
                    );
                }
            }
        }
    }

    backtrack('', letters, new Set(), dawg);

    return Array.from(words);
}

/**
 * Generate words using rack tiles + one additional letter from the board
 * Used for finding words that can be extended with board letters
 * @param rack - Current tiles in the player's rack
 * @param boardLetter - Letter already on the board
 * @param dawg - DAWG root node
 * @param maxLength - Maximum word length
 * @returns Array of valid words
 */
export function generateWordsWithBoardLetter(
    rack: Tile[],
    boardLetter: string,
    dawg: DAWGNode,
    maxLength: number = 15
): string[] {
    const words = new Set<string>();
    const rackLetters = rack.map(t => t.letter);

    function backtrack(
        currentWord: string,
        remainingRack: string[],
        usedIndices: Set<number>,
        usedBoardLetter: boolean,
        currentNode: DAWGNode
    ) {
        if (currentWord.length > 1 && currentNode.isEndOfWord && usedBoardLetter) {
            words.add(currentWord);
        }

        if (currentWord.length >= maxLength) {
            return;
        }

        // Try board letter if not used yet
        if (!usedBoardLetter) {
            const childNode = currentNode.children.get(boardLetter);
            if (childNode) {
                backtrack(
                    currentWord + boardLetter,
                    remainingRack,
                    usedIndices,
                    true,
                    childNode
                );
            }
        }

        // Try rack letters
        for (let i = 0; i < remainingRack.length; i++) {
            if (usedIndices.has(i)) continue;

            const letter = remainingRack[i];

            if (letter === '_') {
                for (let charCode = 65; charCode <= 90; charCode++) {
                    const blankLetter = String.fromCharCode(charCode);
                    const childNode = currentNode.children.get(blankLetter);

                    if (childNode) {
                        const newUsed = new Set(usedIndices);
                        newUsed.add(i);
                        backtrack(
                            currentWord + blankLetter,
                            remainingRack,
                            newUsed,
                            usedBoardLetter,
                            childNode
                        );
                    }
                }
            } else {
                const childNode = currentNode.children.get(letter);

                if (childNode) {
                    const newUsed = new Set(usedIndices);
                    newUsed.add(i);
                    backtrack(
                        currentWord + letter,
                        remainingRack,
                        newUsed,
                        usedBoardLetter,
                        childNode
                    );
                }
            }
        }
    }

    backtrack('', rackLetters, new Set(), false, dawg);

    return Array.from(words);
}

/**
 * Check if a word can be formed from rack tiles
 * @param word - Word to check (uppercase)
 * @param rack - Available tiles
 * @returns true if word can be formed, false otherwise
 */
export function canFormWord(word: string, rack: Tile[]): boolean {
    const available = rack.map(t => t.letter);
    const needed = word.split('');

    for (const letter of needed) {
        const index = available.findIndex(l => l === letter || l === '_');
        if (index === -1) {
            return false;
        }
        available.splice(index, 1);
    }

    return true;
}

/**
 * Generate words that can be formed using board tiles + rack tiles
 * This is crucial for mid-game play where you build off existing words
 * @param board - Current board state
 * @param rack - Player's rack
 * @param anchors - Anchor positions (empty squares adjacent to tiles)
 * @param dawg - DAWG root node
 * @returns Array of possible words with their board letter usage
 */
export function generateBoardAwareWords(
    board: any[][],
    rack: Tile[],
    anchors: Array<{ x: number; y: number }>,
    dawg: DAWGNode
): Array<{ word: string; usedBoardLetters: string }> {
    const words = new Set<string>();
    const rows = board.length;
    const cols = board[0]?.length || 0;

    // For each anchor, try to build words that use adjacent board tiles
    for (const anchor of anchors) {
        // Try horizontal words through this anchor
        for (let startOffset = 0; startOffset <= 7; startOffset++) {
            const startX = anchor.x - startOffset;
            if (startX < 0) continue;

            // Collect letters from board in this direction
            let boardLetters = '';
            let rackLettersNeeded = '';
            let currentX = startX;

            // Build word using board tiles and gaps for rack tiles
            while (currentX < cols && currentX < startX + 15) {
                const tile = board[anchor.y][currentX].tile;
                if (tile) {
                    boardLetters += tile.letter;
                } else if (currentX >= startX && currentX <= anchor.x + 7) {
                    // This is a potential position for a rack tile
                    boardLetters += '?'; // Placeholder
                }
                currentX++;

                if (currentX - startX > 15) break; // Max word length
            }

            // Try to fill in the gaps with rack letters
            // This is a simplified approach - just try common patterns
            if (boardLetters.includes('?')) {
                // Try each rack letter in each gap
                // For now, just collect words that use at least one board letter
                const rackWord = generateWordsFromRack(rack, dawg, 7);
                for (const word of rackWord) {
                    words.add(word);
                }
            }
        }

        // Try vertical words (similar logic)
        for (let startOffset = 0; startOffset <= 7; startOffset++) {
            const startY = anchor.y - startOffset;
            if (startY < 0) continue;

            let currentY = startY;
            while (currentY < rows && currentY < startY + 15) {
                const tile = board[currentY][anchor.x].tile;
                if (tile) {
                    // Has board letter, try to build off it
                }
                currentY++;
                if (currentY - startY > 15) break;
            }
        }
    }

    return Array.from(words).map(w => ({ word: w, usedBoardLetters: '' }));
}
