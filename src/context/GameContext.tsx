'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { GameState, Player, BoardState, Tile } from '@/lib/types';
import { initializeBoard, createTileBag, drawTiles } from '@/lib/gameUtils';

import { BOARD_VARIANTS, BoardVariant } from '@/lib/constants';

interface MovePreview {
    isValid: boolean;
    score: number;
    words: string[];
    errorMessage?: string;
}

interface GameContextType {
    gameState: GameState;
    currentMoveTiles: PlacedTile[];
    movePreview: MovePreview | null;
    placeTile: (tile: Tile, x: number, y: number) => void;
    recallTile: (x: number, y: number) => void;
    recallAll: () => void;
    shuffleRack: () => void;
    passTurn: () => void;
    resignTurn: () => void;
    submitTurn: () => Promise<void>;
    startGame: (variant?: BoardVariant, difficulty?: 'EASY' | 'MEDIUM' | 'HARD', mode?: 'HUMAN_VS_AI' | 'AI_VS_AI' | 'TEAMS', difficulty2?: 'EASY' | 'MEDIUM' | 'HARD', teamAiConfigs?: Array<{ difficulty: 'EASY' | 'MEDIUM' | 'HARD'; useHeuristics: boolean }>, mustStartOnStar?: boolean) => void;
    message: string | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

import { validateMove, PlacedTile } from '@/lib/validation';
import { calculateScore } from '@/lib/scoring';
import { validateWords } from '@/app/actions';
import { initGameLog, logGameEnd } from '@/lib/gameLogger';

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [gameState, setGameState] = useState<GameState>({
        board: [],
        players: [],
        currentPlayerIndex: 0,
        bag: [],
        gameOver: false,
        winner: null,
        moveHistory: [],
    });
    const [currentMoveTiles, setCurrentMoveTiles] = useState<PlacedTile[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [movePreview, setMovePreview] = useState<MovePreview | null>(null);

    const startGame = (
        variant: BoardVariant = 'STANDARD',
        difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM',
        mode: 'HUMAN_VS_AI' | 'AI_VS_AI' | 'TEAMS' = 'HUMAN_VS_AI',
        difficulty2: 'EASY' | 'MEDIUM' | 'HARD' = 'HARD',
        teamAiConfigs?: Array<{ difficulty: 'EASY' | 'MEDIUM' | 'HARD'; useHeuristics: boolean }>,
        mustStartOnStar: boolean = false
    ) => {
        const newBag = createTileBag(variant);
        let players: Player[] = [];
        let bag = newBag;
        let teamScores: Record<string, number> = {};

        if (mode === 'TEAMS' && variant === 'MEGA') {
            // 4x4 AI Battle: 2 Teams of 4 Players (8 total)
            const teams = ['Red', 'Blue'];
            teamScores = { Red: 0, Blue: 0 };

            let playerIndex = 0;
            // Interleave players: Red 1, Blue 1, Red 2, Blue 2...
            for (let i = 0; i < 4; i++) {
                for (const team of teams) {
                    const playerId = `p${playerIndex}`;
                    const config = teamAiConfigs?.[playerIndex] || { difficulty: 'MEDIUM', useHeuristics: false };
                    const { drawn, newBag } = drawTiles(bag, 7, playerId);
                    bag = newBag;
                    players.push({
                        id: playerId,
                        name: `${team} AI ${i + 1}`,
                        rack: drawn,
                        score: 0,
                        isAi: true,
                        difficulty: config.difficulty,
                        useHeuristics: config.useHeuristics,
                        teamId: team,
                        movesMade: 0,
                    });
                    playerIndex++;
                }
            }
        } else {
            // Standard 2 player setup
            const player1Id = 'p0';
            const player2Id = 'p1';

            const { drawn: p1Tiles, newBag: bagAfterP1 } = drawTiles(bag, 7, player1Id);
            const { drawn: p2Tiles, newBag: bagAfterP2 } = drawTiles(bagAfterP1, 7, player2Id);
            bag = bagAfterP2;

            const player1: Player = {
                id: player1Id,
                name: mode === 'AI_VS_AI' ? 'AI 1' : 'You',
                rack: p1Tiles,
                score: 0,
                isAi: mode === 'AI_VS_AI',
                difficulty: mode === 'AI_VS_AI' ? difficulty : undefined,
                teamId: 'Team 1',
                movesMade: 0,
            };

            const player2: Player = {
                id: player2Id,
                name: 'AI 2',
                rack: p2Tiles,
                score: 0,
                isAi: true,
                difficulty: mode === 'AI_VS_AI' ? difficulty2 : difficulty,
                teamId: 'Team 2',
                movesMade: 0,
            };
            players = [player1, player2];
            teamScores = { 'Team 1': 0, 'Team 2': 0 };
        }

        const newBoard = initializeBoard(variant);

        // Initialize game log (client-side, saved to localStorage)
        initGameLog(mode, variant);

        setGameState({
            board: newBoard,
            players: players,
            currentPlayerIndex: 0,
            bag: bag,
            gameOver: false,
            winner: null,
            moveHistory: [],
            gameMode: mode,
            teamScores: teamScores,
            mustStartOnStar: mustStartOnStar,
        });
        setCurrentMoveTiles([]);
        setMessage(null);
    };

    useEffect(() => {
        startGame();
    }, []);

    // AI Turn Logic
    useEffect(() => {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (currentPlayer && currentPlayer.isAi && !gameState.gameOver) {
            const performAiTurn = async () => {
                // Small delay for realism
                await new Promise(resolve => setTimeout(resolve, 500)); // Faster for 16 players

                try {
                    const { generateAiMove } = await import('@/app/ai-actions');
                    const bestMove = await generateAiMove(
                        gameState.board,
                        currentPlayer.rack,
                        currentPlayer.difficulty || 'MEDIUM',
                        currentPlayer.useHeuristics || false,
                        currentPlayer.name,
                        currentPlayer,
                        gameState.mustStartOnStar
                    );

                    // Helper function to check if any teammate can play
                    const canTeammatePlay = async (teamId: string, currentPlayerId: string) => {
                        const teammates = gameState.players.filter(
                            p => p.teamId === teamId && p.id !== currentPlayerId && p.isAi && !p.resigned
                        );
                        for (const teammate of teammates) {
                            const teammateMove = await generateAiMove(
                                gameState.board,
                                teammate.rack,
                                teammate.difficulty || 'MEDIUM',
                                teammate.useHeuristics || false,
                                teammate.name
                            );
                            if (teammateMove) {
                                return true;
                            }
                        }
                        return false;
                    };

                    if (bestMove) {
                        // Apply move
                        const newBoard = [...gameState.board];
                        bestMove.tiles.forEach(({ x, y, tile }) => {
                            newBoard[y] = [...newBoard[y]];
                            newBoard[y][x] = { ...newBoard[y][x], tile };
                        });

                        // Refill rack
                        const tilesNeeded = 7 - (currentPlayer.rack.length - bestMove.tiles.length);
                        const { drawn, newBag } = drawTiles(gameState.bag, tilesNeeded, currentPlayer.id);

                        // Remove used tiles from rack
                        const usedIds = new Set(bestMove.tiles.map(t => t.tile.id));
                        const remainingRack = currentPlayer.rack.filter(t => !usedIds.has(t.id));
                        const newRack = [...remainingRack, ...drawn];

                        const newPlayers = [...gameState.players];
                        const newScore = currentPlayer.score + bestMove.score;

                        newPlayers[gameState.currentPlayerIndex] = {
                            ...currentPlayer,
                            rack: newRack,
                            score: newScore,
                            movesMade: (currentPlayer.movesMade || 0) + 1,
                        };

                        // Update Team Score
                        const newTeamScores = { ...gameState.teamScores };
                        if (currentPlayer.teamId) {
                            newTeamScores[currentPlayer.teamId] = (newTeamScores[currentPlayer.teamId] || 0) + bestMove.score;
                        }

                        const move = {
                            playerId: currentPlayer.id,
                            word: bestMove.word,
                            score: bestMove.score,
                            tiles: bestMove.tiles.map(t => ({ ...t, tile: t.tile }))
                        };

                        setGameState(prev => ({
                            ...prev,
                            board: newBoard,
                            players: newPlayers,
                            bag: newBag,
                            moveHistory: [...prev.moveHistory, move],
                            currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
                            teamScores: newTeamScores,
                        }));

                        setMessage(`${currentPlayer.name} played ${bestMove.word} for ${bestMove.score} points.`);
                    } else {
                        // AI has no valid moves
                        const newPlayers = [...gameState.players];
                        newPlayers[gameState.currentPlayerIndex] = {
                            ...currentPlayer,
                            resigned: true
                        };

                        // Check if entire team should be resigned
                        if (gameState.gameMode === 'TEAMS' && currentPlayer.teamId) {
                            const teamPlayers = newPlayers.filter(p => p.teamId === currentPlayer.teamId);
                            const allTeamResigned = teamPlayers.every(p => p.resigned);

                            if (allTeamResigned) {
                                // Resign entire team
                                setMessage(`All ${currentPlayer.teamId} Team players have resigned!`);
                            }
                        }

                        // Check if all players have resigned
                        const allResigned = newPlayers.every(p => p.resigned);

                        if (allResigned) {
                            // Game over - find winner
                            let winnerId: string | null = null;

                            if (gameState.gameMode === 'TEAMS') {
                                // Find winning team
                                const winningTeam = Object.entries(gameState.teamScores || {}).reduce((a, b) => a[1] > b[1] ? a : b)[0];
                                winnerId = winningTeam;
                                setMessage(`Game Over! Team ${winningTeam} wins!`);
                            } else {
                                const winner = newPlayers.reduce((prev, current) =>
                                    (prev.score > current.score) ? prev : current
                                );
                                winnerId = winner.id;
                                setMessage(`Game Over! ${winner.name} wins with ${winner.score} points!`);
                            }

                            setGameState(prev => ({
                                ...prev,
                                players: newPlayers,
                                gameOver: true,
                                winner: winnerId
                            }));
                        } else {
                            setGameState(prev => ({
                                ...prev,
                                players: newPlayers,
                                currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length
                            }));
                            if (!allResigned) {
                                setMessage(`${currentPlayer.name} has resigned (no valid moves).`);
                            }
                        }
                    }
                } catch (error) {
                    console.error('AI Error:', error);
                    // Skip turn on error to avoid loop
                    setGameState(prev => ({
                        ...prev,
                        currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length
                    }));
                }
            };

            performAiTurn();
        }
    }, [gameState.currentPlayerIndex, gameState.gameOver, gameState.board, gameState.players, gameState.bag]);

    // Live Preview Logic
    useEffect(() => {
        if (currentMoveTiles.length === 0) {
            setMovePreview(null);
            return;
        }

        const computePreview = async () => {
            const isFirstMove = gameState.moveHistory.length === 0;
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];

            // Validate placement
            const validation = validateMove(gameState.board, currentMoveTiles, isFirstMove, currentPlayer, gameState.mustStartOnStar);

            if (!validation.isValid) {
                setMovePreview({
                    isValid: false,
                    score: 0,
                    words: [],
                    errorMessage: validation.message,
                });
                return;
            }

            // Validate words
            let wordValid = true;
            let invalidWordsList: string[] = [];
            if (validation.words && validation.words.length > 0) {
                invalidWordsList = await validateWords(validation.words);
                wordValid = invalidWordsList.length === 0;
            }

            // Calculate score
            const score = calculateScore(gameState.board, currentMoveTiles);

            setMovePreview({
                isValid: wordValid,
                score: wordValid ? score : 0,
                words: validation.words || [],
                errorMessage: wordValid ? undefined : `Invalid words: ${invalidWordsList.join(', ')}`,
            });
        };

        computePreview();
    }, [currentMoveTiles, gameState.board, gameState.moveHistory]);

    const placeTile = (tile: Tile, x: number, y: number) => {
        if (gameState.gameOver) return;

        // Check if square is occupied
        if (gameState.board[y][x].tile || currentMoveTiles.some(t => t.x === x && t.y === y)) {
            return;
        }

        // Remove from rack
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const newRack = currentPlayer.rack.filter(t => t.id !== tile.id);

        // Update player rack in state
        const newPlayers = [...gameState.players];
        newPlayers[gameState.currentPlayerIndex] = { ...currentPlayer, rack: newRack };

        setGameState(prev => ({ ...prev, players: newPlayers }));
        setCurrentMoveTiles(prev => [...prev, { x, y, tile }]);
        setMessage(null);
    };

    const recallTile = (x: number, y: number) => {
        const tileToRecall = currentMoveTiles.find(t => t.x === x && t.y === y);
        if (!tileToRecall) return;

        // Remove from current moves
        setCurrentMoveTiles(prev => prev.filter(t => !(t.x === x && t.y === y)));

        // Add back to rack
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const newRack = [...currentPlayer.rack, tileToRecall.tile];

        const newPlayers = [...gameState.players];
        newPlayers[gameState.currentPlayerIndex] = { ...currentPlayer, rack: newRack };

        setGameState(prev => ({ ...prev, players: newPlayers }));
    };

    const recallAll = () => {
        if (currentMoveTiles.length === 0) return;

        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const tiles = currentMoveTiles.map(t => t.tile);
        const newRack = [...currentPlayer.rack, ...tiles];

        const newPlayers = [...gameState.players];
        newPlayers[gameState.currentPlayerIndex] = { ...currentPlayer, rack: newRack };

        setGameState(prev => ({ ...prev, players: newPlayers }));
        setCurrentMoveTiles([]);
    };

    const shuffleRack = () => {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const newRack = [...currentPlayer.rack];
        // Fisher-Yates shuffle
        for (let i = newRack.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newRack[i], newRack[j]] = [newRack[j], newRack[i]];
        }

        const newPlayers = [...gameState.players];
        newPlayers[gameState.currentPlayerIndex] = { ...currentPlayer, rack: newRack };
        setGameState(prev => ({ ...prev, players: newPlayers }));
    };

    const passTurn = () => {
        recallAll();
        // Switch turn
        setGameState(prev => ({
            ...prev,
            currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length
        }));
    };

    const resignTurn = () => {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        // Mark player as resigned
        const newPlayers = [...gameState.players];
        newPlayers[gameState.currentPlayerIndex] = { ...currentPlayer, resigned: true };

        // Check if all players have resigned
        const allResigned = newPlayers.every(p => p.resigned);

        if (allResigned) {
            // Game over - find winner
            let winnerId: string | null = null;

            if (gameState.gameMode === 'TEAMS') {
                const winningTeam = Object.entries(gameState.teamScores || {}).reduce((a, b) => a[1] > b[1] ? a : b)[0];
                winnerId = winningTeam;
                setMessage(`Game Over! Team ${winningTeam} wins!`);
            } else {
                const winner = newPlayers.reduce((max, p) => p.score > max.score ? p : max, newPlayers[0]);

                // Log game end
                const finalScores: Record<string, number> = {};
                newPlayers.forEach(p => finalScores[p.name] = p.score);
                logGameEnd(winner.name, finalScores);

                setMessage(`Game Over! Winner: ${winner.name} with ${winner.score} points`);
                setGameState(prev => ({
                    ...prev,
                    players: newPlayers,
                    gameOver: true,
                    winner: winner.name
                }));
            }
        } else {
            // Move to next player
            setMessage(`${currentPlayer.name} has resigned.`);
            setGameState(prev => ({
                ...prev,
                players: newPlayers,
                currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length
            }));
        }

        setCurrentMoveTiles([]);
    };

    const submitTurn = async () => {
        if (currentMoveTiles.length === 0) return;

        const isFirstMove = gameState.moveHistory.length === 0;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        // 1. Validate placement
        const validation = validateMove(gameState.board, currentMoveTiles, isFirstMove, currentPlayer, gameState.mustStartOnStar);
        if (!validation.isValid) {
            setMessage(validation.message || 'Invalid move');
            return;
        }

        // 2. Validate words
        if (validation.words && validation.words.length > 0) {
            const invalidWords = await validateWords(validation.words);
            if (invalidWords.length > 0) {
                setMessage(`Invalid words: ${invalidWords.join(', ')}`);
                return;
            }
        }

        // 3. Calculate Score
        const score = calculateScore(gameState.board, currentMoveTiles);

        // 4. Commit move
        const newBoard = [...gameState.board];
        currentMoveTiles.forEach(({ x, y, tile }) => {
            newBoard[y] = [...newBoard[y]];
            newBoard[y][x] = { ...newBoard[y][x], tile };
        });

        // 5. Refill rack
        const tilesNeeded = 7 - currentPlayer.rack.length;
        const { drawn, newBag } = drawTiles(gameState.bag, tilesNeeded, currentPlayer.id);
        const newRack = [...currentPlayer.rack, ...drawn];

        const newPlayers = [...gameState.players];
        newPlayers[gameState.currentPlayerIndex] = {
            ...currentPlayer,
            rack: newRack,
            score: currentPlayer.score + score,
            movesMade: (currentPlayer.movesMade || 0) + 1,
        };

        // Update Team Score
        const newTeamScores = { ...gameState.teamScores };
        if (currentPlayer.teamId) {
            newTeamScores[currentPlayer.teamId] = (newTeamScores[currentPlayer.teamId] || 0) + score;
        }

        const move = {
            playerId: currentPlayer.id,
            word: validation.words ? validation.words.join(', ') : '',
            score,
            tiles: currentMoveTiles
        };

        setGameState(prev => ({
            ...prev,
            board: newBoard,
            players: newPlayers,
            bag: newBag,
            moveHistory: [...prev.moveHistory, move],
            currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
            teamScores: newTeamScores,
        }));

        setCurrentMoveTiles([]);
        setMessage(null);
    };

    return (
        <GameContext.Provider value={{
            gameState,
            currentMoveTiles,
            movePreview,
            placeTile,
            recallTile,
            recallAll,
            shuffleRack,
            passTurn,
            resignTurn,
            submitTurn,
            startGame,
            message
        }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};
