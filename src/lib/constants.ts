export const BOARD_SIZE = 15;

export type BonusType = 'DL' | 'TL' | 'DW' | 'TW' | 'START' | 'HAZARD';

export const STANDARD_BOARD: Record<string, BonusType> = {
  '0,0': 'TW', '0,7': 'TW', '0,14': 'TW',
  '7,0': 'TW', '7,14': 'TW',
  '14,0': 'TW', '14,7': 'TW', '14,14': 'TW',

  '1,1': 'DW', '2,2': 'DW', '3,3': 'DW', '4,4': 'DW',
  '10,10': 'DW', '11,11': 'DW', '12,12': 'DW', '13,13': 'DW',
  '1,13': 'DW', '2,12': 'DW', '3,11': 'DW', '4,10': 'DW',
  '10,4': 'DW', '11,3': 'DW', '12,2': 'DW', '13,1': 'DW',

  '1,5': 'TL', '1,9': 'TL', '5,1': 'TL', '5,5': 'TL', '5,9': 'TL', '5,13': 'TL',
  '9,1': 'TL', '9,5': 'TL', '9,9': 'TL', '9,13': 'TL', '13,5': 'TL', '13,9': 'TL',

  '0,3': 'DL', '0,11': 'DL', '2,6': 'DL', '2,8': 'DL', '3,0': 'DL', '3,7': 'DL', '3,14': 'DL',
  '6,2': 'DL', '6,6': 'DL', '6,8': 'DL', '6,12': 'DL',
  '7,3': 'DL', '7,11': 'DL',
  '8,2': 'DL', '8,6': 'DL', '8,8': 'DL', '8,12': 'DL',
  '11,0': 'DL', '11,7': 'DL', '11,14': 'DL', '12,6': 'DL', '12,8': 'DL',
  '14,3': 'DL', '14,11': 'DL',

  '7,7': 'START',
};

export const BONUS_BLITZ_BOARD: Record<string, BonusType> = {
  '0,0': 'TW', '0,14': 'TW', '14,0': 'TW', '14,14': 'TW',
  '7,0': 'TW', '0,7': 'TW', '7,14': 'TW', '14,7': 'TW',

  '2,2': 'DW', '2,12': 'DW', '12,2': 'DW', '12,12': 'DW',
  '3,3': 'DW', '3,11': 'DW', '11,3': 'DW', '11,11': 'DW',
  '4,4': 'DW', '4,10': 'DW', '10,4': 'DW', '10,10': 'DW',
  '5,5': 'DW', '5,9': 'DW', '9,5': 'DW', '9,9': 'DW',

  '1,1': 'TL', '1,13': 'TL', '13,1': 'TL', '13,13': 'TL',
  '6,6': 'TL', '6,8': 'TL', '8,6': 'TL', '8,8': 'TL',

  '7,7': 'START',
};

export const MEGA_BOARD_SIZE = 45;

// Helper to generate Mega Board from Standard Board
export const generateMegaBoard = (): Record<string, BonusType> => {
  const megaBoard: Record<string, BonusType> = {};
  const offsets = [0, 15, 30];

  for (const rowOffset of offsets) {
    for (const colOffset of offsets) {
      // Copy standard board to this position
      Object.entries(STANDARD_BOARD).forEach(([key, bonus]) => {
        const [x, y] = key.split(',').map(Number);
        const newX = x + colOffset;
        const newY = y + rowOffset;
        megaBoard[`${newX},${newY}`] = bonus;
      });
      // Ensure center of each sub-board is a START square
      megaBoard[`${colOffset + 7},${rowOffset + 7}`] = 'START';
    }
  }
  // And we should probably remove 'START' from the other 8 sub-boards to avoid confusion,
  // or treat them as just pink squares without the start property.
  // For now, let's just generate it and ensure 22,22 is START.

  return megaBoard;
};

export const MEGA_BOARD = generateMegaBoard();

export type BoardVariant = 'STANDARD' | 'BONUS_BLITZ' | 'RANDOM' | 'HAZARDS' | 'MEGA';

// Export a map of variants
export const BOARD_VARIANTS: Record<string, Record<string, BonusType>> = {
  STANDARD: STANDARD_BOARD,
  BONUS_BLITZ: BONUS_BLITZ_BOARD,
  RANDOM: {}, // Placeholder
  HAZARDS: {}, // Placeholder
  MEGA: MEGA_BOARD,
};

export const TILE_DISTRIBUTION: Record<string, { count: number; score: number }> = {
  A: { count: 9, score: 1 },
  B: { count: 2, score: 3 },
  C: { count: 2, score: 3 },
  D: { count: 4, score: 2 },
  E: { count: 12, score: 1 },
  F: { count: 2, score: 4 },
  G: { count: 3, score: 2 },
  H: { count: 2, score: 4 },
  I: { count: 9, score: 1 },
  J: { count: 1, score: 8 },
  K: { count: 1, score: 5 },
  L: { count: 4, score: 1 },
  M: { count: 2, score: 3 },
  N: { count: 6, score: 1 },
  O: { count: 8, score: 1 },
  P: { count: 2, score: 3 },
  Q: { count: 1, score: 10 },
  R: { count: 6, score: 1 },
  S: { count: 4, score: 1 },
  T: { count: 6, score: 1 },
  U: { count: 4, score: 1 },
  V: { count: 2, score: 4 },
  W: { count: 2, score: 4 },
  X: { count: 1, score: 8 },
  Y: { count: 2, score: 4 },
  Z: { count: 1, score: 10 },
  _: { count: 2, score: 0 }, // Blank tiles
};
