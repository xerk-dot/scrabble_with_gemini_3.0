/**
 * DAWG (Directed Acyclic Word Graph) / Trie implementation
 * Provides O(1) word validation and prefix checking for Scrabble AI
 */

export interface DAWGNode {
    children: Map<string, DAWGNode>;
    isEndOfWord: boolean;
}

/**
 * Create a new DAWG node
 */
function createNode(): DAWGNode {
    return {
        children: new Map(),
        isEndOfWord: false,
    };
}

/**
 * Build a DAWG from a list of words
 * @param words - Array of uppercase words to add to the DAWG
 * @returns Root node of the DAWG
 */
export function buildDAWG(words: string[]): DAWGNode {
    const root = createNode();

    for (const word of words) {
        let currentNode = root;

        for (const letter of word) {
            if (!currentNode.children.has(letter)) {
                currentNode.children.set(letter, createNode());
            }
            currentNode = currentNode.children.get(letter)!;
        }

        currentNode.isEndOfWord = true;
    }

    return root;
}

/**
 * Check if a word exists in the DAWG
 * @param root - Root node of the DAWG
 * @param word - Word to check (should be uppercase)
 * @returns true if word exists, false otherwise
 */
export function isValidWord(root: DAWGNode, word: string): boolean {
    let currentNode = root;

    for (const letter of word) {
        const child = currentNode.children.get(letter);
        if (!child) {
            return false;
        }
        currentNode = child;
    }

    return currentNode.isEndOfWord;
}

/**
 * Check if a prefix exists in the DAWG
 * Used for early termination during word generation
 * @param root - Root node of the DAWG
 * @param prefix - Prefix to check (should be uppercase)
 * @returns true if prefix exists, false otherwise
 */
export function isValidPrefix(root: DAWGNode, prefix: string): boolean {
    let currentNode = root;

    for (const letter of prefix) {
        const child = currentNode.children.get(letter);
        if (!child) {
            return false;
        }
        currentNode = child;
    }

    return true;
}

/**
 * Get the node at the end of a prefix path
 * @param root - Root node of the DAWG
 * @param prefix - Prefix to traverse
 * @returns The node at the end of the prefix, or null if prefix doesn't exist
 */
export function getNodeAtPrefix(root: DAWGNode, prefix: string): DAWGNode | null {
    let currentNode = root;

    for (const letter of prefix) {
        const child = currentNode.children.get(letter);
        if (!child) {
            return null;
        }
        currentNode = child;
    }

    return currentNode;
}

/**
 * Get all valid letters that can follow a given prefix
 * @param root - Root node of the DAWG
 * @param prefix - Prefix to check
 * @returns Set of valid letters that can follow the prefix
 */
export function getValidNextLetters(root: DAWGNode, prefix: string): Set<string> {
    const node = getNodeAtPrefix(root, prefix);
    if (!node) {
        return new Set();
    }

    return new Set(node.children.keys());
}

/**
 * Count total words in the DAWG (for debugging)
 */
export function countWords(root: DAWGNode): number {
    let count = 0;

    function traverse(node: DAWGNode) {
        if (node.isEndOfWord) {
            count++;
        }
        for (const child of node.children.values()) {
            traverse(child);
        }
    }

    traverse(root);
    return count;
}
