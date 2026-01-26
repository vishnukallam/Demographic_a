// Moderation Utilities

const BLACKLIST_CATEGORIES = {
    explicit: ['nsfw', 'porn', 'adult', 'erotica', 'xxx', 'sexual', 'fetish', 'dating', 'hookup'],
    violence: ['gore', 'blood', 'kill', 'suicide', 'self-harm', 'weapons', 'explosives', 'guns', 'murder', 'terrorism'],
    hate: ['racist', 'nazi', 'slur', 'hate', 'supremacy', 'extremist', 'discrimination'],
    substances: ['drugs', 'cocaine', 'meth', 'ecstasy', 'dealer'], // 'weed' excluded if needed, but keeping strict for now based on prompt 'weed (unless medical...)' - prompt implies strict check.
    gambling: ['casino', 'betting', 'lottery', 'ponzi', 'crypto-scam']
};

/**
 * Checks if a text string contains any blacklisted terms.
 * @param {string} text
 * @returns {boolean} True if safe, False if flagged.
 */
const isSafe = (text) => {
    if (!text) return true;
    const lowerText = text.toLowerCase();

    // Check against all categories
    for (const category in BLACKLIST_CATEGORIES) {
        const keywords = BLACKLIST_CATEGORIES[category];
        for (const keyword of keywords) {
            // Simple inclusion check.
            // Better: Regex for word boundaries, but simple includes covers 'crypto-scam' etc.
            if (lowerText.includes(keyword)) {
                return false;
            }
        }
    }

    // Specific check for 'weed' context could go here, but prompt says "Illegal Substances: drugs, weed..."
    if (lowerText.includes('weed') && !lowerText.includes('medical')) {
        return false;
    }

    return true;
};

/**
 * Validates an array of interests.
 * @param {string[]} interests
 * @returns { object } { valid: boolean, flagged: string[] }
 */
const validateInterests = (interests) => {
    if (!Array.isArray(interests)) return { valid: true, flagged: [] };

    const flagged = [];
    for (const interest of interests) {
        if (!isSafe(interest)) {
            flagged.push(interest);
        }
    }

    return {
        valid: flagged.length === 0,
        flagged
    };
};

module.exports = {
    validateInterests,
    isSafe
};
