'use server';

import { BoardState, Tile, Move, Square } from '@/lib/types';
import { validateMove, PlacedTile } from '@/lib/validation';
import { calculateScore } from '@/lib/scoring';
import { validateWords } from './actions';

import fs from 'fs';
import path from 'path';

// Load SOWPODS dictionary for AI move generation
let aiDictionaryCache: string[] | null = null;

const loadAiDictionary = () => {
    if (aiDictionaryCache) return aiDictionaryCache;

    try {
        const filePath = path.join(process.cwd(), 'sowpods.txt');

        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const words = fileContent.split('\n').map(word => word.trim().toUpperCase()).filter(word => word.length > 0 && word.length <= 7);
            aiDictionaryCache = words;
            console.log(`AI loaded ${aiDictionaryCache.length} words (2-7 letters) from SOWPODS`);
            return aiDictionaryCache;
        } else {
            console.warn('SOWPODS not found for AI, using fallback');
            const fallback = ['HELLO', 'WORLD', 'CAT', 'DOG', 'QUIZ', 'JUMP', 'ZONE'];
            aiDictionaryCache = fallback;
            return fallback;
        }
    } catch (error) {
        console.error('Error loading AI dictionary:', error);
        return ['HELLO', 'WORLD', 'CAT', 'DOG'];
    }
};

interface AiMoveResult {
    word: string;
    score: number;
    tiles: PlacedTile[];
}

export async function generateAiMove(
    board: BoardState,
    rack: Tile[],
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
): Promise<AiMoveResult | null> {
    // 1. Find all anchors (empty squares adjacent to existing tiles)
    // For the first move, the anchor is the center (7,7)
    const anchors: { x: number; y: number }[] = [];
    let isEmptyBoard = true;

    for (let y = 0; y < 15; y++) {
        for (let x = 0; x < 15; x++) {
            if (board[y][x].tile) {
                isEmptyBoard = false;
                // Check neighbors
                const neighbors = [
                    { x: x + 1, y }, { x: x - 1, y },
                    { x, y: y + 1 }, { x, y: y - 1 }
                ];
                for (const n of neighbors) {
                    if (n.x >= 0 && n.x < 15 && n.y >= 0 && n.y < 15 && !board[n.y][n.x].tile) {
                        anchors.push(n);
                    }
                }
            }
        }
    }

    if (isEmptyBoard) {
        anchors.push({ x: 7, y: 7 });
    }

    // Deduplicate anchors
    const uniqueAnchors = Array.from(new Set(anchors.map(a => `${a.x},${a.y}`)))
        .map(s => {
            const [x, y] = s.split(',').map(Number);
            return { x, y };
        });

    // Load the full dictionary
    const AI_DICTIONARY = loadAiDictionary();

    // 2. Generate potential moves
    // This is a simplified brute-force approach. 
    // We will try to place words from our dictionary at each anchor.
    const possibleMoves: AiMoveResult[] = [];

    for (const word of AI_DICTIONARY) {
        // Check if we can form this word with our rack + board letters
        // This is tricky because we need to match existing board letters if we overlap.

        // Try every anchor as a starting point or intersection point
        for (const anchor of uniqueAnchors) {
            // Try horizontal and vertical
            for (const direction of ['ROW', 'COL']) {
                const isRow = direction === 'ROW';

                // Try placing the word such that it passes through the anchor
                // The word could start at anchor, or end at anchor, or pass through.
                for (let offset = 0; offset < word.length; offset++) {
                    // Calculate potential start position
                    const startX = isRow ? anchor.x - offset : anchor.x;
                    const startY = isRow ? anchor.y : anchor.y - offset;

                    // Check bounds
                    if (startX < 0 || startY < 0) continue;
                    if (isRow && startX + word.length > 15) continue;
                    if (!isRow && startY + word.length > 15) continue;

                    // Validate placement against board and rack
                    const placedTiles: PlacedTile[] = [];
                    const tempRack = [...rack];
                    let validPlacement = true;
                    let usesAnchor = false;

                    for (let i = 0; i < word.length; i++) {
                        const x = isRow ? startX + i : startX;
                        const y = isRow ? startY : startY + i;
                        const letter = word[i];
                        const boardTile = board[y][x].tile;

                        if (boardTile) {
                            if (boardTile.letter !== letter) {
                                validPlacement = false;
                                break;
                            }
                        } else {
                            // Need to use a tile from rack
                            const tileIndex = tempRack.findIndex(t => t.letter === letter || t.isBlank);
                            if (tileIndex === -1) {
                                validPlacement = false;
                                break;
                            }
                            const tile = tempRack[tileIndex];
                            // If blank, we'd need to set letterOverride, but for now simplified
                            placedTiles.push({ x, y, tile: { ...tile, letter: tile.isBlank ? letter : tile.letter } });
                            tempRack.splice(tileIndex, 1);

                            if (x === anchor.x && y === anchor.y) usesAnchor = true;
                        }
                    }

                    if (validPlacement && placedTiles.length > 0) {
                        // Validate move rules (connectivity, etc)
                        const validation = validateMove(board, placedTiles, isEmptyBoard);
                        if (validation.isValid && validation.words && validation.words.length > 0) {
                            // CRITICAL: Validate all formed words against dictionary
                            const invalidWords = await validateWords(validation.words);

                            // Only accept this move if ALL words are valid
                            if (invalidWords.length === 0) {
                                // Calculate score
                                const score = calculateScore(board, placedTiles);
                                possibleMoves.push({ word: validation.words.join(', '), score, tiles: placedTiles });
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Select move based on difficulty
    if (possibleMoves.length === 0) return null;

    // Sort by score descending
    possibleMoves.sort((a, b) => b.score - a.score);

    if (difficulty === 'HARD') {
        return possibleMoves[0];
    } else if (difficulty === 'MEDIUM') {
        // Pick from top 50%
        const index = Math.floor(Math.random() * Math.ceil(possibleMoves.length / 2));
        return possibleMoves[index];
    } else {
        // EASY: Pick random valid move
        const index = Math.floor(Math.random() * possibleMoves.length);
        return possibleMoves[index];
    }
}
