/**
 * Performance Metrics Collector (Iteration 4/9)
 * Core: PerformanceMetricsCollector
 * 
 * Features:
 * - Collect battle data (damage/healing/blocking/energy)
 * - Calculate efficiency metrics (DPS/HPS/energy efficiency)
 * - Battle performance trend analysis
 */

class PerformanceMetricsCollector {
  constructor(options = {}) {
    this.maxBattles = options.maxBattles || 100;
    
    // Aggregate metrics
    this.totalDamage = 0;
    this.totalHealing = 0;
    this.totalBlocking = 0;
    this.totalEnergyUsed = 0;
    this.wastedEnergy = 0;
    this.battlesCount = 0;
    this.victories = 0;
    
    // Tracking structures
    this.damageByCard = {};
    this.energyByCard = {};
    this.healingHistory = [];
    this.blockingHistory = [];
    this.blocksByTurn = {};
    
    // Critical hits tracking
    this.criticalHits = 0;
    this.criticalDamage = 0;
    
    // Battle state
    this.currentBattleId = null;
    this.currentBattleMetrics = {
      damage: 0,
      healing: 0,
      blocking: 0,
      energyUsed: 0,
      cardsPlayed: 0,
      turns: 0
    };
    
    // History
    this.battleHistory = [];
    this.version = 'V255-Iter4';
  }

  /**
   * Record damage dealt
   * @param {number} amount - Damage amount
   * @param {string} cardId - Card that dealt damage
   * @param {object} options - Additional options (critical, turn)
   */
  recordDamage(amount, cardId = 'unknown', options = {}) {
    if (amount <= 0) return;

    this.totalDamage += amount;
    
    if (cardId && cardId !== 'unknown') {
      this.damageByCard[cardId] = (this.damageByCard[cardId] || 0) + amount;
    }

    if (this.currentBattleMetrics) {
      this.currentBattleMetrics.damage += amount;
    }

    if (options.critical) {
      this.criticalHits++;
      this.criticalDamage += amount;
    }
  }

  /**
   * Record healing done
   * @param {number} amount - Healing amount
   * @param {object} options - Additional options
   */
  recordHealing(amount, options = {}) {
    if (amount <= 0) return;

    this.totalHealing += amount;
    this.healingHistory.push({
      amount,
      timestamp: Date.now(),
      battleId: this.currentBattleId
    });

    if (this.currentBattleMetrics) {
      this.currentBattleMetrics.healing += amount;
    }
  }

  /**
   * Record blocking
   * @param {number} amount - Blocked damage amount
   * @param {object} options - Additional options (turn)
   */
  recordBlocking(amount, options = {}) {
    if (amount <= 0) return;

    this.totalBlocking += amount;
    this.blockingHistory.push({
      amount,
      turn: options.turn || 0,
      timestamp: Date.now(),
      battleId: this.currentBattleId
    });

    if (options.turn) {
      this.blocksByTurn[options.turn] = (this.blocksByTurn[options.turn] || 0) + amount;
    }

    if (this.currentBattleMetrics) {
      this.currentBattleMetrics.blocking += amount;
    }
  }

  /**
   * Record energy usage
   * @param {number} amount - Energy spent
   * @param {string} cardId - Card that used energy
   */
  recordEnergyUsage(amount, cardId = 'unknown') {
    if (amount <= 0) return;

    this.totalEnergyUsed += amount;

    if (cardId && cardId !== 'unknown') {
      this.energyByCard[cardId] = (this.energyByCard[cardId] || 0) + amount;
    }

    if (this.currentBattleMetrics) {
      this.currentBattleMetrics.energyUsed += amount;
    }
  }

  /**
   * Record wasted energy (not spent on any action)
   * @param {number} amount - Wasted energy amount
   */
  recordEnergyWasted(amount) {
    if (amount <= 0) return;
    this.wastedEnergy += amount;
  }

  /**
   * Start tracking a new battle
   * @param {string} battleId - Battle identifier
   */
  startBattle(battleId) {
    this.currentBattleId = battleId;
    this.battlesCount++;
    
    this.currentBattleMetrics = {
      damage: 0,
      healing: 0,
      blocking: 0,
      energyUsed: 0,
      cardsPlayed: 0,
      turns: 0
    };
  }

  /**
   * End battle and calculate final metrics
   * @param {object} result - Battle result (victory, turns, duration)
   * @returns {object} Battle metrics summary
   */
  endBattle(result = {}) {
    if (!this.currentBattleId) {
      return null;
    }

    const duration = result.duration || 0;
    const turns = result.turns || this.currentBattleMetrics.turns || 0;
    const damage = this.currentBattleMetrics.damage;
    const energyUsed = this.currentBattleMetrics.energyUsed || 1;

    const battleResult = {
      battleId: this.currentBattleId,
      victory: result.victory || false,
      turns,
      duration,
      damage,
      healing: this.currentBattleMetrics.healing,
      blocking: this.currentBattleMetrics.blocking,
      energyUsed,
      cardsPlayed: this.currentBattleMetrics.cardsPlayed,
      dps: duration > 0 ? Math.round((damage / duration) * 1000) : 0,
      hps: duration > 0 ? Math.round((this.currentBattleMetrics.healing / duration) * 1000) : 0,
      energyEfficiency: energyUsed > 0 ? Math.round((damage / energyUsed) * 10) / 10 : 0,
      blockEfficiency: this.currentBattleMetrics.healing > 0 
        ? Math.round((this.currentBattleMetrics.blocking / this.currentBattleMetrics.healing) * 10) / 10 
        : 0
    };

    this.battleHistory.push(battleResult);

    if (battleResult.victory) {
      this.victories++;
    }

    // Enforce max battles limit
    if (this.battleHistory.length > this.maxBattles) {
      this.battleHistory.shift();
    }

    this.currentBattleId = null;
    this.currentBattleMetrics = null;

    return battleResult;
  }

  /**
   * Increment cards played counter
   * @param {string} cardId - Card played
   */
  recordCardPlayed(cardId) {
    if (this.currentBattleMetrics) {
      this.currentBattleMetrics.cardsPlayed++;
    }
  }

  /**
   * Increment turn counter
   */
  recordTurn() {
    if (this.currentBattleMetrics) {
      this.currentBattleMetrics.turns++;
    }
  }

  /**
   * Calculate overall efficiency metrics
   * @returns {object} Efficiency metrics
   */
  calculateEfficiency() {
    const energyUsed = this.totalEnergyUsed || 1;
    
    return {
      damagePerEnergy: Math.round((this.totalDamage / energyUsed) * 10) / 10,
      healingPerEnergy: Math.round((this.totalHealing / energyUsed) * 10) / 10,
      blockPerEnergy: Math.round((this.totalBlocking / energyUsed) * 10) / 10,
      averageDamagePerBattle: this.battlesCount > 0 
        ? Math.round((this.totalDamage / this.battlesCount) * 10) / 10 
        : 0,
      averageHealingPerBattle: this.battlesCount > 0 
        ? Math.round((this.totalHealing / this.battlesCount) * 10) / 10 
        : 0,
      winRate: this.battlesCount > 0 
        ? Math.round((this.victories / this.battlesCount) * 100) 
        : 0,
      criticalHitRate: this.totalDamage > 0 
        ? Math.round((this.criticalDamage / this.totalDamage) * 100) 
        : 0
    };
  }

  /**
   * Get performance trends over battle history
   * @returns {object} Trend analysis
   */
  getPerformanceTrends() {
    if (this.battleHistory.length === 0) {
      return {
        battleCount: 0,
        averageDamage: 0,
        averageEnergy: 0,
        trend: 'insufficient_data'
      };
    }

    const recentBattles = this.battleHistory.slice(-10);
    const totalDamage = recentBattles.reduce((sum, b) => sum + b.damage, 0);
    const totalEnergy = recentBattles.reduce((sum, b) => sum + b.energyUsed, 0);
    const totalVictories = recentBattles.filter(b => b.victory).length;

    // Calculate trend direction
    let trend = 'stable';
    if (recentBattles.length >= 3) {
      const firstHalf = recentBattles.slice(0, Math.floor(recentBattles.length / 2));
      const secondHalf = recentBattles.slice(Math.floor(recentBattles.length / 2));
      
      const firstAvg = firstHalf.reduce((s, b) => s + b.damage, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, b) => s + b.damage, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.1) trend = 'improving';
      else if (secondAvg < firstAvg * 0.9) trend = 'declining';
    }

    return {
      battleCount: this.battleHistory.length,
      recentBattleCount: recentBattles.length,
      averageDamage: Math.round((totalDamage / recentBattles.length) * 10) / 10,
      averageEnergy: Math.round((totalEnergy / recentBattles.length) * 10) / 10,
      winRate: Math.round((totalVictories / recentBattles.length) * 100),
      trend
    };
  }

  /**
   * Get performance for specific card
   * @param {string} cardId - Card identifier
   * @returns {object} Card performance metrics
   */
  getCardPerformance(cardId) {
    const damage = this.damageByCard[cardId] || 0;
    const energyCost = this.energyByCard[cardId] || 0;

    return {
      damage,
      energyCost,
      damagePerEnergy: energyCost > 0 ? Math.round((damage / energyCost) * 10) / 10 : 0,
      usageCount: this.battleHistory.filter(b => 
        b.battleId && this.damageByCard[cardId] > 0
      ).length
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.totalDamage = 0;
    this.totalHealing = 0;
    this.totalBlocking = 0;
    this.totalEnergyUsed = 0;
    this.wastedEnergy = 0;
    this.battlesCount = 0;
    this.victories = 0;
    this.damageByCard = {};
    this.energyByCard = {};
    this.healingHistory = [];
    this.blockingHistory = [];
    this.blocksByTurn = {};
    this.criticalHits = 0;
    this.criticalDamage = 0;
    this.currentBattleId = null;
    this.currentBattleMetrics = null;
    this.battleHistory = [];
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PerformanceMetricsCollector };
} else if (typeof window !== 'undefined') {
  window.PerformanceMetricsCollector = PerformanceMetricsCollector;
}