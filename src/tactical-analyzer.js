/**
 * Tactical Analyzer (Iteration 1/9)
 * Core: TacticalAnalyzer
 * 
 * Features:
 * - Analyze player behavior patterns from battle data
 * - Generate tactical suggestions (card order, energy management)
 * - Compare optimal vs actual plays
 */

class TacticalAnalyzer {
  constructor(options = {}) {
    this.analysisDepth = options.analysisDepth || 'normal';
    this.suggestionLimit = options.suggestionLimit || 10;
    this.patterns = [];
    this.version = 'V255-Iter1';
  }

  /**
   * Analyze player behavior patterns
   * @param {Array} battleLog - Battle log data
   * @returns {object} Behavior analysis results
   */
  analyzeBehavior(battleLog) {
    if (!battleLog || battleLog.length === 0) {
      return { patterns: {}, summary: 'No data to analyze' };
    }

    const patterns = {
      attackFrequency: this._calculateAttackFrequency(battleLog),
      defensiveFrequency: this._calculateDefensiveFrequency(battleLog),
      averageEnergyUsage: this._calculateAverageEnergyUsage(battleLog),
      cardPreferences: this._analyzeCardPreferences(battleLog),
      aggressionLevel: this._calculateAggressionLevel(battleLog)
    };

    // Determine dominant strategy
    patterns.dominantStrategy = this._determineDominantStrategy(patterns);

    return {
      patterns,
      summary: this._generateBehaviorSummary(patterns),
      recommendations: this._generatePatternRecommendations(patterns)
    };
  }

  /**
   * Generate tactical suggestions based on battle log
   * @param {Array} battleLog - Battle log data
   * @returns {Array} Array of suggestions
   */
  generateSuggestions(battleLog) {
    if (!battleLog || battleLog.length === 0) {
      return [];
    }

    const suggestions = [];

    // Card order suggestions
    const cardOrderSuggestions = this._suggestCardOrder(battleLog);
    suggestions.push(...cardOrderSuggestions);

    // Energy management suggestions
    const energySuggestions = this._suggestEnergyManagement(battleLog);
    suggestions.push(...energySuggestions);

    // Timing suggestions
    const timingSuggestions = this._suggestTiming(battleLog);
    suggestions.push(...timingSuggestions);

    // Limit suggestions
    return suggestions.slice(0, this.suggestionLimit);
  }

  /**
   * Compare optimal vs actual play
   * @param {object} actualPlay - Actual play data
   * @param {object} optimalPlay - Optimal play data
   * @returns {object} Comparison result
   */
  compareOptimalVsActual(actualPlay, optimalPlay) {
    const actualDamage = actualPlay.damage || 0;
    const optimalDamage = optimalPlay.damage || 0;
    const actualEnergy = actualPlay.energySpent || 0;
    const optimalEnergy = optimalPlay.energySpent || 0;

    let efficiency = 0;
    let damageLoss = 0;

    if (optimalDamage > 0) {
      efficiency = Math.round((actualDamage / optimalDamage) * 100);
      damageLoss = optimalDamage - actualDamage;
    }

    const energyEfficiency = optimalEnergy > 0 
      ? Math.round((actualEnergy / optimalEnergy) * 100) 
      : (actualEnergy === 0 ? 100 : 0);

    return {
      efficiency,
      damageLoss,
      energyEfficiency,
      overallScore: Math.round((efficiency + energyEfficiency) / 2)
    };
  }

  /**
   * Get complete replay analysis
   * @param {object} replayData - Replay data with events
   * @returns {object} Complete analysis
   */
  getReplayAnalysis(replayData) {
    if (!replayData || !replayData.events || replayData.events.length === 0) {
      return {
        behavior: { patterns: {} },
        suggestions: [],
        score: 0
      };
    }

    // Convert events to battle log format
    const battleLog = this._convertEventsToBattleLog(replayData.events);
    const behavior = this.analyzeBehavior(battleLog);
    const suggestions = this.generateSuggestions(battleLog);
    const score = this.getOverallScore(battleLog);

    return {
      behavior,
      suggestions,
      score,
      keyEvents: this._identifyKeyEvents(replayData.events)
    };
  }

  /**
   * Identify missed opportunities
   * @param {Array} battleLog - Battle log data
   * @returns {Array} Missed opportunities
   */
  identifyMissedOpportunities(battleLog) {
    const opportunities = [];

    for (let i = 0; i < battleLog.length; i++) {
      const turn = battleLog[i];
      
      // Check for missed kill
      if (turn.enemyHP !== undefined && turn.playerDamage !== undefined) {
        const nextTurn = battleLog[i + 1];
        if (nextTurn && nextTurn.enemyHP !== undefined) {
          const damageNeeded = turn.enemyHP;
          const actualDamage = turn.playerDamage || 0;
          
          if (actualDamage >= damageNeeded && turn.cardsInHand && turn.cardsInHand.length > 0) {
            // Player could have killed but didn't use optimal card
          }
        }
      }
    }

    return opportunities;
  }

  /**
   * Calculate overall tactical score
   * @param {Array} battleLog - Battle log data
   * @returns {number} Overall score (0-100)
   */
  getOverallScore(battleLog) {
    if (!battleLog || battleLog.length === 0) {
      return 0;
    }

    const behavior = this.analyzeBehavior(battleLog);
    const suggestions = this.generateSuggestions(battleLog);
    
    // Base score from aggression level (inverse relationship - too aggressive or too passive is bad)
    let baseScore = 50;
    if (behavior.patterns.aggressionLevel !== undefined) {
      const optimalAggression = 50;
      const diff = Math.abs(behavior.patterns.aggressionLevel - optimalAggression);
      baseScore = Math.max(20, 100 - diff);
    }

    // Deduction for suggestions
    const suggestionDeduction = Math.min(suggestions.length * 5, 30);
    
    // Bonus for efficient plays
    let efficiencyBonus = 0;
    for (const turn of battleLog) {
      if (turn.damage > 0 && turn.energySpent !== undefined) {
        const damagePerEnergy = turn.damage / Math.max(turn.energySpent, 1);
        if (damagePerEnergy > 5) {
          efficiencyBonus += 2;
        }
      }
    }

    return Math.max(0, Math.min(100, baseScore - suggestionDeduction + efficiencyBonus));
  }

  // ========== Private Helper Methods ==========

  _calculateAttackFrequency(battleLog) {
    const attackTurns = battleLog.filter(t => t.cardPlayed && 
      (t.cardType === 'attack' || t.damage > 0));
    return battleLog.length > 0 ? attackTurns.length / battleLog.length : 0;
  }

  _calculateDefensiveFrequency(battleLog) {
    const defendTurns = battleLog.filter(t => t.cardPlayed && t.cardType === 'skill');
    return battleLog.length > 0 ? defendTurns.length / battleLog.length : 0;
  }

  _calculateAverageEnergyUsage(battleLog) {
    const turnsWithEnergy = battleLog.filter(t => t.energySpent !== undefined);
    if (turnsWithEnergy.length === 0) return 0;
    
    const totalEnergy = turnsWithEnergy.reduce((sum, t) => sum + (t.energySpent || 0), 0);
    return totalEnergy / turnsWithEnergy.length;
  }

  _analyzeCardPreferences(battleLog) {
    const cardCounts = {};
    for (const turn of battleLog) {
      if (turn.cardPlayed) {
        cardCounts[turn.cardPlayed] = (cardCounts[turn.cardPlayed] || 0) + 1;
      }
    }
    return cardCounts;
  }

  _calculateAggressionLevel(battleLog) {
    const attackFreq = this._calculateAttackFrequency(battleLog);
    const energyUsage = this._calculateAverageEnergyUsage(battleLog);
    
    // High attack frequency + high energy usage = aggressive
    return Math.round((attackFreq * 60 + (energyUsage / 3) * 40));
  }

  _determineDominantStrategy(patterns) {
    if (patterns.aggressionLevel > 60) return 'aggressive';
    if (patterns.aggressionLevel < 40) return 'defensive';
    return 'balanced';
  }

  _generateBehaviorSummary(patterns) {
    const strategy = patterns.dominantStrategy || 'unknown';
    return `Player shows ${strategy} tendencies with ${Math.round(patterns.attackFrequency * 100)}% attack rate`;
  }

  _generatePatternRecommendations(patterns) {
    const recs = [];
    if (patterns.attackFrequency > 0.8) {
      recs.push({ type: 'strategy', message: 'Consider more defensive plays' });
    }
    if (patterns.attackFrequency < 0.3) {
      recs.push({ type: 'strategy', message: 'You may be too passive - look for attack opportunities' });
    }
    return recs;
  }

  _suggestCardOrder(battleLog) {
    const suggestions = [];
    
    // Find turns with multiple cards played
    const multiCardTurns = battleLog.filter(t => t.cardsInHand && t.cardsInHand.length > 1);
    if (multiCardTurns.length > 0) {
      suggestions.push({
        type: 'card_order',
        priority: 'medium',
        message: 'Consider playing high-damage cards first when you have multiple attacks'
      });
    }
    
    return suggestions;
  }

  _suggestEnergyManagement(battleLog) {
    const suggestions = [];
    
    const avgEnergy = this._calculateAverageEnergyUsage(battleLog);
    if (avgEnergy < 2) {
      suggestions.push({
        type: 'energy_management',
        priority: 'high',
        message: 'You are underutilizing your energy - try to play more cards each turn'
      });
    } else if (avgEnergy > 2.5) {
      suggestions.push({
        type: 'energy_management',
        priority: 'medium',
        message: 'Consider saving energy for bigger plays'
      });
    }
    
    return suggestions;
  }

  _suggestTiming(battleLog) {
    const suggestions = [];
    
    // Check for early game passivity
    const earlyTurns = battleLog.slice(0, 3);
    const earlyAttacks = earlyTurns.filter(t => t.cardType === 'attack');
    if (earlyAttacks.length < 2) {
      suggestions.push({
        type: 'timing',
        priority: 'medium',
        message: 'Early game aggression can set the pace - don\'t be too passive'
      });
    }
    
    return suggestions;
  }

  _convertEventsToBattleLog(events) {
    const battleLog = [];
    for (const event of events) {
      if (event.turn) {
        battleLog.push({
          turn: event.turn,
          cardPlayed: event.cardId || event.cardPlayed,
          cardType: event.cardType,
          damage: event.damage || event.damageDealt,
          energySpent: event.energySpent || event.cost,
          enemyHP: event.enemyHP,
          playerHP: event.playerHP
        });
      }
    }
    return battleLog;
  }

  _identifyKeyEvents(events) {
    const keyTypes = ['battle_start', 'battle_end', 'critical_hit', 'finishing_blow'];
    return events.filter(e => keyTypes.includes(e.type));
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TacticalAnalyzer };
} else if (typeof window !== 'undefined') {
  window.TacticalAnalyzer = TacticalAnalyzer;
}