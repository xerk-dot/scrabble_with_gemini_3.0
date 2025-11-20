'use client';

import React, { useState } from 'react';
import { getAllLogs, getLatestLog, downloadLog, clearAllLogs } from '@/lib/gameLogger';
import styles from './GameLogs.module.css';

export const GameLogs: React.FC = () => {
    const [logs, setLogs] = useState(getAllLogs());
    const [isOpen, setIsOpen] = useState(false);

    const refreshLogs = () => {
        setLogs(getAllLogs());
    };

    const handleDownload = (log: any) => {
        downloadLog(log);
    };

    const handleClearAll = () => {
        if (confirm('Clear all game logs?')) {
            clearAllLogs();
            refreshLogs();
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => { setIsOpen(true); refreshLogs(); }}
                className={styles.toggleButton}
                title="View Game Logs"
            >
                📊 Logs ({logs.length})
            </button>
        );
    }

    return (
        <div className={styles.modal}>
            <div className={styles.modalContent}>
                <div className={styles.header}>
                    <h2>Game Logs</h2>
                    <button onClick={() => setIsOpen(false)} className={styles.closeButton}>✕</button>
                </div>

                <div className={styles.logList}>
                    {logs.length === 0 ? (
                        <p className={styles.empty}>No logs yet. Play a game with heuristics enabled!</p>
                    ) : (
                        logs.map((log, index) => (
                            <div key={log.gameId} className={styles.logItem}>
                                <div className={styles.logHeader}>
                                    <strong>Game {logs.length - index}</strong>
                                    <span>{log.mode} - {log.variant}</span>
                                </div>
                                <div className={styles.logDetails}>
                                    <div>Started: {new Date(log.startTime).toLocaleString()}</div>
                                    <div>Moves: {log.entries.length}</div>
                                    {log.winner && <div>Winner: {log.winner}</div>}
                                </div>
                                <button
                                    onClick={() => handleDownload(log)}
                                    className={styles.downloadButton}
                                >
                                    💾 Download
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {logs.length > 0 && (
                    <div className={styles.footer}>
                        <button onClick={handleClearAll} className={styles.clearButton}>
                            🗑️ Clear All Logs
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
