/**
 * Client-side game logging using localStorage
 * Saves game logs in the browser for later analysis
 */

interface LogEntry {
    timestamp: string;
    playerName: string;
    word: string;
    actualScore: number;
    selectionScore?: number;
    rackBefore: string;
    rackAfter: string;
    rackLeaveScore?: number;
    boardControlScore?: number;
}

interface GameLog {
    gameId: string;
    mode: string;
    variant: string;
    startTime: string;
    entries: LogEntry[];
    endTime?: string;
    winner?: string;
    finalScores?: Record<string, number>;
}

let currentLog: GameLog | null = null;

/**
 * Initialize a new game log
 */
export function initGameLog(mode: string, variant: string): void {
    const gameId = `game-${Date.now()}`;
    currentLog = {
        gameId,
        mode,
        variant,
        startTime: new Date().toISOString(),
        entries: []
    };
}

/**
 * Log an AI move
 */
export function logAiMove(
    playerName: string,
    word: string,
    actualScore: number,
    selectionScore: number | undefined,
    rackBefore: string,
    rackAfter: string
): void {
    if (!currentLog) return;

    currentLog.entries.push({
        timestamp: new Date().toISOString(),
        playerName,
        word,
        actualScore,
        selectionScore,
        rackBefore,
        rackAfter
    });
}

/**
 * Log heuristic breakdown
 */
export function logHeuristicBreakdown(
    playerName: string,
    rackLeaveScore: number,
    boardControlScore: number,
    totalAdjustment: number
): void {
    if (!currentLog || currentLog.entries.length === 0) return;

    // Add to the most recent entry
    const lastEntry = currentLog.entries[currentLog.entries.length - 1];
    if (lastEntry.playerName === playerName) {
        lastEntry.rackLeaveScore = rackLeaveScore;
        lastEntry.boardControlScore = boardControlScore;
    }
}

/**
 * End the current game log
 */
export function logGameEnd(winner: string | null, finalScores: Record<string, number>): void {
    if (!currentLog) return;

    currentLog.endTime = new Date().toISOString();
    currentLog.winner = winner || 'Tie';
    currentLog.finalScores = finalScores;

    // Save to localStorage
    saveLogToStorage(currentLog);
    currentLog = null;
}

/**
 * Save log to localStorage
 */
function saveLogToStorage(log: GameLog): void {
    try {
        const existingLogs = getAllLogs();
        existingLogs.push(log);

        // Keep only last 10 games to avoid filling up localStorage
        const recentLogs = existingLogs.slice(-10);

        localStorage.setItem('scrabble-game-logs', JSON.stringify(recentLogs));
        console.log(`✅ Game log saved: ${log.gameId}`);
    } catch (error) {
        console.error('Failed to save game log:', error);
    }
}

/**
 * Get all saved logs
 */
export function getAllLogs(): GameLog[] {
    try {
        const stored = localStorage.getItem('scrabble-game-logs');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to load game logs:', error);
        return [];
    }
}

/**
 * Get the most recent log
 */
export function getLatestLog(): GameLog | null {
    const logs = getAllLogs();
    return logs.length > 0 ? logs[logs.length - 1] : null;
}

/**
 * Export log as downloadable text file
 */
export function downloadLog(log: GameLog): void {
    const lines: string[] = [];

    lines.push('=== Scrabble Game Log ===');
    lines.push(`Mode: ${log.mode}`);
    lines.push(`Variant: ${log.variant}`);
    lines.push(`Started: ${log.startTime}`);
    lines.push('');

    for (const entry of log.entries) {
        lines.push(`[${entry.timestamp}] ${entry.playerName}`);
        lines.push(`  Word: ${entry.word}`);
        lines.push(`  Actual Score: ${entry.actualScore}`);

        if (entry.selectionScore !== undefined && entry.selectionScore !== entry.actualScore) {
            const adj = entry.selectionScore - entry.actualScore;
            lines.push(`  Selection Score: ${entry.selectionScore.toFixed(1)} (${adj > 0 ? '+' : ''}${adj.toFixed(1)})`);
        }

        lines.push(`  Rack Before: ${entry.rackBefore}`);
        lines.push(`  Rack After: ${entry.rackAfter}`);

        if (entry.rackLeaveScore !== undefined) {
            lines.push(`  Heuristic Breakdown:`);
            lines.push(`    Rack Leave: ${entry.rackLeaveScore.toFixed(1)}`);
            lines.push(`    Board Control: ${entry.boardControlScore?.toFixed(1) || '0.0'}`);
        }

        lines.push('');
    }

    if (log.endTime) {
        lines.push('=== Game Ended ===');
        lines.push(`Winner: ${log.winner}`);
        lines.push(`Final Scores:`);
        if (log.finalScores) {
            Object.entries(log.finalScores).forEach(([player, score]) => {
                lines.push(`  ${player}: ${score}`);
            });
        }
        lines.push(`Ended: ${log.endTime}`);
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${log.gameId}.log`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Clear all logs
 */
export function clearAllLogs(): void {
    localStorage.removeItem('scrabble-game-logs');
    console.log('All game logs cleared');
}
