/**
 * Key Turn Marker (Iteration 1/9)
 * Core: KeyTurnMarker
 * 
 * Features:
 * - Auto-mark key turns (critical hit kills, finishing blows, decision points)
 * - Custom marking rules
 * - Turn importance scoring algorithm
 */

class KeyTurnMarker {
  constructor(options = {}) {
    this.thresholds = {
      criticalHit: options.criticalHitThreshold || 0.3,
      finishingBlow: options.finishingBlowThreshold || 0.4,
      decisionPoint: options.decisionPointThreshold || 0.35
    };
    
    this.markedTurns = [];
    this.customRules = [];
    this.markHistory = [];
  }

  /**
   * Mark a turn as key or not
   * @param {object} turnData - Turn data to analyze
   * @returns {object} Mark result with isKeyTurn, markType, score
   */
  markTurn(turnData) {
    const score = this.calculateImportanceScore(turnData);
    const markType = this._determineMarkType(turnData);
    
    const result = {
      turn: turnData.turn,
      isKeyTurn: score >= this._getMinThreshold(turnData),
      markType: markType,
      score: score,
      details: this._getDetails(turnData)
    };

    if (result.isKeyTurn && turnData.turn) {
      if (!this.markedTurns.includes(turnData.turn)) {
        this.markedTurns.push(turnData.turn);
      }
      this.markHistory.push(result);
    }

    return result;
  }

  /**
   * Calculate importance score for a turn
   * @param {object} turnData - Turn data
   * @returns {number} Importance score (0-100)
   */
  calculateImportanceScore(turnData) {
    let score = 0;

    // Critical hit contribution
    if (turnData.hasCriticalHit) {
      score += 40;
    }

    // Finishing blow contribution
    if (turnData.overkill) {
      score += 35;
    }

    // Damage contribution (normalized)
    if (turnData.damageDealt) {
      score += Math.min(turnData.damageDealt * 0.5, 25);
    }

    // Energy management (decision points)
    if (turnData.energySpent !== undefined && turnData.optionsAvailable !== undefined) {
      const energyRatio = turnData.energySpent / Math.max(turnData.optionsAvailable, 1);
      if (energyRatio < 0.7) {
        score += 30; // Low energy usage suggests important decision
      }
    }

    // Custom rules contribution
    for (const rule of this.customRules) {
      if (rule.condition(turnData)) {
        score += 20 * rule.weight;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Analyze entire battle and mark key turns
   * @param {Array} battleLog - Array of turn data
   * @returns {object} Analysis result with keyTurns, totalTurns, etc.
   */
  analyzeBattle(battleLog) {
    this.markedTurns = [];
    const keyTurns = [];

    for (const turnData of battleLog) {
      const result = this.markTurn(turnData);
      if (result.isKeyTurn) {
        keyTurns.push({
          turn: turnData.turn,
          markType: result.markType,
          score: result.score,
          details: result.details
        });
      }
    }

    return {
      keyTurns: keyTurns,
      keyTurnCount: keyTurns.length,
      totalTurns: battleLog.length,
      keyTurnRatio: battleLog.length > 0 ? keyTurns.length / battleLog.length : 0
    };
  }

  /**
   * Add custom marking rule
   * @param {object} rule - Rule object with name, condition, weight
   * @returns {string} Rule ID
   */
  addCustomRule(rule) {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.customRules.push({
      id: ruleId,
      name: rule.name,
      condition: rule.condition,
      weight: rule.weight || 1.0
    });
    return ruleId;
  }

  /**
   * Remove custom rule
   * @param {string} ruleId - Rule ID to remove
   */
  removeCustomRule(ruleId) {
    this.customRules = this.customRules.filter(r => r.id !== ruleId);
  }

  /**
   * Get all marked turns
   * @returns {Array} Array of marked turn numbers
   */
  getMarkedTurns() {
    return [...this.markedTurns];
  }

  /**
   * Clear marked turns history
   */
  clear() {
    this.markedTurns = [];
    this.markHistory = [];
  }

  /**
   * Determine the mark type based on turn data
   * @param {object} turnData - Turn data
   * @returns {string} Mark type
   */
  _determineMarkType(turnData) {
    if (turnData.hasCriticalHit) {
      return 'critical_hit';
    }
    if (turnData.overkill) {
      return 'finishing_blow';
    }
    if (this._isDecisionPoint(turnData)) {
      return 'decision_point';
    }
    return 'normal';
  }

  /**
   * Check if turn is a decision point
   * @param {object} turnData - Turn data
   * @returns {boolean}
   */
  _isDecisionPoint(turnData) {
    // Multiple options with low energy suggests important decision
    if (turnData.optionsAvailable >= 3 && turnData.energySpent !== undefined) {
      return turnData.energySpent > 0;
    }
    return false;
  }

  /**
   * Get minimum threshold for marking
   * @param {object} turnData - Turn data
   * @returns {number} Threshold value
   */
  _getMinThreshold(turnData) {
    // Check if any custom rule matches
    const hasMatchingCustomRule = this.customRules.some(rule => rule.condition(turnData));
    if (hasMatchingCustomRule) {
      return 0; // Custom rule matched, low threshold to ensure marking
    }

    if (turnData.hasCriticalHit) {
      return this.thresholds.criticalHit * 100;
    }
    if (turnData.overkill) {
      return this.thresholds.finishingBlow * 100;
    }
    if (this._isDecisionPoint(turnData)) {
      return 5; // Very low threshold for decision points since scoring gives high points
    }
    return 50;
  }

  /**
   * Get details for mark result
   * @param {object} turnData - Turn data
   * @returns {object} Details object
   */
  _getDetails(turnData) {
    const details = {};
    
    if (turnData.hasCriticalHit) {
      details.criticalHit = true;
    }
    if (turnData.overkill) {
      details.overkillDamage = turnData.overkillDamage || 0;
    }
    if (turnData.damageDealt) {
      details.damageDealt = turnData.damageDealt;
    }
    if (turnData.energySpent !== undefined) {
      details.energySpent = turnData.energySpent;
    }
    
    return details;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KeyTurnMarker };
} else if (typeof window !== 'undefined') {
  window.KeyTurnMarker = KeyTurnMarker;
}