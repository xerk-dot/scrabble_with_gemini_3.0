/**
 * Team color utilities for visual distinction in Teams mode
 */

/**
 * Get color for a player based on their team and player index
 * Returns different shades of red/blue for team members
 */
export function getPlayerColor(teamId: string | undefined, playerIndex: number): string {
    if (!teamId) return '#f1c40f'; // Default yellow for non-team games

    if (teamId === 'Red') {
        // Different shades of red for Red team members
        const redShades = [
            '#e74c3c', // Bright red
            '#c0392b', // Dark red
            '#ff6b6b', // Light red
            '#d63031'  // Medium red
        ];
        return redShades[playerIndex % redShades.length];
    } else if (teamId === 'Blue') {
        // Different shades of blue for Blue team members
        const blueShades = [
            '#3498db', // Bright blue
            '#2980b9', // Dark blue
            '#74b9ff', // Light blue
            '#0984e3'  // Medium blue
        ];
        return blueShades[playerIndex % blueShades.length];
    }

    return '#f1c40f'; // Fallback
}

/**
 * Get text color that contrasts well with the background
 */
export function getContrastColor(backgroundColor: string): string {
    // Simple contrast check - use white for dark colors, black for light
    const darkColors = ['#c0392b', '#2980b9', '#d63031', '#0984e3'];
    return darkColors.includes(backgroundColor) ? '#ffffff' : '#2c3e50';
}
