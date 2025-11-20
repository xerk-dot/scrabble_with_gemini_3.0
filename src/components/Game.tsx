'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { Board } from './Board';
import { Rack } from './Rack';
import { Tile as DraggableTile } from './Tile';
import { useGame } from '@/context/GameContext';
import { BoardVariant } from '@/lib/constants';
import { Tile } from '@/lib/types';
import styles from './Game.module.css';

export const Game: React.FC = () => {
    const { placeTile, submitTurn, recallAll, shuffleRack, passTurn, resignTurn, gameState, message, startGame, movePreview } = useGame();
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const [selectedVariant, setSelectedVariant] = useState<BoardVariant>('STANDARD');
    const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
    const [mode, setMode] = useState<'HUMAN_VS_AI' | 'AI_VS_AI' | 'TEAMS'>('HUMAN_VS_AI');
    const [aiDifficulty2, setAiDifficulty2] = useState<'EASY' | 'MEDIUM' | 'HARD'>('HARD');
    const [theme, setTheme] = useState<'classic' | 'theme1' | 'theme2'>('classic');

    // Pan/Zoom State
    const [scale, setScale] = useState(selectedVariant === 'MEGA' ? 0.33 : 1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const isAiVsAi = mode === 'AI_VS_AI';
    const isTeams = mode === 'TEAMS';

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (selectedVariant === 'MEGA') {
            setScale(0.33);
        } else {
            setScale(1);
        }
        setPosition({ x: 0, y: 0 });
    }, [selectedVariant]);

    const cycleTheme = () => {
        setTheme(prev => {
            if (prev === 'classic') return 'theme1';
            if (prev === 'theme1') return 'theme2';
            return 'classic';
        });
    };

    // Zoom Handlers
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY * -0.001;
            const newScale = Math.min(Math.max(0.2, scale + delta), 3); // Allow zooming out more for Mega Board
            setScale(newScale);
        }
    };

    const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 3));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.2));
    const resetZoom = () => {
        setScale(selectedVariant === 'MEGA' ? 0.33 : 1);
        setPosition({ x: 0, y: 0 });
    };

    // Pan Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // Left click only
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && over.id.toString().startsWith('cell-')) {
            const [x, y] = over.id.toString().split('-').slice(1).map(Number);
            const tile = active.data.current as Tile;
            placeTile(tile, x, y);
        }
    };

    const [isFullScreen, setIsFullScreen] = useState(false);

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newVariant = e.target.value as BoardVariant;
        setSelectedVariant(newVariant);
        // Reset mode if switching away from MEGA and currently in TEAMS
        if (newVariant !== 'MEGA' && mode === 'TEAMS') {
            setMode('HUMAN_VS_AI');
        }
    };

    const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setMode(e.target.value as 'HUMAN_VS_AI' | 'AI_VS_AI' | 'TEAMS');
    };

    const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setDifficulty(e.target.value as 'EASY' | 'MEDIUM' | 'HARD');
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className={`${styles.gameContainer} ${theme === 'theme1' ? styles.theme1 : theme === 'theme2' ? styles.theme2 : styles.classicTheme}`} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                <div className={styles.topBar}>
                    <h1 className={styles.title}>Scrabble AI Arena</h1>
                    <button
                        className={styles.themeToggle}
                        onClick={cycleTheme}
                        title="Cycle themes"
                    >
                        {theme === 'classic' ? 'Theme: Classic' : theme === 'theme1' ? 'Theme: Tactical' : 'Theme: Retro'}
                    </button>
                </div>

                {message && <div className={styles.message}>{message}</div>}

                <div className={styles.mainContent}>
                    <div className={`${styles.boardSection} ${isFullScreen ? styles.fullScreen : ''}`}>
                        <div className={styles.zoomControls}>
                            <button onClick={zoomIn} title="Zoom In">+</button>
                            <button onClick={zoomOut} title="Zoom Out">-</button>
                            <button onClick={resetZoom} title="Reset View">↺</button>
                            <button onClick={toggleFullScreen} title={isFullScreen ? "Exit Full Screen" : "Full Screen"}>
                                {isFullScreen ? '✕' : '⛶'}
                            </button>
                        </div>
                        <div
                            className={styles.boardWrapper}
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                        >
                            <div
                                style={{
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                    transformOrigin: 'center',
                                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                                }}
                            >
                                <Board theme={theme} />
                            </div>
                        </div>
                    </div>

                    <div className={styles.controlsSection}>
                        <div className={styles.scoreBoard}>
                            <h2>Scores</h2>
                            {gameState.players.map((player, index) => (
                                <div key={player.id} style={{ marginBottom: '10px' }}>
                                    <div className={index === gameState.currentPlayerIndex ? styles.activePlayer : ''}>
                                        {player.name}: {player.score}
                                        {player.teamId && ` (${player.teamId})`}
                                    </div>
                                    {/* Display AI Rack */}
                                    {player.isAi && (
                                        <div className={styles.miniRack}>
                                            {player.rack.map((tile, i) => (
                                                <span key={i} className={styles.miniTile}>
                                                    {gameState.gameMode === 'HUMAN_VS_AI' ? '◼' : tile.letter}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {gameState.teamScores && (
                                <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '10px' }}>
                                    <h3>Team Scores</h3>
                                    {Object.entries(gameState.teamScores).map(([teamId, score]) => (
                                        <div key={teamId} style={{ color: teamId === 'Red' ? '#e74c3c' : '#3498db', fontWeight: 'bold' }}>
                                            {teamId}: {score}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className={styles.turnIndicator}>
                                Tiles left: {gameState.bag.length}
                            </div>
                        </div>
                        {/* Rack - Only show if not in AI-only modes */}
                        {mode !== 'AI_VS_AI' && mode !== 'TEAMS' && (
                            <Rack />
                        )}
                        {movePreview && (
                            <div className={`${styles.preview} ${movePreview.isValid ? styles.previewValid : styles.previewInvalid}`}>
                                <div className={styles.previewHeader}>
                                    {movePreview.isValid ? '✓ Valid Move' : '✗ Invalid Move'}
                                </div>
                                {movePreview.words.length > 0 && (
                                    <div className={styles.previewWords}>
                                        Words: {movePreview.words.join(', ')}
                                    </div>
                                )}
                                <div className={styles.previewScore}>
                                    Score: {movePreview.score}
                                </div>
                                {movePreview.errorMessage && (
                                    <div className={styles.previewError}>
                                        {movePreview.errorMessage}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className={styles.controls}>
                            <button onClick={() => submitTurn()} className={`${styles.button} ${styles.submitBtn}`}>Submit Turn</button>
                            <button onClick={() => recallAll()} className={styles.button}>Recall All</button>
                            <button onClick={() => shuffleRack()} className={styles.button}>Shuffle</button>
                            <button onClick={() => passTurn()} className={styles.button}>Pass</button>
                            <button onClick={() => resignTurn()} className={`${styles.button} ${styles.resignBtn}`}>Resign</button>
                        </div>
                        <div className={styles.gameInfo}>
                            <div>Tiles Left: {gameState.bag.length}</div>
                            <div className={styles.settings}>
                                <select className={styles.select} value={selectedVariant} onChange={handleVariantChange}>
                                    <option value="STANDARD">Standard Board (15x15)</option>
                                    <option value="BONUS_BLITZ">Bonus Blitz</option>
                                    <option value="RANDOM">Random</option>
                                    <option value="HAZARDS">Hazards</option>
                                    <option value="MEGA">Mega Board (3x3)</option>
                                </select>

                                <select className={styles.select} value={mode} onChange={handleModeChange}>
                                    <option value="HUMAN_VS_AI">Human vs AI</option>
                                    <option value="AI_VS_AI">AI vs AI</option>
                                    {selectedVariant === 'MEGA' && <option value="TEAMS">Teams (Mega Only)</option>}
                                </select>
                                <select
                                    value={difficulty}
                                    onChange={handleDifficultyChange}
                                    className={styles.select}
                                >
                                    <option value="EASY">Easy</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HARD">Hard</option>
                                </select>

                                {isAiVsAi && (
                                    <select
                                        value={aiDifficulty2}
                                        onChange={(e) => setAiDifficulty2(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')}
                                        className={styles.select}
                                    >
                                        <option value="EASY">AI 2: Easy</option>
                                        <option value="MEDIUM">AI 2: Medium</option>
                                        <option value="HARD">AI 2: Hard</option>
                                    </select>
                                )}

                                <button
                                    onClick={() => startGame(selectedVariant, difficulty, mode, aiDifficulty2)}
                                    className={styles.button}
                                >
                                    {isTeams && selectedVariant === 'MEGA' ? 'Start 4x4 AI Battle' : 'New Game'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DndContext>
    );
};
