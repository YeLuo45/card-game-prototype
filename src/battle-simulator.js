/**
 * V255 Battle Simulator System (Iteration 1/9)
 * 战斗模拟系统: BattleSimulator | BattleMetrics | CombatResolver
 * 
 * 概念：模拟战斗流程，计算伤害预期，生成战斗报告
 * 设计来源: thunderbolt pipeline | generic-agent reasoning | nanobot mesh
 * 
 * 跨系统协同 (Cross-System Integration):
 * - 基于 synergy-cascade 计算协同伤害
 * - 基于 energy-tuning 计算能量效率
 * - 基于 deck-archetype-evolution 计算卡牌进化加成
 * - 基于 adaptive-difficulty 调整 AI 难度
 */

class BattleMetrics {
  constructor() {
    this.metrics = {
      totalDamage: 0,
      effectiveDamage: 0,
      overkillDamage: 0,
      damageNegated: 0,
      energySpent: 0,
      energyWasted: 0,
      turnsElapsed: 0,
      cardsPlayed: 0,
      criticalHits: 0,
      statusDamage: 0
    };
    this.turnBreakdown = [];
  }

  /**
   * 重置指标
   */
  reset() {
    this.metrics = {
      totalDamage: 0,
      effectiveDamage: 0,
      overkillDamage: 0,
      damageNegated: 0,
      energySpent: 0,
      energyWasted: 0,
      turnsElapsed: 0,
      cardsPlayed: 0,
      criticalHits: 0,
      statusDamage: 0
    };
    this.turnBreakdown = [];
  }

  /**
   * 记录回合伤害
   * @param {number} turn - 回合数
   * @param {object} damageInfo - 伤害信息
   */
  recordTurnDamage(turn, damageInfo) {
    const {
      totalDamage = 0,
      effectiveDamage = 0,
      overkillDamage = 0,
      damageNegated = 0,
      energySpent = 0,
      cardsPlayed = 0,
      criticalHits = 0,
      statusDamage = 0
    } = damageInfo;

    this.metrics.totalDamage += totalDamage;
    this.metrics.effectiveDamage += effectiveDamage;
    this.metrics.overkillDamage += overkillDamage;
    this.metrics.damageNegated += damageNegated;
    this.metrics.energySpent += energySpent;
    this.metrics.cardsPlayed += cardsPlayed;
    this.metrics.criticalHits += criticalHits;
    this.metrics.statusDamage += statusDamage;

    this.turnBreakdown.push({ turn, ...damageInfo });
  }

  /**
   * 计算能量效率
   * @returns {number} 能量效率百分比
   */
  calculateEnergyEfficiency() {
    if (this.metrics.energySpent === 0) return 0;
    const wasted = this.metrics.energyWasted;
    const total = this.metrics.energySpent + wasted;
    return total > 0 ? ((total - wasted) / total) * 100 : 0;
  }

  /**
   * 计算 DPS (每回合伤害)
   * @returns {number} DPS
   */
  calculateDPS() {
    if (this.metrics.turnsElapsed === 0) return 0;
    return this.metrics.totalDamage / this.metrics.turnsElapsed;
  }

  /**
   * 计算暴击率
   * @returns {number} 暴击率百分比
   */
  calculateCriticalRate() {
    if (this.metrics.cardsPlayed === 0) return 0;
    return (this.metrics.criticalHits / this.metrics.cardsPlayed) * 100;
  }

  /**
   * 获取完整报告
   * @returns {object} 战斗指标报告
   */
  getReport() {
    return {
      ...this.metrics,
      energyEfficiency: this.calculateEnergyEfficiency(),
      dps: this.calculateDPS(),
      criticalRate: this.calculateCriticalRate(),
      turnBreakdown: this.turnBreakdown
    };
  }
}

class CombatResolver {
  constructor(options = {}) {
    this.criticalMultiplier = options.criticalMultiplier || 1.5;
    this.statusMultiplier = options.statusMultiplier || 0.5;
    this.armorReduction = options.armorReduction || true;
  }

  /**
   * 计算攻击伤害
   * @param {object} attacker - 攻击者状态
   * @param {object} defender - 防御者状态
   * @param {object} card - 使用的卡牌
   * @returns {object} 伤害计算结果
   */
  calculateDamage(attacker, defender, card) {
    const baseDamage = card.damage || 0;
    const attackerBonus = attacker.damageBonus || 0;
    const synergyBonus = attacker.synergyBonus || 0;
    const archetypeBonus = attacker.archetypeBonus || 0;
    
    let totalDamage = baseDamage + attackerBonus + synergyBonus + archetypeBonus;
    let effectiveDamage = totalDamage;
    let overkillDamage = 0;
    let damageNegated = 0;

    // 计算护甲减伤
    if (this.armorReduction && defender.armor > 0) {
      const armorBefore = defender.armor;
      defender.armor = Math.max(0, defender.armor - totalDamage);
      const armorUsed = Math.min(armorBefore, totalDamage);
      damageNegated = armorUsed;
      effectiveDamage = Math.max(0, totalDamage - armorUsed);
    }

    // 计算易伤加成
    if (defender.status && defender.status.includes('vulnerable')) {
      effectiveDamage *= 1.5;
    }

    // 计算虚弱减益
    if (attacker.status && attacker.status.includes('weakened')) {
      effectiveDamage *= 0.75;
    }

    // 计算是否暴击
    const isCritical = attacker.critChance && Math.random() < attacker.critChance;
    if (isCritical) {
      effectiveDamage *= this.criticalMultiplier;
    }

    // 计算 overkill
    const excessDamage = defender.currentHP - effectiveDamage;
    if (excessDamage < 0) {
      overkillDamage = Math.abs(excessDamage);
    }

    return {
      totalDamage,
      effectiveDamage: Math.round(effectiveDamage),
      overkillDamage,
      damageNegated,
      isCritical,
      residualArmor: defender.armor
    };
  }

  /**
   * 计算状态伤害
   * @param {object} target - 目标状态
   * @param {string} statusType - 状态类型
   * @param {number} stacks - 层数
   * @returns {number} 状态伤害
   */
  calculateStatusDamage(target, statusType, stacks) {
    const statusDamages = {
      'burning': 2,
      'poisoned': 3,
      'paralyzed': 1
    };

    const baseDamage = statusDamages[statusType] || 0;
    return baseDamage * stacks * this.statusMultiplier;
  }

  /**
   * 应用伤害到目标
   * @param {object} target - 目标
   * @param {number} damage - 伤害值
   * @returns {object} 伤害应用结果
   */
  applyDamage(target, damage) {
    let hpLoss = damage;
    let armorDamage = 0;

    // 先扣护甲
    if (target.armor > 0) {
      const armorBefore = target.armor;
      target.armor = Math.max(0, target.armor - damage);
      armorDamage = Math.min(armorBefore, damage);
      hpLoss = Math.max(0, damage - armorBefore);
    }

    // 扣血量
    target.currentHP = Math.max(0, target.currentHP - hpLoss);

    return {
      hpLost: hpLoss,
      armorDamage,
      currentHP: target.currentHP,
      isDead: target.currentHP <= 0,
      residualArmor: target.armor
    };
  }
}

/**
 * BattleSimulator - 战斗模拟器
 * 模拟完整战斗流程，生成战斗报告
 */
class BattleSimulator {
  constructor(options = {}) {
    this.metrics = new BattleMetrics();
    this.resolver = new CombatResolver(options.resolver);
    this.maxTurns = options.maxTurns || 20;
    this.verbose = options.verbose || false;
    this.battleHistory = [];
  }

  /**
   * 模拟一场战斗
   * @param {object} playerState - 玩家状态
   * @param {object} enemyState - 敌人状态
   * @param {object[]} deck - 牌组
   * @param {object} gameContext - 游戏上下文
   * @returns {object} 战斗结果
   */
  simulateBattle(playerState, enemyState, deck, gameContext = {}) {
    this.metrics.reset();
    
    const initialPlayerHP = playerState.currentHP;
    const initialEnemyHP = enemyState.currentHP;
    const startTime = Date.now();
    
    let turn = 1;
    let hand = [];
    let deckCopy = [...deck];
    let currentPlayerState = { ...playerState };
    let currentEnemyState = { ...enemyState };

    // 模拟每个回合
    while (turn <= this.maxTurns && currentPlayerState.currentHP > 0 && currentEnemyState.currentHP > 0) {
      // 抽牌
      hand = this.drawCards(deckCopy, 5);
      
      // 计算能量
      const energy = this.calculateEnergy(turn, gameContext);
      currentPlayerState.currentEnergy = energy;
      currentPlayerState.maxEnergy = energy;

      // AI 回合处理
      const enemyAction = this.getEnemyAction(currentEnemyState, turn);
      
      // 应用敌人行动
      if (enemyAction && enemyAction.damage > 0) {
        const damageResult = this.resolver.applyDamage(currentPlayerState, enemyAction.damage);
        if (this.verbose) {
          console.log(`Turn ${turn}: Enemy deals ${enemyAction.damage} damage`);
        }
      }

      // 玩家行动处理
      let cardsPlayedThisTurn = 0;
      let damageDealtThisTurn = 0;
      let energySpentThisTurn = 0;

      for (const card of hand) {
        if (card.cost <= energy && currentEnemyState.currentHP > 0) {
          const damageResult = this.resolver.calculateDamage(
            currentPlayerState,
            currentEnemyState,
            card
          );
          
          const applied = this.resolver.applyDamage(currentEnemyState, damageResult.effectiveDamage);
          damageDealtThisTurn += damageResult.effectiveDamage;
          energySpentThisTurn += card.cost;
          cardsPlayedThisTurn++;

          if (this.verbose) {
            console.log(`Turn ${turn}: Player plays ${card.name} for ${card.cost} energy, dealing ${damageResult.effectiveDamage} damage`);
          }

          if (currentEnemyState.currentHP <= 0) break;
        }
      }

      // 处理状态伤害
      const statusDamageThisTurn = this.processStatusEffects(currentPlayerState, currentEnemyState);
      damageDealtThisTurn += statusDamageThisTurn;

      // 记录回合统计
      this.metrics.recordTurnDamage(turn, {
        totalDamage: damageDealtThisTurn,
        effectiveDamage: damageDealtThisTurn,
        overkillDamage: 0,
        damageNegated: 0,
        energySpent: energySpentThisTurn,
        energyWasted: energy - energySpentThisTurn,
        cardsPlayed: cardsPlayedThisTurn,
        criticalHits: 0,
        statusDamage: statusDamageThisTurn
      });

      this.metrics.metrics.turnsElapsed = turn;
      this.metrics.metrics.energyWasted += (energy - energySpentThisTurn);

      turn++;
    }

    const endTime = Date.now();
    const victory = currentEnemyState.currentHP <= 0;
    const defeat = currentPlayerState.currentHP <= 0;

    const result = {
      victory,
      defeat,
      draw: !victory && !defeat,
      turnsElapsed: turn - 1,
      finalPlayerHP: currentPlayerState.currentHP,
      finalEnemyHP: currentEnemyState.currentHP,
      playerHPChange: currentPlayerState.currentHP - initialPlayerHP,
      enemyHPChange: currentEnemyState.currentHP - initialEnemyHP,
      battleTime: endTime - startTime,
      metrics: this.metrics.getReport()
    };

    this.battleHistory.push(result);
    return result;
  }

  /**
   * 抽牌
   * @param {object[]} deck - 牌组
   * @param {number} count - 抽牌数量
   * @returns {object[]} 手牌
   */
  drawCards(deck, count) {
    const drawn = deck.slice(0, Math.min(count, deck.length));
    for (let i = 0; i < Math.min(count, deck.length); i++) {
      deck.splice(0, 1);
    }
    return drawn;
  }

  /**
   * 计算回合能量
   * @param {number} turn - 回合数
   * @param {object} context - 游戏上下文
   * @returns {number} 可用能量
   */
  calculateEnergy(turn, context = {}) {
    const baseEnergy = 3;
    const energyPerTurn = context.energyPerTurn || 1;
    const maxEnergy = context.maxEnergy || 10;
    const totalEnergy = Math.min(baseEnergy + (turn - 1) * energyPerTurn, maxEnergy);
    return totalEnergy;
  }

  /**
   * 获取敌人行动
   * @param {object} enemy - 敌人状态
   * @param {number} turn - 回合数
   * @returns {object} 敌人行动
   */
  getEnemyAction(enemy, turn) {
    const intent = enemy.intent || 'attack';
    
    if (intent === 'attack') {
      const baseDamage = enemy.damage || 5;
      const scaling = enemy.damageScaling || 0;
      const scaledDamage = scaling > 0 ? baseDamage * (1 + scaling * (turn - 1)) : baseDamage;
      return {
        action: 'attack',
        damage: Math.round(scaledDamage)
      };
    }
    
    return { action: 'defend', damage: 0 };
  }

  /**
   * 处理状态效果
   * @param {object} player - 玩家状态
   * @param {object} enemy - 敌人状态
   * @returns {number} 状态总伤害
   */
  processStatusEffects(player, enemy) {
    let totalDamage = 0;

    // 处理玩家状态
    if (player.status) {
      if (player.status.includes('burning')) {
        const stacks = player.statusStacks?.burning || 1;
        totalDamage += this.resolver.calculateStatusDamage(enemy, 'burning', stacks);
      }
      if (player.status.includes('poisoned')) {
        const stacks = player.statusStacks?.poisoned || 1;
        totalDamage += this.resolver.calculateStatusDamage(enemy, 'poisoned', stacks);
      }
    }

    // 处理敌人状态
    if (enemy.status) {
      if (enemy.status.includes('burning')) {
        const stacks = enemy.statusStacks?.burning || 1;
        totalDamage += this.resolver.calculateStatusDamage(player, 'burning', stacks);
      }
      if (enemy.status.includes('poisoned')) {
        const stacks = enemy.statusStacks?.poisoned || 1;
        totalDamage += this.resolver.calculateStatusDamage(player, 'poisoned', stacks);
      }
    }

    return totalDamage;
  }

  /**
   * 预测战斗结果
   * @param {object} playerState - 玩家状态
   * @param {object} enemyState - 敌人状态
   * @param {object[]} deck - 牌组
   * @returns {object} 预测结果
   */
  predictOutcome(playerState, enemyState, deck) {
    // 简单预测：基于平均伤害和敌人 HP
    const avgCardDamage = deck.reduce((sum, c) => sum + (c.damage || 0), 0) / Math.max(deck.length, 1);
    const avgCardsPerTurn = 3;
    const avgDamagePerTurn = avgCardDamage * avgCardsPerTurn;
    const turnsToWin = Math.ceil(enemyState.currentHP / avgDamagePerTurn);
    
    const playerAvgDamage = avgDamagePerTurn;
    const enemyAvgDamage = enemyState.damage || 5;
    const playerSurvivalTurns = Math.ceil(playerState.currentHP / enemyAvgDamage);

    return {
      estimatedTurnsToWin: turnsToWin,
      estimatedPlayerSurvival: playerSurvivalTurns,
      predictedVictory: turnsToWin <= playerSurvivalTurns,
      confidence: 0.6
    };
  }

  /**
   * 获取战斗历史
   * @returns {object[]} 战斗历史记录
   */
  getBattleHistory() {
    return this.battleHistory;
  }

  /**
   * 清除战斗历史
   */
  clearHistory() {
    this.battleHistory = [];
  }
}

// 导出
module.exports = { BattleSimulator, BattleMetrics, CombatResolver };