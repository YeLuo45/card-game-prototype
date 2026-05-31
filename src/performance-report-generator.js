/**
 * Performance Report Generator (Iteration 4/9)
 * Core: PerformanceReportGenerator
 * 
 * Features:
 * - Generate periodic performance reports
 * - Visualization of key metrics
 * - Milestone achievement tracking
 */

class PerformanceReportGenerator {
  constructor(options = {}) {
    this.reportInterval = options.reportInterval || 5; // battles between reports
    this.milestones = {};
    this.battleCount = 0;
    this.lastReportBattleCount = 0;
    this.version = 'V255-Iter4';
    
    // Milestone definitions
    this.milestoneDefinitions = {
      firstVictory: { type: 'boolean', name: 'First Victory', condition: (s) => s.victories >= 1 },
      damage100: { type: 'count', name: '100 Total Damage', condition: (s) => s.totalDamage >= 100 },
      damage1000: { type: 'count', name: '1000 Total Damage', condition: (s) => s.totalDamage >= 1000 },
      damage5000: { type: 'count', name: '5000 Total Damage', condition: (s) => s.totalDamage >= 5000 },
      winStreak3: { type: 'count', name: '3 Win Streak', condition: (s) => s.currentWinStreak >= 3 },
      winStreak5: { type: 'count', name: '5 Win Streak', condition: (s) => s.currentWinStreak >= 5 },
      winStreak10: { type: 'count', name: '10 Win Streak', condition: (s) => s.currentWinStreak >= 10 },
      winRate50: { type: 'percentage', name: '50% Win Rate', condition: (s) => s.battlesCount >= 10 && s.winRate >= 50 },
      winRate75: { type: 'percentage', name: '75% Win Rate', condition: (s) => s.battlesCount >= 20 && s.winRate >= 75 },
      battles10: { type: 'count', name: '10 Battles', condition: (s) => s.battlesCount >= 10 },
      battles50: { type: 'count', name: '50 Battles', condition: (s) => s.battlesCount >= 50 },
      battles100: { type: 'count', name: '100 Battles', condition: (s) => s.battlesCount >= 100 },
      efficiency5: { type: 'value', name: '5 Damage/Energy', condition: (s) => s.damagePerEnergy >= 5 },
      efficiency10: { type: 'value', name: '10 Damage/Energy', condition: (s) => s.damagePerEnergy >= 10 }
    };
  }

  /**
   * Generate a comprehensive performance report
   * @param {object} metrics - Performance metrics from collector
   * @param {object} efficiency - Efficiency analysis
   * @returns {object} Complete report
   */
  generateReport(metrics, efficiency = {}) {
    this.battleCount = metrics.battlesCount || 0;
    
    const winRate = metrics.battlesCount > 0 
      ? Math.round((metrics.victories / metrics.battlesCount) * 100) 
      : 0;

    const report = {
      summary: {
        battlesCount: metrics.battlesCount || 0,
        victories: metrics.victories || 0,
        defeats: (metrics.battlesCount || 0) - (metrics.victories || 0),
        winRate,
        totalDamage: metrics.totalDamage || 0,
        totalHealing: metrics.totalHealing || 0,
        totalBlocking: metrics.totalBlocking || 0
      },
      efficiency: {
        damagePerEnergy: efficiency.damagePerEnergy || 0,
        healingPerEnergy: efficiency.healingPerEnergy || 0,
        blockPerEnergy: efficiency.blockPerEnergy || 0,
        averageDamagePerBattle: metrics.averageDamagePerBattle || 0
      },
      trends: this._generateTrends(metrics),
      achievements: this.getAchievements(),
      timestamp: Date.now(),
      version: this.version
    };

    this.lastReportBattleCount = this.battleCount;
    return report;
  }

  /**
   * Generate visualization data for charts
   * @param {Array} battleHistory - Array of battle results
   * @returns {object} Chart-ready data structure
   */
  generateVisualization(battleHistory) {
    if (!battleHistory || battleHistory.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = battleHistory.map((b, i) => `Battle ${i + 1}`);
    const damageData = battleHistory.map(b => b.damage || 0);
    const energyData = battleHistory.map(b => b.energyUsed || 1);
    const victoryData = battleHistory.map(b => b.victory ? 1 : 0);

    return {
      labels,
      datasets: [
        {
          label: 'Damage',
          data: damageData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)'
        },
        {
          label: 'Energy Used',
          data: energyData,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)'
        },
        {
          label: 'Victory',
          data: victoryData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)'
        }
      ],
      metadata: {
        totalBattles: battleHistory.length,
        averageDamage: damageData.reduce((a, b) => a + b, 0) / battleHistory.length,
        totalVictories: victoryData.reduce((a, b) => a + b, 0)
      }
    };
  }

  /**
   * Track progress toward milestones
   * @param {string} milestoneId - Milestone identifier
   * @param {any} value - Current value
   */
  trackMilestone(milestoneId, value) {
    this.milestones[milestoneId] = value;
  }

  /**
   * Get newly achieved milestones since last check
   * @param {number} previousBattleCount - Previous battle count to compare
   * @returns {Array} Newly achieved milestone IDs
   */
  getNewMilestones(previousBattleCount) {
    const newMilestones = [];
    for (const [id, value] of Object.entries(this.milestones)) {
      // A milestone is "new" if its value > previousBattleCount
      // meaning it was achieved after the previous checkpoint
      if (value > previousBattleCount) {
        newMilestones.push(id);
      }
    }
    return newMilestones;
  }

  /**
   * Get list of all achievements
   * @returns {Array} Achievement objects
   */
  getAchievements() {
    const achievements = [];
    for (const [id, value] of Object.entries(this.milestones)) {
      const def = this.milestoneDefinitions[id];
      if (def) {
        achievements.push({
          id,
          name: def.name,
          value: value === true ? null : value,
          achieved: true
        });
      }
    }
    return achievements;
  }

  /**
   * Update milestone progress based on current stats
   * @param {object} stats - Current statistics
   */
  updateMilestones(stats) {
    for (const [id, def] of Object.entries(this.milestoneDefinitions)) {
      if (def.condition(stats)) {
        if (def.type === 'boolean') {
          this.milestones[id] = true;
        } else if (def.type === 'count' || def.type === 'percentage' || def.type === 'value') {
          this.milestones[id] = stats[id.replace(/([A-Z])/g, '_$1').toLowerCase()] || stats[id] || 0;
        }
      }
    }
  }

  /**
   * Generate comparison report between two periods
   * @param {object} period1 - First period metrics
   * @param {object} period2 - Second period metrics
   * @returns {object} Comparison analysis
   */
  generateComparisonReport(period1, period2) {
    const damage1 = period1.damage || 0;
    const damage2 = period2.damage || 0;
    const energy1 = period1.energy || 1;
    const energy2 = period2.energy || 1;
    const victories1 = period1.victories || 0;
    const victories2 = period2.victories || 0;
    const battles1 = period1.battles || 1;
    const battles2 = period2.battles || 1;

    const efficiency1 = damage1 / energy1;
    const efficiency2 = damage2 / energy2;
    const winRate1 = victories1 / battles1;
    const winRate2 = victories2 / battles2;

    return {
      damageChange: damage2 - damage1,
      damageChangePercent: damage1 > 0 ? Math.round(((damage2 - damage1) / damage1) * 100) : 100,
      victoriesChange: victories2 - victories1,
      winRateChange: Math.round((winRate2 - winRate1) * 100),
      efficiencyChange: Math.round((efficiency2 - efficiency1) * 10) / 10,
      period1: {
        damage: damage1,
        victories: victories1,
        battles: battles1,
        efficiency: Math.round(efficiency1 * 10) / 10
      },
      period2: {
        damage: damage2,
        victories: victories2,
        battles: battles2,
        efficiency: Math.round(efficiency2 * 10) / 10
      }
    };
  }

  /**
   * Check if report should be generated
   * @returns {boolean} True if interval reached
   */
  shouldGenerateReport() {
    return (this.battleCount - this.lastReportBattleCount) >= this.reportInterval;
  }

  /**
   * Export report as JSON string
   * @param {object} report - Report to export
   * @returns {string} JSON string
   */
  exportReport(report) {
    return JSON.stringify({
      ...report,
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Generate trend analysis
   * @param {object} metrics - Current metrics
   * @returns {object} Trend data
   */
  _generateTrends(metrics) {
    return {
      averageDamagePerBattle: Math.round((metrics.totalDamage / (metrics.battlesCount || 1)) * 10) / 10,
      recentBattles: metrics.battlesCount || 0,
      performanceLevel: this._calculatePerformanceLevel(metrics)
    };
  }

  /**
   * Calculate overall performance level
   * @param {object} metrics - Metrics to evaluate
   * @returns {string} Performance level
   */
  _calculatePerformanceLevel(metrics) {
    const winRate = metrics.battlesCount > 0 
      ? (metrics.victories / metrics.battlesCount) * 100 
      : 0;
    const avgDamage = metrics.totalDamage / (metrics.battlesCount || 1);

    if (winRate >= 75 && avgDamage >= 50) return 'elite';
    if (winRate >= 60 && avgDamage >= 35) return 'skilled';
    if (winRate >= 40 && avgDamage >= 20) return 'average';
    return 'beginner';
  }

  /**
   * Reset generator state
   */
  reset() {
    this.milestones = {};
    this.battleCount = 0;
    this.lastReportBattleCount = 0;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PerformanceReportGenerator };
} else if (typeof window !== 'undefined') {
  window.PerformanceReportGenerator = PerformanceReportGenerator;
}