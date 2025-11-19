'use server';

import fs from 'fs';
import path from 'path';

// We'll use a singleton-like pattern for the dictionary set to avoid reloading it on every request
let dictionarySet: Set<string> | null = null;

const loadDictionary = async () => {
    if (dictionarySet) return dictionarySet;

    try {
        // Load SOWPODS dictionary from file
        const filePath = path.join(process.cwd(), 'sowpods.txt');

        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const words = fileContent.split('\n').map(word => word.trim().toUpperCase()).filter(word => word.length > 0);
            dictionarySet = new Set(words);
            console.log(`Loaded ${dictionarySet.size} words from SOWPODS dictionary`);
            return dictionarySet;
        } else {
            console.warn('SOWPODS file not found, using fallback dictionary');
            // Small fallback if file is missing
            const fallbackList = ['HELLO', 'WORLD', 'TEST', 'SCRABBLE', 'GAME', 'PLAY', 'WIN', 'LOSE', 'CAT', 'DOG', 'THE', 'AND', 'OR', 'BUT', 'NOT', 'YES', 'NO'];
            dictionarySet = new Set(fallbackList);
            return dictionarySet;
        }
    } catch (error) {
        console.error('Error loading dictionary:', error);
        // Return small fallback on error
        const fallbackList = ['HELLO', 'WORLD', 'TEST', 'SCRABBLE', 'GAME', 'PLAY', 'WIN', 'LOSE', 'CAT', 'DOG', 'THE', 'AND', 'OR', 'BUT', 'NOT', 'YES', 'NO'];
        return new Set(fallbackList);
    }
};

export async function validateWord(word: string): Promise<boolean> {
    const dict = await loadDictionary();
    return dict.has(word.toUpperCase());
}

export async function validateWords(words: string[]): Promise<string[]> {
    const dict = await loadDictionary();
    const invalidWords: string[] = [];
    for (const word of words) {
        if (!dict.has(word.toUpperCase())) {
            invalidWords.push(word);
        }
    }
    return invalidWords;
}
