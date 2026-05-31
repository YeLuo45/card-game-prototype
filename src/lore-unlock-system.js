/**
 * Lore Unlock System
 * V287 - Iteration 8/9 - Card Gallery & Lore System
 * Unlock system for lore content with achievement and collection tracking
 */

class LoreUnlockSystem {
  constructor() {
    this.unlockedLore = new Set();
    this.unlockConditions = {};
    this.hiddenLore = new Set();
    this.progress = {};
  }

  /**
   * Unlock lore for a card
   * @param {string} cardId - Card ID
   * @returns {boolean} true if newly unlocked, false if already unlocked
   */
  unlockLore(cardId) {
    if (this.unlockedLore.has(cardId)) {
      return false;
    }
    this.unlockedLore.add(cardId);
    return true;
  }

  /**
   * Check if lore is unlocked
   * @param {string} cardId - Card ID
   * @returns {boolean} true if unlocked
   */
  isLoreUnlocked(cardId) {
    return this.unlockedLore.has(cardId);
  }

  /**
   * Get array of unlocked lore card IDs
   * @returns {string[]} Array of unlocked card IDs
   */
  getUnlockedLore() {
    return Array.from(this.unlockedLore);
  }

  /**
   * Lock lore for a card
   * @param {string} cardId - Card ID
   * @returns {boolean} true if was unlocked, false otherwise
   */
  lockLore(cardId) {
    if (!this.unlockedLore.has(cardId)) {
      return false;
    }
    this.unlockedLore.delete(cardId);
    return true;
  }

  /**
   * Add an unlock condition for a card
   * @param {string} cardId - Card ID
   * @param {string} condition - Condition identifier
   */
  addUnlockCondition(cardId, condition) {
    if (!this.unlockConditions[cardId]) {
      this.unlockConditions[cardId] = [];
    }
    if (!this.unlockConditions[cardId].includes(condition)) {
      this.unlockConditions[cardId].push(condition);
    }
  }

  /**
   * Get unlock conditions for a card
   * @param {string} cardId - Card ID
   * @returns {string[]} Array of condition identifiers
   */
  getUnlockConditions(cardId) {
    return this.unlockConditions[cardId] || [];
  }

  /**
   * Check if all unlock conditions are met
   * @param {string} cardId - Card ID
   * @param {Object} conditionStatus - Map of condition to boolean status
   * @returns {boolean} true if all conditions met
   */
  checkUnlockConditions(cardId, conditionStatus) {
    const conditions = this.getUnlockConditions(cardId);
    if (conditions.length === 0) {
      return true;
    }
    return conditions.every(cond => conditionStatus[cond] === true);
  }

  /**
   * Get unlock progress for a card
   * @param {string} cardId - Card ID
   * @param {Object} conditionStatus - Map of condition to boolean status
   * @returns {Object} Progress object with total, completed, percentage
   */
  getUnlockProgress(cardId, conditionStatus) {
    const conditions = this.getUnlockConditions(cardId);
    const total = conditions.length;
    const completed = conditions.filter(cond => conditionStatus[cond] === true).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;

    return { total, completed, percentage };
  }

  /**
   * Get total unlock progress across all lore
   * @param {number} totalLoreCount - Total number of lore entries
   * @returns {Object} Progress object with unlocked, total, percentage
   */
  getTotalUnlockProgress(totalLoreCount) {
    const unlocked = this.unlockedLore.size;
    const total = totalLoreCount;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

    return { unlocked, total, percentage };
  }

  /**
   * Reset all unlock data
   */
  reset() {
    this.unlockedLore.clear();
    this.unlockConditions = {};
    this.hiddenLore.clear();
    this.progress = {};
  }

  /**
   * Check if lore is hidden
   * @param {string} cardId - Card ID
   * @returns {boolean} true if hidden
   */
  isLoreHidden(cardId) {
    return this.hiddenLore.has(cardId);
  }

  /**
   * Hide lore content
   * @param {string} cardId - Card ID
   */
  hideLore(cardId) {
    this.hiddenLore.add(cardId);
  }

  /**
   * Reveal hidden lore content
   * @param {string} cardId - Card ID
   */
  revealLore(cardId) {
    this.hiddenLore.delete(cardId);
  }

  /**
   * Bulk unlock multiple lore entries
   * @param {string[]} cardIds - Array of card IDs
   */
  bulkUnlock(cardIds) {
    if (Array.isArray(cardIds)) {
      cardIds.forEach(id => this.unlockLore(id));
    }
  }

  /**
   * Get locked lore card IDs from a list
   * @param {string[]} cardIds - Array of card IDs to check
   * @returns {string[]} Array of locked card IDs
   */
  getLockedLore(cardIds) {
    return cardIds.filter(id => !this.unlockedLore.has(id));
  }
}

module.exports = {
  LoreUnlockSystem
};