/**
 * Efficiency Analyzer (Iteration 4/9)
 * Core: EfficiencyAnalyzer
 * 
 * Features:
 * - Analyze energy usage efficiency
 * - Identify resource waste (empty energy/unused abilities)
 * - Compare to historical best performance
 */

class EfficiencyAnalyzer {
  constructor(options = {}) {
    this.wasteThreshold = options.wasteThreshold || 0.2; // 20% waste threshold
    this.historySize = options.historySize || 50;
    this.history = [];
    this.bestPerformance = null;
    this.version = 'V255-Iter4';
  }

  /**
   * Analyze energy waste for a battle
   * @param {number} energyUsed - Energy actually used
   * @param {number} energyAvailable - Total energy available
   * @returns {object} Waste analysis result
   */
  analyzeEnergyWaste(energyUsed, energyAvailable) {
    if (energyAvailable <= 0) {
      return {
        wasted: 0,
        utilization: 0,
        overWasteThreshold: false
      };
    }

    const wasted = Math.max(0, energyAvailable - energyUsed);
    const utilization = energyUsed / energyAvailable;

    return {
      wasted,
      utilization: Math.round(utilization * 100) / 100,
      energyUsed,
      energyAvailable,
      overWasteThreshold: wasted / energyAvailable > this.wasteThreshold
    };
  }

  /**
   * Analyze unused abilities from battle log
   * @param {object} battleLog - Battle replay/log object
   * @param {Array} availableAbilities - List of available ability IDs
   * @returns {object} Unused abilities analysis
   */
  analyzeUnusedAbilities(battleLog, availableAbilities) {
    const usedAbilities = new Set();
    
    if (battleLog && battleLog.events) {
      for (const event of battleLog.events) {
        if (event.type === 'card_played' && event.cardId) {
          usedAbilities.add(event.cardId);
        }
      }
    }

    const unused = availableAbilities.filter(ability => !usedAbilities.has(ability));

    return {
      unused,
      used: Array.from(usedAbilities),
      unusedCount: unused.length,
      totalAvailable: availableAbilities.length,
      utilizationRate: availableAbilities.length > 0 
        ? Math.round(((availableAbilities.length - unused.length) / availableAbilities.length) * 100) 
        : 0
    };
  }

  /**
   * Add battle result to history
   * @param {object} battleResult - Battle metrics
   */
  addToHistory(battleResult) {
    const entry = {
      ...battleResult,
      timestamp: Date.now(),
      efficiencyScore: battleResult.energy > 0 
        ? battleResult.damage / battleResult.energy 
        : 0
    };

    this.history.push(entry);

    // Update best performance
    if (!this.bestPerformance || entry.efficiencyScore > this.bestPerformance.efficiencyScore) {
      this.bestPerformance = { ...entry };
    }

    // Enforce history size limit
    if (this.history.length > this.historySize) {
      this.history.shift();
    }
  }

  /**
   * Compare current performance to historical average
   * @param {object} currentStats - Current battle stats (damage, energy, etc.)
   * @returns {object} Comparison result
   */
  compareToHistory(currentStats) {
    if (this.history.length < 2) {
      return {
        performanceLevel: 'insufficient_data',
        damageDelta: 0,
        energyDelta: 0,
        efficiencyDelta: 0
      };
    }

    const avgDamage = this.history.reduce((sum, h) => sum + (h.damage || 0), 0) / this.history.length;
    const avgEnergy = this.history.reduce((sum, h) => sum + (h.energy || 0), 0) / this.history.length;
    const avgEfficiency = this.history.reduce((sum, h) => sum + (h.efficiencyScore || 0), 0) / this.history.length;

    const currentEfficiency = currentStats.energy > 0 
      ? currentStats.damage / currentStats.energy 
      : 0;

    const damageDelta = (currentStats.damage || 0) - avgDamage;
    const energyDelta = (currentStats.energy || 0) - avgEnergy;
    const efficiencyDelta = currentEfficiency - avgEfficiency;

    let performanceLevel = 'average';
    if (damageDelta > avgDamage * 0.2) performanceLevel = 'above_average';
    else if (damageDelta < -avgDamage * 0.2) performanceLevel = 'below_average';

    return {
      performanceLevel,
      damageDelta: Math.round(damageDelta * 10) / 10,
      energyDelta: Math.round(energyDelta * 10) / 10,
      efficiencyDelta: Math.round(efficiencyDelta * 10) / 10,
      averageDamage: Math.round(avgDamage * 10) / 10,
      averageEnergy: Math.round(avgEnergy * 10) / 10
    };
  }

  /**
   * Identify inefficiencies in card usage
   * @param {object} cardPerformance - Map of card ID to performance metrics
   * @returns {object} Inefficiency analysis
   */
  identifyInefficiencies(cardPerformance) {
    const inefficientCards = [];
    const recommendations = [];

    for (const [cardId, stats] of Object.entries(cardPerformance)) {
      // Skip blocking cards (they don't deal damage)
      if (stats.blocking && stats.blocking > 0) continue;
      
      // Skip cards with 0 damage (healing, etc.)
      if (!stats.damage || stats.damage === 0) continue;

      const efficiency = stats.energyCost > 0 ? stats.damage / stats.energyCost : 0;

      // Cards with efficiency below 3 damage per energy are inefficient
      if (efficiency < 3) {
        inefficientCards.push(cardId);
        recommendations.push({
          cardId,
          issue: 'Low damage per energy ratio',
          currentEfficiency: Math.round(efficiency * 10) / 10,
          suggestedImprovement: 'Consider replacing with higher efficiency alternatives'
        });
      }
    }

    return {
      inefficientCards,
      recommendations,
      efficiencyThreshold: 3
    };
  }

  /**
   * Calculate efficiency score
   * @param {number} damage - Damage dealt
   * @param {number} energy - Energy spent
   * @returns {number} Efficiency score
   */
  calculateEfficiencyScore(damage, energy) {
    if (energy <= 0) return 0;
    return Math.round((damage / energy) * 10) / 10;
  }

  /**
   * Get best historical performance
   * @returns {object} Best performance record
   */
  getBestPerformance() {
    return this.bestPerformance 
      ? { ...this.bestPerformance }
      : null;
  }

  /**
   * Get average performance from history
   * @returns {object} Average stats
   */
  getAveragePerformance() {
    if (this.history.length === 0) {
      return null;
    }

    const totalDamage = this.history.reduce((sum, h) => sum + (h.damage || 0), 0);
    const totalEnergy = this.history.reduce((sum, h) => sum + (h.energy || 0), 0);
    const totalVictories = this.history.filter(h => h.victory).length;

    return {
      averageDamage: Math.round((totalDamage / this.history.length) * 10) / 10,
      averageEnergy: Math.round((totalEnergy / this.history.length) * 10) / 10,
      averageEfficiency: totalEnergy > 0 
        ? Math.round((totalDamage / totalEnergy) * 10) / 10 
        : 0,
      winRate: Math.round((totalVictories / this.history.length) * 100),
      battleCount: this.history.length
    };
  }

  /**
   * Reset analyzer state
   */
  reset() {
    this.history = [];
    this.bestPerformance = null;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EfficiencyAnalyzer };
} else if (typeof window !== 'undefined') {
  window.EfficiencyAnalyzer = EfficiencyAnalyzer;
}