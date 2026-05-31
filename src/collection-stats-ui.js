/**
 * Collection Stats UI
 * V261 - Iteration 6/9 - Card Set Collection Tracker
 * Renders collection statistics panel with progress and recommendations
 */

class CollectionStatsUI {
  /**
   * @param {Object} registry - CollectionRegistry instance
   * @param {Object} recommender - MissingCardRecommender instance
   * @param {Object} tracker - SetCompletionTracker instance
   */
  constructor(registry, recommender, tracker) {
    this.registry = registry;
    this.recommender = recommender;
    this.tracker = tracker;
    this.allCards = [];
  }

  /**
   * Set the complete card pool
   * @param {Array} cards - Array of all card objects
   */
  setAllCards(cards) {
    this.allCards = cards || [];
  }

  /**
   * Render the main stats panel
   * @returns {Object} Panel element with progress and stats
   */
  renderStatsPanel() {
    const progress = this.registry.getCollectionProgress(this.allCards);
    const rarity = this.registry.getRarityDistribution(this.allCards);
    
    return {
      element: 'div',
      className: 'collection-stats-panel',
      progress,
      stats: { rarity },
      innerHTML: this.buildStatsHTML(progress, rarity)
    };
  }

  /**
   * Build HTML string for stats panel
   * @param {Object} progress - Progress data
   * @param {Object} rarity - Rarity distribution
   * @returns {string} HTML string
   */
  buildStatsHTML(progress, rarity) {
    return `
      <div class="collection-progress">
        <h3>Collection Progress</h3>
        <div class="progress-info">${progress.owned}/${progress.total} (${progress.percentage}%)</div>
        ${this.renderProgressBar(progress.percentage).innerHTML}
      </div>
    `;
  }

  /**
   * Render a progress bar
   * @param {number} percentage - Progress percentage 0-100
   * @returns {Object} Progress bar element
   */
  renderProgressBar(percentage) {
    const cappedPercentage = Math.min(100, Math.max(0, percentage));
    const filledBlocks = Math.floor(cappedPercentage / 10);
    const emptyBlocks = 10 - filledBlocks;
    
    const filledBar = '█'.repeat(filledBlocks);
    const emptyBar = '░'.repeat(emptyBlocks);
    
    return {
      element: 'div',
      className: 'progress-bar',
      percentage: cappedPercentage,
      innerHTML: `<span class="filled">${filledBar}</span><span class="empty">${emptyBar}</span> ${cappedPercentage}%`
    };
  }

  /**
   * Render rarity breakdown display
   * @returns {Object} Rarity breakdown element
   */
  renderRarityBreakdown() {
    const rarity = this.registry.getRarityDistribution(this.allCards);
    
    return {
      element: 'div',
      className: 'rarity-breakdown',
      data: rarity,
      innerHTML: `
        <div class="rarity-item common">Common: ${rarity.common || 0}</div>
        <div class="rarity-item rare">Rare: ${rarity.rare || 0}</div>
        <div class="rarity-item epic">Epic: ${rarity.epic || 0}</div>
        <div class="rarity-item legendary">Legendary: ${rarity.legendary || 0}</div>
      `
    };
  }

  /**
   * Render recommendations list
   * @returns {Object} Recommendations list element
   */
  renderRecommendationsList() {
    const ownedIds = this.registry.getOwnedCardIds();
    const recommendations = this.recommender.getRecommendations(this.allCards, ownedIds, { limit: 5 });
    
    const itemsHTML = recommendations.map(rec => `
      <li class="recommendation-item" data-priority="${rec.priority}">
        <span class="card-name">${rec.card.name}</span>
        <span class="card-rarity">${rec.card.rarity}</span>
        <span class="priority">P:${rec.priority}</span>
      </li>
    `).join('');
    
    return {
      element: 'ul',
      className: 'recommendations-list',
      items: recommendations,
      innerHTML: itemsHTML || '<li class="no-recommendations">All cards owned!</li>'
    };
  }

  /**
   * Render set progress visualization
   * @returns {Object} Set progress element
   */
  renderSetProgress() {
    const completions = this.tracker.getAllSetCompletions();
    const viz = this.tracker.getProgressVisualization();
    
    const setsHTML = viz.sets.map(set => `
      <div class="set-progress-item" data-set="${set.id}">
        <div class="set-name">${set.name}</div>
        <div class="set-bars">${'█'.repeat(set.filledBars)}${'░'.repeat(set.emptyBars)}</div>
        <div class="set-percentage">${set.percentage}%</div>
      </div>
    `).join('');
    
    return {
      element: 'div',
      className: 'set-progress',
      data: completions,
      innerHTML: `
        <h4>Set Progress</h4>
        ${setsHTML}
        <div class="overall-progress">Overall: ${completions.overall.percentage}%</div>
      `
    };
  }

  /**
   * Render completion estimate
   * @returns {Object} Completion estimate element
   */
  renderCompletionEstimate() {
    const ownedIds = this.registry.getOwnedCardIds();
    const estimate = this.recommender.getCompletionEstimate(this.allCards, ownedIds);
    
    return {
      element: 'div',
      className: 'completion-estimate',
      data: estimate,
      innerHTML: `
        <div class="estimate-title">Completion Estimate</div>
        <div class="missing-count">Missing: ${estimate.missingCount} cards</div>
        <div class="total-cost">
          <span class="dust">Dust: ${estimate.totalCost.dust}</span>
          <span class="gold">Gold: ${estimate.totalCost.gold}</span>
        </div>
        <div class="current-progress">Current: ${estimate.percentage}%</div>
      `
    };
  }

  /**
   * Get full collection report
   * @returns {Object} Comprehensive report object
   */
  getFullCollectionReport() {
    const progress = this.registry.getCollectionProgress(this.allCards);
    const rarity = this.registry.getRarityDistribution(this.allCards);
    const sets = this.tracker.getAllSetCompletions();
    const ownedIds = this.registry.getOwnedCardIds();
    const recommendations = this.recommender.getRecommendations(this.allCards, ownedIds, { limit: 10 });
    const estimate = this.recommender.getCompletionEstimate(this.allCards, ownedIds);
    
    return {
      timestamp: new Date().toISOString(),
      progress,
      rarity,
      sets,
      recommendations,
      estimate
    };
  }

  /**
   * Update display with current data
   * @returns {Object} Updated display data
   */
  updateDisplay() {
    return {
      progress: this.renderStatsPanel(),
      rarity: this.renderRarityBreakdown(),
      recommendations: this.renderRecommendationsList(),
      sets: this.renderSetProgress(),
      estimate: this.renderCompletionEstimate()
    };
  }

  /**
   * Export report as JSON string
   * @returns {string} JSON report
   */
  exportReportAsJSON() {
    return JSON.stringify(this.getFullCollectionReport(), null, 2);
  }
}

module.exports = {
  CollectionStatsUI
};