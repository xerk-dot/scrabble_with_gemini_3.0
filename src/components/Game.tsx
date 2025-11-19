'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { Board } from './Board';
import { Rack } from './Rack';
import { useGame } from '@/context/GameContext';
import { BoardVariant } from '@/lib/constants';
import { Tile } from '@/lib/types';
import styles from './Game.module.css';

export const Game: React.FC = () => {
    const { placeTile, submitTurn, recallAll, shuffleRack, passTurn, resignTurn, gameState, message, startGame, movePreview } = useGame();
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const [selectedVariant, setSelectedVariant] = useState<BoardVariant>('STANDARD');
    const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
    const [selectedMode, setSelectedMode] = useState<'HUMAN_VS_AI' | 'AI_VS_AI'>('HUMAN_VS_AI');
    const [aiDifficulty2, setAiDifficulty2] = useState<'EASY' | 'MEDIUM' | 'HARD'>('HARD');
    const [theme, setTheme] = useState<'classic' | 'theme1' | 'theme2'>('classic');

    // Pan/Zoom State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const boardRef = useRef<HTMLDivElement>(null);

    const isAiVsAi = selectedMode === 'AI_VS_AI';

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
            const newScale = Math.min(Math.max(0.5, scale + delta), 3);
            setScale(newScale);
        }
    };

    const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 3));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
    const resetZoom = () => {
        setScale(1);
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
            const [_, x, y] = over.id.toString().split('-');
            const tile = active.data.current as Tile;
            placeTile(tile, parseInt(x), parseInt(y));
        }
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className={`${styles.gameContainer} ${theme === 'theme1' ? styles.theme1 : theme === 'theme2' ? styles.theme2 : styles.classicTheme}`} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                <div className={styles.topBar}>
                    <h1 className={styles.title}>Scrabble AI</h1>
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
                    <div className={styles.boardSection}>
                        <div className={styles.zoomControls}>
                            <button onClick={zoomIn} title="Zoom In">+</button>
                            <button onClick={zoomOut} title="Zoom Out">-</button>
                            <button onClick={resetZoom} title="Reset View">↺</button>
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
                            {gameState.players.map(p => (
                                <p key={p.id} className={p.id === currentPlayer?.id ? styles.activePlayer : ''}>
                                    {p.name}: {p.score}
                                </p>
                            ))}
                            <div className={styles.turnIndicator}>
                                Turn: {currentPlayer?.name}
                            </div>
                        </div>
                        <Rack />
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
                                {movePreview.error && (
                                    <div className={styles.previewError}>
                                        {movePreview.error}
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
                            <div>Tiles Left: {gameState.bagCount}</div>
                            <div className={styles.settings}>
                                <select
                                    value={selectedVariant}
                                    onChange={(e) => setSelectedVariant(e.target.value as any)}
                                    className={styles.select}
                                >
                                    <option value="STANDARD">Standard</option>
                                    <option value="TRIPLE_WORD_MAYHEM">Triple Word Mayhem</option>
                                    <option value="DOUBLE_LETTER_DASH">Double Letter Dash</option>
                                </select>
                                <select
                                    value={selectedDifficulty}
                                    onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                                    className={styles.select}
                                >
                                    <option value="EASY">Easy</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HARD">Hard</option>
                                </select>
                                <select
                                    value={selectedMode}
                                    onChange={(e) => setSelectedMode(e.target.value as any)}
                                    className={styles.select}
                                >
                                    <option value="HUMAN_VS_AI">Human vs AI</option>
                                    <option value="AI_VS_AI">AI vs AI</option>
                                </select>
                                {isAiVsAi && (
                                    <select
                                        value={aiDifficulty2}
                                        onChange={(e) => setAiDifficulty2(e.target.value as any)}
                                        className={styles.select}
                                    >
                                        <option value="EASY">AI 2: Easy</option>
                                        <option value="MEDIUM">AI 2: Medium</option>
                                        <option value="HARD">AI 2: Hard</option>
                                    </select>
                                )}
                                <button
                                    onClick={() => startGame(selectedVariant, selectedDifficulty, selectedMode, aiDifficulty2)}
                                    className={styles.button}
                                >
                                    New Game
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DndContext>
    );
};
