'use server';

import { BoardState, Tile } from '@/lib/types';
import { validateMove, PlacedTile } from '@/lib/validation';
import { calculateScore } from '@/lib/scoring';
import { validateWords } from './actions';
import { buildDAWG, DAWGNode } from '@/lib/dawg';
import { generateWordsFromRack } from '@/lib/word-generator';
import { calculateCrossSets, getCrossSetAt } from '@/lib/cross-sets';

import fs from 'fs';
import path from 'path';

// Cache for DAWG structure
let dawgCache: DAWGNode | null = null;

/**
 * Load and build DAWG from SOWPODS dictionary
 */
const loadDAWG = (): DAWGNode => {
    if (dawgCache) return dawgCache;

    try {
        const filePath = path.join(process.cwd(), 'sowpods.txt');

        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const words = fileContent
                .split('\n')
                .map(word => word.trim().toUpperCase())
                .filter(word => word.length > 0);

            console.log(`Building DAWG from ${words.length} words...`);
            dawgCache = buildDAWG(words);
            console.log(`DAWG built successfully`);
            return dawgCache;
        } else {
            console.warn('SOWPODS not found, using fallback dictionary');
            const fallback = ['HELLO', 'WORLD', 'CAT', 'DOG', 'QUIZ', 'JUMP', 'ZONE'];
            dawgCache = buildDAWG(fallback);
            return dawgCache;
        }
    } catch (error) {
        console.error('Error loading DAWG:', error);
        const fallback = ['HELLO', 'WORLD', 'CAT', 'DOG'];
        dawgCache = buildDAWG(fallback);
        return dawgCache;
    }
};

interface AiMoveResult {
    word: string;
    score: number;
    tiles: PlacedTile[];
}

/**
 * Optimized AI move generation using DAWG, rack-based generation,
 * cross-sets, and alpha-beta pruning
 */
export async function generateAiMove(
    board: BoardState,
    rack: Tile[],
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
): Promise<AiMoveResult | null> {
    const startTime = Date.now();

    // Load DAWG
    const dawg = loadDAWG();

    // Find anchors
    const anchors = findAnchors(board);

    if (anchors.length === 0) {
        console.log('No anchors found');
        return null;
    }

    // Calculate cross-sets for pruning
    const crossSets = calculateCrossSets(board, dawg);

    // Generate all possible words from rack using DAWG
    const rackWords = generateWordsFromRack(rack, dawg, 15);
    console.log(`Generated ${rackWords.length} possible words from rack`);

    // Also try to use existing board tiles by attempting all dictionary words
    // that could be formed with rack + board letters
    const isEmptyBoard = isEmptyBoardCheck(board);
    let allCandidateWords = [...rackWords];

    if (!isEmptyBoard) {
        // On non-empty boards, we need to consider words that use board tiles
        // The tryPlaceWord function already handles this, so we just need more word candidates
        // Load a broader set of words that could potentially use board letters
        console.log('Board has tiles, expanding word search to include board-aware combinations');

        // Generate words using rack + single board letters
        // This helps find extensions like CAT -> CATS
        const boardLetters = new Set<string>();
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < (board[0]?.length || 0); x++) {
                if (board[y][x].tile) {
                    boardLetters.add(board[y][x].tile.letter);
                }
            }
        }

        // Try generating words with rack + each unique board letter
        for (const boardLetter of boardLetters) {
            const extendedRack = [...rack, {
                id: 'temp-board',
                letter: boardLetter,
                score: 1,
                isBlank: false
            }];
            const extendedWords = generateWordsFromRack(extendedRack as Tile[], dawg, 15);
            allCandidateWords.push(...extendedWords);
        }

        // Remove duplicates
        allCandidateWords = Array.from(new Set(allCandidateWords));
        console.log(`Expanded to ${allCandidateWords.length} candidate words (including board-aware)`);
    }

    if (allCandidateWords.length === 0) {
        console.log('No valid words can be formed from rack');
        return null;
    }

    // Try to place each word at each anchor
    const possibleMoves: AiMoveResult[] = [];
    let bestScore = 0; // For alpha-beta pruning in HARD mode

    for (const word of allCandidateWords) {
        // Alpha-beta pruning for HARD mode
        if (difficulty === 'HARD' && possibleMoves.length > 0) {
            // Estimate max possible score for this word
            const maxPossible = estimateMaxScore(word, rack);
            if (maxPossible < bestScore) {
                continue; // Skip this word, can't beat current best
            }
        }

        // Try both horizontal and vertical placements
        for (const isHorizontal of [true, false]) {
            for (const anchor of anchors) {
                // Try different offsets (word can start before, at, or after anchor)
                for (let offset = 0; offset < word.length; offset++) {
                    const move = tryPlaceWord(
                        board,
                        word,
                        rack,
                        anchor.x,
                        anchor.y,
                        isHorizontal,
                        offset,
                        crossSets
                    );

                    if (move) {
                        // Validate the move
                        const isEmptyBoard = isEmptyBoardCheck(board);
                        const validation = validateMove(board, move.tiles, isEmptyBoard);

                        if (validation.isValid && validation.words && validation.words.length > 0) {
                            // Validate all formed words
                            const invalidWords = await validateWords(validation.words);

                            if (invalidWords.length === 0) {
                                const score = calculateScore(board, move.tiles);
                                possibleMoves.push({
                                    word: validation.words.join(', '),
                                    score,
                                    tiles: move.tiles
                                });

                                // Update best score for alpha-beta pruning
                                if (score > bestScore) {
                                    bestScore = score;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const elapsed = Date.now() - startTime;
    console.log(`AI found ${possibleMoves.length} valid moves in ${elapsed}ms`);

    // If no moves found with optimized approach, log for debugging
    if (possibleMoves.length === 0 && !isEmptyBoardCheck(board)) {
        console.log('AI found no moves, debugging info:');
        console.log(`Rack: ${rack.map(t => t.letter).join('')}`);
        console.log(`Anchors found: ${anchors.length}`);
        console.log(`Candidate words tried: ${allCandidateWords.length}`);
    }

    if (possibleMoves.length === 0) {
        return null;
    }

    // Shuffle for randomness in ties
    for (let i = possibleMoves.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [possibleMoves[i], possibleMoves[j]] = [possibleMoves[j], possibleMoves[i]];
    }

    // Sort by score descending
    possibleMoves.sort((a, b) => b.score - a.score);

    // Select based on difficulty
    if (difficulty === 'HARD') {
        return possibleMoves[0];
    } else if (difficulty === 'MEDIUM') {
        const index = Math.floor(Math.random() * Math.ceil(possibleMoves.length / 2));
        return possibleMoves[index];
    } else {
        const index = Math.floor(Math.random() * possibleMoves.length);
        return possibleMoves[index];
    }
}

/**
 * Find all anchor positions on the board
 */
function findAnchors(board: BoardState): Array<{ x: number; y: number }> {
    const anchors: Array<{ x: number; y: number }> = [];
    const rows = board.length;
    const cols = board[0]?.length || 0;
    let isEmptyBoard = true;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (board[y][x].tile) {
                isEmptyBoard = false;
                // Check neighbors for empty squares
                const neighbors = [
                    { x: x + 1, y }, { x: x - 1, y },
                    { x, y: y + 1 }, { x, y: y - 1 }
                ];
                for (const n of neighbors) {
                    if (n.x >= 0 && n.x < cols && n.y >= 0 && n.y < rows && !board[n.y][n.x].tile) {
                        anchors.push(n);
                    }
                }
            }
        }
    }

    // If empty board, find all START squares
    if (isEmptyBoard) {
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (board[y][x].bonus === 'START') {
                    anchors.push({ x, y });
                }
            }
        }
        // Fallback to center if no START squares
        if (anchors.length === 0) {
            anchors.push({ x: Math.floor(cols / 2), y: Math.floor(rows / 2) });
        }
    }

    // Deduplicate
    const uniqueAnchors = Array.from(new Set(anchors.map(a => `${a.x},${a.y}`)))
        .map(s => {
            const [x, y] = s.split(',').map(Number);
            return { x, y };
        });

    return uniqueAnchors;
}

/**
 * Try to place a word at a specific position
 */
function tryPlaceWord(
    board: BoardState,
    word: string,
    rack: Tile[],
    anchorX: number,
    anchorY: number,
    isHorizontal: boolean,
    offset: number,
    crossSets: Map<string, any>
): { tiles: PlacedTile[] } | null {
    const rows = board.length;
    const cols = board[0]?.length || 0;

    // Calculate start position
    const startX = isHorizontal ? anchorX - offset : anchorX;
    const startY = isHorizontal ? anchorY : anchorY - offset;

    // Check bounds
    if (startX < 0 || startY < 0) return null;
    if (isHorizontal && startX + word.length > cols) return null;
    if (!isHorizontal && startY + word.length > rows) return null;

    // Try to place the word
    const placedTiles: PlacedTile[] = [];
    const tempRack = [...rack];

    for (let i = 0; i < word.length; i++) {
        const x = isHorizontal ? startX + i : startX;
        const y = isHorizontal ? startY : startY + i;
        const letter = word[i];
        const boardTile = board[y][x].tile;

        if (boardTile) {
            // Must match existing tile
            if (boardTile.letter !== letter) {
                return null;
            }
        } else {
            // Check cross-set
            const validLetters = getCrossSetAt(crossSets, x, y, isHorizontal);
            if (!validLetters.has(letter)) {
                return null;
            }

            // Need tile from rack
            const tileIndex = tempRack.findIndex(t => t.letter === letter || t.isBlank);
            if (tileIndex === -1) {
                return null;
            }

            const tile = tempRack[tileIndex];
            placedTiles.push({
                x,
                y,
                tile: { ...tile, letter: tile.isBlank ? letter : tile.letter }
            });
            tempRack.splice(tileIndex, 1);
        }
    }

    return placedTiles.length > 0 ? { tiles: placedTiles } : null;
}

/**
 * Check if board is empty
 */
function isEmptyBoardCheck(board: BoardState): boolean {
    for (const row of board) {
        for (const square of row) {
            if (square.tile) return false;
        }
    }
    return true;
}

/**
 * Estimate maximum possible score for a word (for alpha-beta pruning)
 */
function estimateMaxScore(word: string, rack: Tile[]): number {
    // Simple heuristic: assume all triple word scores
    let score = 0;
    for (const letter of word) {
        const tile = rack.find(t => t.letter === letter);
        score += (tile?.score || 1) * 3; // Assume triple letter
    }
    return score * 3; // Assume triple word
}
