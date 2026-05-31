/**
 * Card Gallery
 * V287 - Iteration 8/9 - Card Gallery & Lore System
 * Gallery display for all cards with filtering and searching
 */

class CardGallery {
  constructor() {
    this.cards = [];
    this.filters = {};
    this.viewMode = 'grid';
  }

  /**
   * Set the card collection
   * @param {Object[]} cards - Array of card objects
   */
  setCards(cards) {
    this.cards = cards || [];
  }

  /**
   * Get all cards
   * @returns {Object[]} All cards
   */
  getAllCards() {
    return this.cards;
  }

  /**
   * Filter cards by rarity
   * @param {string} rarity - Rarity to filter by
   * @returns {Object[]} Filtered cards
   */
  filterByRarity(rarity) {
    return this.cards.filter(card => card.rarity === rarity);
  }

  /**
   * Filter cards by set
   * @param {string} set - Set to filter by
   * @returns {Object[]} Filtered cards
   */
  filterBySet(set) {
    return this.cards.filter(card => card.set === set);
  }

  /**
   * Filter cards by type
   * @param {string} type - Type to filter by
   * @returns {Object[]} Filtered cards
   */
  filterByType(type) {
    return this.cards.filter(card => card.type === type);
  }

  /**
   * Search cards by name
   * @param {string} query - Search query
   * @returns {Object[]} Matching cards
   */
  searchCards(query) {
    const lowerQuery = query.toLowerCase();
    return this.cards.filter(card =>
      card.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Set the view mode
   * @param {string} mode - 'grid' or 'list'
   */
  setViewMode(mode) {
    this.viewMode = (mode === 'grid' || mode === 'list') ? mode : 'grid';
  }

  /**
   * Get the current view mode
   * @returns {string} Current view mode
   */
  getViewMode() {
    return this.viewMode;
  }

  /**
   * Get filtered cards based on current filters
   * @returns {Object[]} Filtered cards
   */
  getFilteredCards() {
    let result = [...this.cards];

    if (this.filters.rarity) {
      result = result.filter(card => card.rarity === this.filters.rarity);
    }
    if (this.filters.set) {
      result = result.filter(card => card.set === this.filters.set);
    }
    if (this.filters.type) {
      result = result.filter(card => card.type === this.filters.type);
    }
    if (this.filters.search) {
      const lowerQuery = this.filters.search.toLowerCase();
      result = result.filter(card =>
        card.name.toLowerCase().includes(lowerQuery)
      );
    }

    return result;
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.filters = {};
  }

  /**
   * Sort cards by a field
   * @param {string} field - Field to sort by
   * @param {string} order - 'asc' or 'desc'
   */
  sortCards(field, order = 'asc') {
    this.cards.sort((a, b) => {
      let valA = a[field] || '';
      let valB = b[field] || '';

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return order === 'desc' ? 1 : -1;
      if (valA > valB) return order === 'desc' ? -1 : 1;
      return 0;
    });
  }

  /**
   * Get a card by ID
   * @param {string} cardId - Card ID
   * @returns {Object|undefined} Card or undefined
   */
  getCardById(cardId) {
    return this.cards.find(card => card.id === cardId);
  }

  /**
   * Get total card count
   * @returns {number} Card count
   */
  getCardCount() {
    return this.cards.length;
  }

  /**
   * Get rarity distribution
   * @returns {Object} Distribution counts per rarity
   */
  getCardsByRarityDistribution() {
    const distribution = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    };

    this.cards.forEach(card => {
      const rarity = card.rarity || 'common';
      if (distribution.hasOwnProperty(rarity)) {
        distribution[rarity]++;
      }
    });

    return distribution;
  }

  /**
   * Apply a filter
   * @param {string} filterType - Type of filter
   * @param {string} value - Filter value
   */
  applyFilter(filterType, value) {
    if (value === null || value === undefined || value === '') {
      delete this.filters[filterType];
    } else {
      this.filters[filterType] = value;
    }
  }
}

module.exports = {
  CardGallery
};