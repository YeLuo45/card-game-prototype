/**
 * Duel Score Tracker (Iteration 7/9)
 * Core: DuelScoreTracker
 * 
 * Features:
 * - Score calculation
 * - Win/loss streak tracking
 * - Ranking updates
 */

class DuelScoreTracker {
  constructor(options = {}) {
    this.scores = new Map();
    this.winStreaks = new Map();
    this.lossStreaks = new Map();
    this.baseScore = options.baseScore || 1000;
    this.winBonus = options.winBonus || 30;
    this.lossPenalty = options.lossPenalty || 20;
    this.version = 'V255-Iter7';
  }

  /**
   * Initialize player score entry
   * @param {string} playerId - Player ID
   */
  initializePlayer(playerId) {
    if (!this.scores.has(playerId)) {
      this.scores.set(playerId, {
        playerId,
        score: this.baseScore,
        wins: 0,
        losses: 0,
        lastUpdated: Date.now()
      });
    }
  }

  /**
   * Record a player win
   * @param {string} playerId - Player ID
   * @param {number} bonusScore - Additional bonus
   */
  recordWin(playerId, bonusScore = 0) {
    this.initializePlayer(playerId);
    
    const streakBonus = this.calculateStreakBonus(playerId);
    const totalBonus = this.winBonus + streakBonus + bonusScore;
    
    this.scores.get(playerId).score += totalBonus;
    this.scores.get(playerId).wins++;
    this.scores.get(playerId).lastUpdated = Date.now();

    const currentStreak = this.winStreaks.get(playerId) || 0;
    this.winStreaks.set(playerId, currentStreak + 1);
    this.lossStreaks.set(playerId, 0);
  }

  /**
   * Record a player loss
   * @param {string} playerId - Player ID
   * @param {number} penaltyScore - Additional penalty
   */
  recordLoss(playerId, penaltyScore = 0) {
    this.initializePlayer(playerId);
    
    const totalPenalty = this.lossPenalty + penaltyScore;
    
    this.scores.get(playerId).score = Math.max(0, this.scores.get(playerId).score - totalPenalty);
    this.scores.get(playerId).losses++;
    this.scores.get(playerId).lastUpdated = Date.now();

    const currentStreak = this.lossStreaks.get(playerId) || 0;
    this.lossStreaks.set(playerId, currentStreak + 1);
    this.winStreaks.set(playerId, 0);
  }

  /**
   * Calculate streak bonus
   * @param {string} playerId - Player ID
   * @returns {number} Streak bonus
   */
  calculateStreakBonus(playerId) {
    const streak = this.winStreaks.get(playerId) || 0;
    
    if (streak >= 5) return 50;
    if (streak >= 4) return 40;
    if (streak >= 3) return 30;
    return 0;
  }

  /**
   * Get player score data
   * @param {string} playerId - Player ID
   * @returns {object|null} Score data
   */
  getPlayerScore(playerId) {
    if (!this.scores.has(playerId)) {
      return null;
    }
    return { ...this.scores.get(playerId) };
  }

  /**
   * Get rankings sorted by score
   * @param {number} limit - Maximum players to return
   * @returns {Array} Rankings
   */
  getRankings(limit = 0) {
    const rankings = Array.from(this.scores.values())
      .sort((a, b) => b.score - a.score);
    
    return limit > 0 ? rankings.slice(0, limit) : rankings;
  }

  /**
   * Update player score directly
   * @param {string} playerId - Player ID
   * @param {number} newScore - New score
   */
  updateScore(playerId, newScore) {
    this.initializePlayer(playerId);
    this.scores.get(playerId).score = newScore;
    this.scores.get(playerId).lastUpdated = Date.now();
  }

  /**
   * Reset player stats
   * @param {string} playerId - Player ID
   */
  resetStats(playerId) {
    if (this.scores.has(playerId)) {
      this.scores.get(playerId).wins = 0;
      this.scores.get(playerId).losses = 0;
    }
    this.winStreaks.set(playerId, 0);
    this.lossStreaks.set(playerId, 0);
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DuelScoreTracker };
} else if (typeof window !== 'undefined') {
  window.DuelScoreTracker = DuelScoreTracker;
}