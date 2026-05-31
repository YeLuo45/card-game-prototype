/**
 * Card Lore Database
 * V287 - Iteration 8/9 - Card Gallery & Lore System
 * Stores card background stories, character relationships, and world setting index
 */

class CardLoreDatabase {
  constructor() {
    this.loreData = {};
    this.characterRelationships = {};
    this.worldSettings = {};
  }

  /**
   * Add a lore entry for a card
   * @param {Object} loreEntry - Lore entry with cardId, title, content, category
   * @returns {boolean} true if added, false if duplicate
   */
  addLoreEntry(loreEntry) {
    const { cardId } = loreEntry;
    if (this.loreData[cardId]) {
      return false;
    }
    this.loreData[cardId] = {
      cardId,
      title: loreEntry.title || '',
      content: loreEntry.content || '',
      category: loreEntry.category || 'background',
      metadata: loreEntry.metadata || {}
    };
    return true;
  }

  /**
   * Get lore entry for a specific card
   * @param {string} cardId - The card ID
   * @returns {Object|undefined} Lore entry or undefined
   */
  getLoreEntry(cardId) {
    return this.loreData[cardId];
  }

  /**
   * Get all lore entries filtered by category
   * @param {string} category - Category to filter by
   * @returns {Object[]} Array of lore entries
   */
  getLoreByCategory(category) {
    return Object.values(this.loreData).filter(
      entry => entry.category === category
    );
  }

  /**
   * Add a character relationship
   * @param {string} sourceChar - Source character ID
   * @param {string} targetChar - Target character ID
   * @param {string} relationshipType - Type of relationship (ally, enemy, etc.)
   * @param {boolean} bidirectional - Whether relationship is bidirectional
   */
  addCharacterRelationship(sourceChar, targetChar, relationshipType, bidirectional = false) {
    if (!this.characterRelationships[sourceChar]) {
      this.characterRelationships[sourceChar] = [];
    }
    this.characterRelationships[sourceChar].push({
      target: targetChar,
      type: relationshipType
    });

    if (bidirectional) {
      if (!this.characterRelationships[targetChar]) {
        this.characterRelationships[targetChar] = [];
      }
      this.characterRelationships[targetChar].push({
        target: sourceChar,
        type: relationshipType
      });
    }
  }

  /**
   * Get all relationships for a character
   * @param {string} characterId - Character ID
   * @returns {Object[]} Array of relationship objects
   */
  getCharacterRelationships(characterId) {
    return this.characterRelationships[characterId] || [];
  }

  /**
   * Add a world setting entry
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   * @param {string} description - Setting description
   */
  addWorldSetting(key, value, description = '') {
    this.worldSettings[key] = {
      key,
      value,
      description
    };
  }

  /**
   * Get a world setting by key
   * @param {string} key - Setting key
   * @returns {Object|undefined} World setting or undefined
   */
  getWorldSetting(key) {
    return this.worldSettings[key];
  }

  /**
   * Get all lore entries
   * @returns {Object[]} Array of all lore entries
   */
  getAllLore() {
    return Object.values(this.loreData);
  }

  /**
   * Check if a card has lore
   * @param {string} cardId - Card ID
   * @returns {boolean} true if lore exists
   */
  hasLore(cardId) {
    return !!this.loreData[cardId];
  }

  /**
   * Search lore entries by keyword
   * @param {string} keyword - Search keyword
   * @returns {Object[]} Matching lore entries
   */
  searchLore(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    return Object.values(this.loreData).filter(entry => {
      return (
        entry.title.toLowerCase().includes(lowerKeyword) ||
        entry.content.toLowerCase().includes(lowerKeyword)
      );
    });
  }

  /**
   * Clear all lore data
   */
  clear() {
    this.loreData = {};
    this.characterRelationships = {};
    this.worldSettings = {};
  }
}

module.exports = {
  CardLoreDatabase
};