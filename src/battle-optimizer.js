/**
 * Battle Optimizer (Iteration 4/9)
 * Core: BattleOptimizer
 * 
 * Features:
 * - Recommend optimal card play order based on historical data
 * - Predict optimal energy allocation
 * - Generate personalized battle strategies
 */

class BattleOptimizer {
  constructor(options = {}) {
    this.aggressionBias = options.aggressionBias || 0.5;
    this.energyWeight = options.energyWeight || 0.4;
    this.synergyWeight = options.synergyWeight || 0.2;
    this.version = 'V255-Iter4';
    
    // Learning data
    this.cardEfficiencyHistory = {};
    this.synergyPairs = {};
    this.strategiesByContext = {};
  }

  /**
   * Generate optimal card play order
   * @param {Array} hand - Available cards in hand
   * @param {number} availableEnergy - Available energy
   * @returns {object} Optimal order with expected damage
   */
  generatePlayOrder(hand, availableEnergy) {
    if (!hand || hand.length === 0) {
      return { orderedCards: [], totalDamage: 0, totalCost: 0 };
    }

    // Score each card by damage per energy
    const scoredCards = hand.map(card => ({
      ...card,
      efficiency: card.damage 
        ? (card.damage * (card.criticalMultiplier || 1)) / (card.energyCost || 1)
        : (card.blocking || card.healing || 0) / (card.energyCost || 1)
    }));

    // Sort by efficiency (descending)
    scoredCards.sort((a, b) => b.efficiency - a.efficiency);

    const orderedCards = [];
    let totalEnergy = 0;
    let totalDamage = 0;
    let totalBlocking = 0;

    // Greedily select cards that fit energy budget
    for (const card of scoredCards) {
      const cost = card.energyCost || 1;
      if (totalEnergy + cost <= availableEnergy) {
        orderedCards.push(card);
        totalEnergy += cost;
        totalDamage += card.damage || 0;
        totalBlocking += card.blocking || 0;
      }
    }

    // Calculate synergy bonus
    const synergyBonus = this.getSynergyBonus(orderedCards);

    return {
      orderedCards,
      totalDamage: Math.round(totalDamage * synergyBonus * 10) / 10,
      totalCost: totalEnergy,
      totalBlocking,
      synergyBonus: Math.round(synergyBonus * 100) / 100
    };
  }

  /**
   * Recommend energy allocation between attack and defense
   * @param {number} enemyThreat - Expected enemy damage
   * @param {number} availableEnergy - Total available energy
   * @param {number} playerHP - Player current HP
   * @returns {object} Energy allocation recommendation
   */
  recommendEnergyAllocation(enemyThreat, availableEnergy, playerHP) {
    const hpPercent = playerHP / 100;
    
    // Base allocation depends on HP percentage
    let defenseRatio = 0.3; // Default 30% to defense
    
    if (hpPercent < 0.3) {
      defenseRatio = 0.6; // 60% defense when low HP
    } else if (hpPercent > 0.7) {
      defenseRatio = 0.2; // 20% defense when high HP
    }

    // Adjust based on enemy threat
    if (enemyThreat > 15) {
      defenseRatio = Math.min(0.7, defenseRatio + 0.2);
    } else if (enemyThreat < 5) {
      defenseRatio = Math.max(0.1, defenseRatio - 0.1);
    }

    const defense = Math.floor(availableEnergy * defenseRatio);
    const attack = availableEnergy - defense;

    return {
      attack,
      defense,
      reasoning: this._getAllocationReasoning(hpPercent, enemyThreat)
    };
  }

  /**
   * Generate personalized battle strategy
   * @param {object} battleContext - Current battle situation
   * @returns {object} Battle strategy
   */
  generateBattleStrategy(battleContext) {
    const { playerHP, enemyHP, enemyIntent, availableEnergy, hand } = battleContext;
    
    const playerHPPercent = playerHP / 100;
    const enemyHPPercent = enemyHP / 50; // Assuming max enemy HP around 50

    // Determine primary goal
    let primaryGoal = 'balanced';
    if (playerHPPercent < 0.3) {
      primaryGoal = 'defense';
    } else if (enemyHPPercent < 0.2) {
      primaryGoal = 'finish';
    } else if (enemyIntent === 'attacking' && playerHPPercent < 0.5) {
      primaryGoal = 'defense';
    } else if (this.aggressionBias > 0.6) {
      primaryGoal = 'aggressive';
    }

    // Generate recommended cards
    const strategy = this.generatePlayOrder(hand, availableEnergy);

    // Calculate expected outcome
    const expectedOutcome = this.simulateTurnOutcome({
      cards: strategy.orderedCards,
      playerHP,
      enemyHP,
      block: strategy.totalBlocking,
      enemyDamage: battleContext.enemyDamage || 10
    });

    return {
      primaryGoal,
      recommendedCards: strategy.orderedCards,
      expectedDamage: strategy.totalDamage,
      expectedOutcome,
      energyAllocation: this.recommendEnergyAllocation(
        battleContext.enemyDamage || 10,
        availableEnergy,
        playerHP
      ),
      reasoning: this._getStrategyReasoning(primaryGoal, battleContext)
    };
  }

  /**
   * Calculate expected damage for a set of cards
   * @param {Array} cards - Cards to calculate damage for
   * @returns {number} Expected damage
   */
  calculateExpectedDamage(cards) {
    if (!cards || cards.length === 0) return 0;

    let totalExpectedDamage = 0;

    for (const card of cards) {
      if (!card.damage) continue;

      const baseDamage = card.damage;
      const critChance = card.criticalChance || 0.1;
      const critMultiplier = card.criticalMultiplier || 2;

      // Expected value = normal_damage * (1 - crit_chance) + crit_damage * crit_chance
      const expectedDamage = baseDamage * (1 - critChance) + baseDamage * critMultiplier * critChance;
      totalExpectedDamage += expectedDamage;
    }

    return Math.round(totalExpectedDamage * 10) / 10;
  }

  /**
   * Simulate turn outcome with given cards
   * @param {object} state - Turn state
   * @returns {object} Simulated outcome
   */
  simulateTurnOutcome(state) {
    const { cards, playerHP, enemyHP, block = 0, enemyDamage = 10 } = state;

    const damageDealt = this.calculateExpectedDamage(cards);
    const actualEnemyDamage = Math.max(0, enemyDamage - block);
    const newPlayerHP = Math.max(0, playerHP - actualEnemyDamage);
    const newEnemyHP = Math.max(0, enemyHP - damageDealt);

    return {
      playerHP: newPlayerHP,
      enemyHP: newEnemyHP,
      damageDealt,
      damageBlocked: block,
      damageTaken: actualEnemyDamage,
      turnEnded: newPlayerHP <= 0 || newEnemyHP <= 0
    };
  }

  /**
   * Calculate synergy bonus for card combinations
   * @param {Array} cards - Cards to evaluate
   * @returns {number} Multiplicative bonus (1.0 = no bonus)
   */
  getSynergyBonus(cards) {
    if (!cards || cards.length < 2) return 1.0;

    let bonus = 1.0;
    const cardTypes = {};

    // Count card types
    for (const card of cards) {
      const type = card.type || card.category || 'attack';
      cardTypes[type] = (cardTypes[type] || 0) + 1;
    }

    // Multiple attacks give bonus
    if (cardTypes.attack >= 3) {
      bonus *= 1.2; // 20% bonus for 3+ attacks
    }

    // Attack + buff combination
    if (cardTypes.attack && cardTypes.buff) {
      bonus *= 1.15; // 15% bonus
    }

    // Attack + defense balance
    if (cardTypes.attack && cardTypes.defense) {
      bonus *= 1.1; // 10% bonus
    }

    return Math.round(bonus * 100) / 100;
  }

  /**
   * Optimize deck selection from pool
   * @param {Array} deckPool - Available cards to choose from
   * @param {number} maxCards - Maximum cards to select
   * @param {string} focus - Focus area ('damage', 'defense', 'balanced')
   * @returns {object} Selected cards with reasoning
   */
  optimizeDeckSelection(deckPool, maxCards, focus = 'balanced') {
    // Score each card based on focus
    const scoredCards = deckPool.map(card => {
      let score = 0;
      
      if (focus === 'damage') {
        score = (card.damage || 0) * 2 + (card.healing || 0) * 0.5;
      } else if (focus === 'defense') {
        score = (card.blocking || 0) * 2 + (card.healing || 0) * 1.5;
      } else {
        score = (card.damage || 0) + (card.blocking || 0) + (card.healing || 0);
      }

      // Penalize high energy cost
      score -= (card.energyCost || 1) * 0.5;

      return { ...card, score };
    });

    // Sort by score descending
    scoredCards.sort((a, b) => b.score - a.score);

    // Select top cards
    const selectedCards = scoredCards.slice(0, maxCards);

    return {
      selectedCards,
      focus,
      totalDamage: selectedCards.reduce((sum, c) => sum + (c.damage || 0), 0),
      totalBlocking: selectedCards.reduce((sum, c) => sum + (c.blocking || 0), 0),
      averageEnergyCost: selectedCards.reduce((sum, c) => sum + (c.energyCost || 1), 0) / selectedCards.length
    };
  }

  /**
   * Record card performance for learning
   * @param {string} cardId - Card identifier
   * @param {object} performance - Performance metrics
   */
  recordCardPerformance(cardId, performance) {
    if (!this.cardEfficiencyHistory[cardId]) {
      this.cardEfficiencyHistory[cardId] = [];
    }
    
    this.cardEfficiencyHistory[cardId].push({
      ...performance,
      timestamp: Date.now()
    });

    // Keep only recent history
    if (this.cardEfficiencyHistory[cardId].length > 20) {
      this.cardEfficiencyHistory[cardId].shift();
    }
  }

  /**
   * Get best known play order for specific context
   * @param {object} context - Battle context
   * @returns {object} Known best strategy
   */
  getKnownBestStrategy(context) {
    const key = this._contextToKey(context);
    return this.strategiesByContext[key] || null;
  }

  /**
   * Learn from battle result
   * @param {object} battleResult - Result to learn from
   */
  learnFromResult(battleResult) {
    if (battleResult.victory) {
      // Update aggression bias if winning with aggressive strategy
      this.aggressionBias = Math.min(1, this.aggressionBias + 0.05);
    } else {
      // Reduce aggression bias if losing
      this.aggressionBias = Math.max(0, this.aggressionBias - 0.05);
    }
  }

  /**
   * Reset optimizer state
   */
  reset() {
    this.aggressionBias = 0.5;
    this.cardEfficiencyHistory = {};
    this.synergyPairs = {};
    this.strategiesByContext = {};
  }

  // Helper methods

  _getAllocationReasoning(hpPercent, enemyThreat) {
    if (hpPercent < 0.3) {
      return 'Low HP - prioritize survival';
    } else if (hpPercent > 0.7 && enemyThreat < 10) {
      return 'High HP, low threat - focus on offense';
    } else if (enemyThreat > 15) {
      return 'High enemy threat - balance offense and defense';
    }
    return 'Balanced allocation';
  }

  _getStrategyReasoning(goal, context) {
    const reasons = {
      'defense': `Goal: Survive (HP: ${context.playerHP}/${context.enemyIntent === 'attacking' ? 'enemy attacking' : 'manage threats'})`,
      'aggressive': `Goal: Maximize damage (HP: ${context.playerHP} vs Enemy: ${context.enemyHP})`,
      'finish': `Goal: Finish enemy (Enemy HP: ${context.enemyHP} critical)`,
      'balanced': 'Goal: Balance offense and defense based on situation'
    };
    return reasons[goal] || reasons.balanced;
  }

  _contextToKey(context) {
    return `${context.playerHP}-${context.enemyHP}-${context.availableEnergy}`;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BattleOptimizer };
} else if (typeof window !== 'undefined') {
  window.BattleOptimizer = BattleOptimizer;
}