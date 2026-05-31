/**
 * Gallery UI
 * V287 - Iteration 8/9 - Card Gallery & Lore System
 * Gallery interface with view switching, filtering, search, and detail popup
 */

class GalleryUI {
  constructor(container) {
    this.container = container || { innerHTML: '' };
    this.currentView = 'grid';
    this.selectedCard = null;
    this.activeFilters = {};
    this.lastSearchQuery = '';
    this.loreUnlockStatus = {};
    this.cards = [];
  }

  /**
   * Render the gallery
   */
  render() {
    const viewClass = this.currentView === 'grid' ? 'gallery-grid' : 'gallery-list';
    this.container.innerHTML = `<div class="gallery ${viewClass}"></div>`;
  }

  /**
   * Set view mode
   * @param {string} mode - 'grid' or 'list'
   */
  setViewMode(mode) {
    this.currentView = (mode === 'grid' || mode === 'list') ? mode : 'grid';
    if (this.container.innerHTML) {
      this.render();
      if (this.cards.length > 0) {
        this.displayCards(this.cards);
      }
    }
  }

  /**
   * Get current view mode
   * @returns {string} Current view mode
   */
  getViewMode() {
    return this.currentView;
  }

  /**
   * Display cards in the gallery
   * @param {Object[]} cards - Array of card objects
   */
  displayCards(cards) {
    this.cards = cards;
    
    if (cards.length === 0) {
      this.container.innerHTML = '<div class="gallery-empty">No cards found</div>';
      return;
    }

    const viewClass = this.currentView === 'grid' ? 'gallery-grid' : 'gallery-list';
    let html = `<div class="gallery ${viewClass}">`;

    cards.forEach(card => {
      const isUnlocked = this.loreUnlockStatus[card.id] !== false;
      const lockClass = isUnlocked ? '' : 'locked';
      const imgHtml = card.imageUrl ? `<img src="${card.imageUrl}" alt="${card.name}">` : '';
      
      html += `
        <div class="gallery-card ${lockClass}" data-card-id="${card.id}">
          ${imgHtml}
          <div class="card-name">${card.name}</div>
          <div class="card-rarity">${card.rarity || 'common'}</div>
        </div>
      `;
    });

    html += '</div>';
    this.container.innerHTML = html;
  }

  /**
   * Show card detail popup
   * @param {Object} card - Card object
   */
  showCardDetail(card) {
    this.selectedCard = card;
  }

  /**
   * Hide card detail popup
   */
  hideCardDetail() {
    this.selectedCard = null;
  }

  /**
   * Apply a filter
   * @param {string} filterType - Filter type (rarity, set, type)
   * @param {string} value - Filter value
   */
  applyFilter(filterType, value) {
    if (value === null || value === undefined || value === '') {
      delete this.activeFilters[filterType];
    } else {
      this.activeFilters[filterType] = value;
    }
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.activeFilters = {};
  }

  /**
   * Perform search
   * @param {string} query - Search query
   */
  search(query) {
    this.lastSearchQuery = query;
    this.applyFilter('search', query);
  }

  /**
   * Update lore unlock status for a card
   * @param {string} cardId - Card ID
   * @param {boolean} isUnlocked - Whether lore is unlocked
   */
  updateLoreUnlockStatus(cardId, isUnlocked) {
    this.loreUnlockStatus[cardId] = isUnlocked;
  }

  /**
   * Render a single card element
   * @param {Object} card - Card object
   * @param {boolean} isUnlocked - Whether lore is unlocked
   * @returns {Object} Card element object with tag and content
   */
  renderCard(card, isUnlocked = true) {
    return {
      tag: 'div',
      className: `gallery-card ${isUnlocked ? '' : 'locked'}`,
      dataset: { cardId: card.id },
      innerHTML: `
        <div class="card-name">${card.name}</div>
        <div class="card-rarity">${card.rarity || 'common'}</div>
      `,
      textContent: card.name
    };
  }

  /**
   * Get currently selected card
   * @returns {Object|null} Selected card or null
   */
  getSelectedCard() {
    return this.selectedCard;
  }

  /**
   * Destroy the gallery UI
   */
  destroy() {
    this.container.innerHTML = '';
    this.selectedCard = null;
    this.cards = [];
    this.activeFilters = {};
    this.loreUnlockStatus = {};
  }
}

module.exports = {
  GalleryUI
};