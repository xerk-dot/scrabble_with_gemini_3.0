import { BonusType } from './constants';

export interface Tile {
    id: string;
    letter: string;
    score: number;
    isBlank?: boolean;
    letterOverride?: string; // For blank tiles played on board
    playerId?: string; // Track which player owns/placed this tile
}

export interface Square {
    x: number;
    y: number;
    bonus: BonusType | null;
    tile: Tile | null;
}

export type BoardState = Square[][];

export interface Player {
    id: string;
    name: string;
    rack: Tile[];
    score: number;
    isAi: boolean;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    resigned?: boolean;
    teamId?: string;
}

export type GameMode = 'HUMAN_VS_AI' | 'AI_VS_AI' | 'TEAMS';

export interface GameState {
    board: BoardState;
    players: Player[];
    currentPlayerIndex: number;
    bag: Tile[];
    gameOver: boolean;
    winner: string | null; // Player ID or Team ID
    moveHistory: Move[];
    gameMode?: GameMode;
    teamScores?: Record<string, number>;
}

export interface Move {
    playerId: string;
    word: string;
    score: number;
    tiles: { x: number; y: number; tile: Tile }[];
}
