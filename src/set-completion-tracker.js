/**
 * Set Completion Tracker
 * V261 - Iteration 6/9 - Card Set Collection Tracker
 * Tracks completion status for card sets with rewards and visualization
 */

class SetCompletionTracker {
  constructor() {
    this.sets = new Map();
    this.ownedCards = new Set();
  }

  /**
   * Add a card set to track
   * @param {string} setId - Unique set identifier
   * @param {Object} setData - Set configuration { name, cards, rewards }
   */
  addSet(setId, setData) {
    if (this.sets.has(setId)) {
      throw new Error(`Set "${setId}" already exists`);
    }
    
    this.sets.set(setId, {
      id: setId,
      name: setData.name || setId,
      cards: setData.cards || [],
      rewards: setData.rewards || { complete: { dust: 0, gold: 0 } }
    });
  }

  /**
   * Get completion status for a specific set
   * @param {string} setId - Set identifier
   * @returns {Object} Completion object { owned, total, percentage }
   */
  getSetCompletion(setId) {
    if (!this.sets.has(setId)) {
      throw new Error(`Set "${setId}" not found`);
    }
    
    const set = this.sets.get(setId);
    const total = set.cards.length;
    const owned = set.cards.filter(card => this.ownedCards.has(card.id)).length;
    const percentage = total > 0 ? Math.round((owned / total) * 10000) / 100 : 0;
    
    return {
      owned,
      total,
      percentage
    };
  }

  /**
   * Mark a card as owned
   * @param {string} cardId - Card identifier
   */
  addOwnedCard(cardId) {
    this.ownedCards.add(cardId);
  }

  /**
   * Remove a card from owned collection
   * @param {string} cardId - Card identifier
   * @returns {boolean} true if card was owned
   */
  removeOwnedCard(cardId) {
    if (!this.ownedCards.has(cardId)) {
      return false;
    }
    this.ownedCards.delete(cardId);
    return true;
  }

  /**
   * Check if a card is owned
   * @param {string} cardId - Card identifier
   * @returns {boolean} true if card is owned
   */
  isCardOwned(cardId) {
    return this.ownedCards.has(cardId);
  }

  /**
   * Get rewards for a set based on completion
   * @param {string} setId - Set identifier
   * @returns {Object} Rewards object { dust, gold }
   */
  getSetRewards(setId) {
    if (!this.sets.has(setId)) {
      throw new Error(`Set "${setId}" not found`);
    }
    
    const completion = this.getSetCompletion(setId);
    const set = this.sets.get(setId);
    
    if (completion.percentage < 100) {
      return { dust: 0, gold: 0 };
    }
    
    return set.rewards.complete || { dust: 0, gold: 0 };
  }

  /**
   * Get completion status for all sets
   * @returns {Object} Object with set completions and overall
   */
  getAllSetCompletions() {
    const results = {};
    let totalCards = 0;
    let totalOwned = 0;
    
    this.sets.forEach((set, setId) => {
      const completion = this.getSetCompletion(setId);
      results[setId] = completion;
      totalCards += completion.total;
      totalOwned += completion.owned;
    });
    
    results.overall = {
      owned: totalOwned,
      total: totalCards,
      percentage: totalCards > 0 ? Math.round((totalOwned / totalCards) * 10000) / 100 : 0
    };
    
    return results;
  }

  /**
   * Get progress visualization data
   * @returns {Object} Visualization data with bar charts
   */
  getProgressVisualization() {
    const sets = [];
    
    this.sets.forEach((set, setId) => {
      const completion = this.getSetCompletion(setId);
      const totalBars = 10;
      const filledBars = Math.round((completion.percentage / 100) * totalBars);
      const emptyBars = totalBars - filledBars;
      
      sets.push({
        name: set.name || setId,
        id: setId,
        percentage: completion.percentage,
        owned: completion.owned,
        total: completion.total,
        filledBars,
        emptyBars
      });
    });
    
    return { sets };
  }

  /**
   * Reset all owned cards (keep set definitions)
   */
  reset() {
    this.ownedCards.clear();
  }

  /**
   * Clear all sets and owned cards
   */
  clearAll() {
    this.sets.clear();
    this.ownedCards.clear();
  }

  /**
   * Get all defined set IDs
   * @returns {string[]} Array of set IDs
   */
  getSetIds() {
    return Array.from(this.sets.keys());
  }

  /**
   * Get set information
   * @param {string} setId - Set identifier
   * @returns {Object} Set data object
   */
  getSetData(setId) {
    if (!this.sets.has(setId)) {
      throw new Error(`Set "${setId}" not found`);
    }
    return this.sets.get(setId);
  }
}

module.exports = {
  SetCompletionTracker
};