/**
 * Missing Card Recommender
 * V261 - Iteration 6/9 - Card Set Collection Tracker
 * Analyzes missing cards and recommends acquisition priorities
 */

class MissingCardRecommender {
  constructor() {
    this.rarityWeights = {
      common: 1,
      rare: 3,
      epic: 5,
      legendary: 8
    };
    
    this.basePriority = 10;
  }

  /**
   * Get list of cards not in player's collection
   * @param {Array} allCards - Complete list of all cards
   * @param {string[]} ownedCardIds - Array of owned card IDs
   * @returns {Array} Array of missing card objects
   */
  getMissingCards(allCards, ownedCardIds) {
    if (!allCards || !Array.isArray(allCards)) {
      return [];
    }
    
    const ownedSet = new Set(ownedCardIds || []);
    return allCards.filter(card => !ownedSet.has(card.id));
  }

  /**
   * Calculate acquisition priority for a card
   * @param {Object} card - Card object to evaluate
   * @returns {number} Priority score (higher = more important)
   */
  calculatePriority(card) {
    let priority = this.basePriority;
    
    // Power contribution (0-10 scale)
    const powerScore = Math.min((card.power || 0) / 10, 1) * 20;
    priority += powerScore;
    
    // Rarity weight (collectible value)
    const rarityWeight = this.rarityWeights[card.rarity] || 1;
    priority += rarityWeight * 5;
    
    // Synergy bonus
    const synergyCount = (card.synergyTags && card.synergyTags.length) || 0;
    priority += synergyCount * 3;
    
    return Math.round(priority * 100) / 100;
  }

  /**
   * Get prioritized recommendations for missing cards
   * @param {Array} allCards - Complete list of all cards
   * @param {string[]} ownedCardIds - Array of owned card IDs
   * @param {Object} options - Filter options
   * @param {number} options.limit - Maximum number of recommendations
   * @param {string} options.rarity - Filter by rarity
   * @param {string} options.type - Filter by card type
   * @returns {Array} Prioritized array of recommendation objects
   */
  getRecommendations(allCards, ownedCardIds, options = {}) {
    const missing = this.getMissingCards(allCards, ownedCardIds);
    
    // Apply filters
    let filtered = missing;
    if (options.rarity) {
      filtered = filtered.filter(c => c.rarity === options.rarity);
    }
    if (options.type) {
      filtered = filtered.filter(c => c.type === options.type);
    }
    
    // Calculate priorities
    const recommendations = filtered.map(card => {
      const priority = this.calculatePriority(card);
      const reasons = this.generateReasons(card, priority);
      
      return {
        card,
        priority,
        reasons
      };
    });
    
    // Sort by priority descending
    recommendations.sort((a, b) => b.priority - a.priority);
    
    // Apply limit
    if (options.limit && options.limit > 0) {
      return recommendations.slice(0, options.limit);
    }
    
    return recommendations;
  }

  /**
   * Generate human-readable reasons for a recommendation
   * @param {Object} card - Card object
   * @param {number} priority - Calculated priority
   * @returns {string[]} Array of reason strings
   */
  generateReasons(card, priority) {
    const reasons = [];
    
    if (card.power && card.power >= 7) {
      reasons.push('High power');
    }
    
    if (card.rarity === 'legendary') {
      reasons.push('Legendary collectible');
    } else if (card.rarity === 'epic') {
      reasons.push('Epic rarity');
    }
    
    if (card.synergyTags && card.synergyTags.length >= 2) {
      reasons.push('Multi-synergy card');
    }
    
    if (!reasons.length) {
      reasons.push('Solid card');
    }
    
    return reasons;
  }

  /**
   * Calculate resources needed to acquire missing cards
   * @param {Array} cards - Array of card objects
   * @returns {Object} Resource cost estimate { dust, gold }
   */
  calculateResourceCost(cards) {
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return { dust: 0, gold: 0 };
    }
    
    let dust = 0;
    let gold = 0;
    
    const dustCosts = {
      common: 40,
      rare: 100,
      epic: 400,
      legendary: 1600
    };
    
    const goldCosts = {
      common: 50,
      rare: 100,
      epic: 300,
      legendary: 800
    };
    
    cards.forEach(card => {
      const rarity = card.rarity || 'common';
      dust += dustCosts[rarity] || dustCosts.common;
      gold += goldCosts[rarity] || goldCosts.common;
    });
    
    return { dust, gold };
  }

  /**
   * Get collection completion estimate
   * @param {Array} allCards - Complete list of all cards
   * @param {string[]} ownedCardIds - Array of owned card IDs
   * @returns {Object} Completion estimate with missing count and costs
   */
  getCompletionEstimate(allCards, ownedCardIds) {
    const missing = this.getMissingCards(allCards, ownedCardIds);
    const totalCost = this.calculateResourceCost(missing);
    const total = allCards ? allCards.length : 0;
    const owned = total - missing.length;
    const percentage = total > 0 ? Math.round((owned / total) * 10000) / 100 : 100;
    
    return {
      missingCount: missing.length,
      totalCost,
      percentage
    };
  }
}

module.exports = {
  MissingCardRecommender
};