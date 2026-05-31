/**
 * Collection Registry
 * V261 - Iteration 6/9 - Card Set Collection Tracker
 * Tracks player card collection, progress, and rarity distribution
 */

class CollectionRegistry {
  constructor() {
    this.ownedCards = new Set();
    this.allCards = [];
  }

  /**
   * Add a card to the collection
   * @param {string} cardId - The card ID to add
   * @returns {boolean} true if card was newly added, false if already owned
   */
  addCard(cardId) {
    if (this.ownedCards.has(cardId)) {
      return false;
    }
    this.ownedCards.add(cardId);
    return true;
  }

  /**
   * Remove a card from the collection
   * @param {string} cardId - The card ID to remove
   * @returns {boolean} true if card was owned and removed, false otherwise
   */
  removeCard(cardId) {
    if (!this.ownedCards.has(cardId)) {
      return false;
    }
    this.ownedCards.delete(cardId);
    return true;
  }

  /**
   * Check if player owns a specific card
   * @param {string} cardId - The card ID to check
   * @returns {boolean} true if card is owned
   */
  hasCard(cardId) {
    return this.ownedCards.has(cardId);
  }

  /**
   * Get array of all owned card IDs
   * @returns {string[]} Array of owned card IDs
   */
  getOwnedCardIds() {
    return Array.from(this.ownedCards);
  }

  /**
   * Get collection progress statistics
   * @param {Array} allCards - Complete list of all cards in the game
   * @returns {Object} Progress object with owned, total, and percentage
   */
  getCollectionProgress(allCards = this.allCards) {
    const total = allCards.length;
    const owned = allCards.filter(card => this.ownedCards.has(card.id)).length;
    const percentage = total > 0 ? Math.round((owned / total) * 10000) / 100 : 0;
    
    return {
      owned,
      total,
      percentage
    };
  }

  /**
   * Get rarity distribution of owned cards
   * @param {Array} allCards - Complete list of all cards in the game
   * @returns {Object} Distribution counts per rarity
   */
  getRarityDistribution(allCards = this.allCards) {
    const distribution = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    };

    allCards.forEach(card => {
      if (this.ownedCards.has(card.id)) {
        const rarity = card.rarity || 'common';
        if (distribution.hasOwnProperty(rarity)) {
          distribution[rarity]++;
        } else {
          distribution[rarity] = (distribution[rarity] || 0) + 1;
        }
      }
    });

    return distribution;
  }

  /**
   * Set the complete card pool for reference
   * @param {Array} cards - Array of all cards in the game
   */
  setAllCards(cards) {
    this.allCards = cards || [];
  }

  /**
   * Reset the collection (clear all owned cards)
   */
  reset() {
    this.ownedCards.clear();
  }

  /**
   * Get the count of owned cards
   * @returns {number} Number of owned cards
   */
  getOwnedCount() {
    return this.ownedCards.size;
  }

  /**
   * Import collection from array of card IDs
   * @param {string[]} cardIds - Array of card IDs to import
   */
  importCollection(cardIds) {
    if (Array.isArray(cardIds)) {
      cardIds.forEach(id => this.addCard(id));
    }
  }

  /**
   * Export collection as array of card IDs
   * @returns {string[]} Array of owned card IDs
   */
  exportCollection() {
    return this.getOwnedCardIds();
  }
}

module.exports = {
  CollectionRegistry
};