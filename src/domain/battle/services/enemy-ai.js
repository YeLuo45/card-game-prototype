/**
 * V65 Enemy AI Behavior System - 敌人AI行为系统（5种策略）
 */
class EnemyAI {
  constructor(aiType, config = {}) {
    this.type = aiType || 'random';
    this.difficulty = config.difficulty || 1.0;
    this.specialAbility = config.specialAbility || null;
    this.secondPhaseThreshold = config.secondPhaseThreshold || 0.5;
    this._state = { inSecondPhase: false, turnCount: 0, specialUsed: 0 };
    // V85: 绑定技能结晶器（用于AI决策辅助）
    this._skillCrystallizer = window.skillCrystallizer || null;
  }

  /** 核心决策：根据AI类型选择最优意图 + V85技能结晶辅助 */
  chooseIntent(availableIntents, gameState) {
    this._state.turnCount++;
    const hpPercent = gameState.enemyHp / gameState.enemyMaxHp;
    const playerHpPercent = gameState.playerHp / gameState.playerMaxHp;
    if (this.type === 'boss' && hpPercent <= this.secondPhaseThreshold && !this._state.inSecondPhase) {
      this._state.inSecondPhase = true;
      if (gameState.onBossPhaseChange) gameState.onBossPhaseChange(2);
    }

    // V85: 使用技能结晶辅助决策
    let skillAdvice = null;
    if (this._skillCrystallizer) {
      try {
        skillAdvice = this._skillCrystallizer.matchSkill({
          hpRatio: playerHpPercent,
          enemyHpRatio: hpPercent,
          enemyType: this.type,
          turn: this._state.turnCount,
          energy: gameState.enemyEnergy || 3
        });
      } catch(e) { skillAdvice = null; }
    }

    let baseIntent;
    switch (this.type) {
      case 'random': baseIntent = this._random(availableIntents); break;
      case 'aggressive': baseIntent = this._aggressive(availableIntents, gameState, hpPercent); break;
      case 'defensive': baseIntent = this._defensive(availableIntents, gameState, hpPercent); break;
      case 'control': baseIntent = this._control(availableIntents, gameState); break;
      case 'boss': baseIntent = this._boss(availableIntents, gameState, hpPercent); break;
      default: baseIntent = this._random(availableIntents);
    }

    // V85: 如果技能结晶提供高置信度建议，优先使用
    if (skillAdvice && skillAdvice.confidence > 0.75) {
      const skillAggression = skillAdvice.action?.aggressionLevel || 0.5;
      if (skillAggression > 0.7 && availableIntents.includes('attack')) baseIntent = 'attack';
      else if (skillAggression < 0.4 && availableIntents.includes('defend')) baseIntent = 'defend';
      if (skillAdvice.action?.preferredCards?.length > 0) {
        // 标记本回合使用技能辅助
        this._state.skillAssisted = true;
      }
    }

    return baseIntent;
  }

  _random(intents) { return intents?.length ? intents[Math.floor(Math.random() * intents.length)] : 'attack'; }

  _aggressive(intents, state, hp) {
    if (hp < 0.3) {
      if (intents.includes('heavy')) return 'heavy';
      if (intents.includes('attack')) return 'attack';
      if (intents.includes('multihit')) return 'multihit';
    }
    if (state.enemyEnergy >= 3) {
      if (intents.includes('heavy')) return 'heavy';
      if (intents.includes('multihit')) return 'multihit';
      if (intents.includes('attack')) return 'attack';
    }
    if (intents.includes('attack') || intents.includes('heavy') || intents.includes('multihit')) return 'attack';
    if (intents.includes('defend')) return 'defend';
    return this._random(intents);
  }

  _defensive(intents, state, hp) {
    if (hp < 0.5) {
      if (intents.includes('defend')) return 'defend';
      if (intents.includes('dragonScale')) return 'dragonScale';
    }
    if (state.playerShield > 15 && (intents.includes('attack') || intents.includes('heavy'))) return 'attack';
    if (intents.includes('defend') || intents.includes('buff')) return 'defend';
    if (intents.includes('attack') || intents.includes('heavy')) return 'attack';
    return this._random(intents);
  }

  _control(intents, state) {
    if (intents.includes('curse')) return 'curse';
    if (intents.includes('debuff')) return 'debuff';
    if (state.enemyEnergy < 2 && intents.includes('buff')) return 'buff';
    if (intents.includes('attack')) return 'attack';
    return this._random(intents);
  }

  _boss(intents, state, hp) {
    if (this.specialAbility?.every > 0 && this._state.turnCount % this.specialAbility.every === 0) {
      const special = this._getSpecialIntent(intents);
      if (special) return special;
    }
    if (this._state.inSecondPhase) {
      if (intents.includes('heavy')) return 'heavy';
      if (intents.includes('attack')) return 'attack';
      if (intents.includes('multihit')) return 'multihit';
    }
    const seq = ['attack', 'defend', 'buff', 'attack', 'heavy'];
    const base = seq[(this._state.turnCount - 1) % seq.length];
    if (intents.includes(base)) return base;
    const alts = { attack: ['heavy', 'multihit'], defend: ['buff', 'dragonScale'], heavy: ['attack', 'multihit'], buff: ['defend', 'summon'] };
    for (const alt of alts[base] || []) if (intents.includes(alt)) return alt;
    return this._random(intents);
  }

  _getSpecialIntent(intents) {
    const specials = ['summon', 'dragonBreath', 'darkAura', 'soulSiphon', 'abyssalStrike'];
    return specials.find(s => intents.includes(s)) || null;
  }

  /** 评估手牌分数 */
  evaluateHand(hand, state) {
    return hand.map(card => ({ card, score: this._scoreCard(card, state) }));
  }

  _scoreCard(card, state) {
    let score = 0;
    const e = card.effect || {};
    switch (this.type) {
      case 'aggressive':
        if (e.damage) score += e.damage * 2;
        if (e.heavy || e.multihit) score += 15;
        if (state.enemyHp < state.enemyMaxHp * 0.3) score += 10;
        break;
      case 'defensive':
        if (e.block) score += e.block * 1.5;
        if (card.name.includes('护盾') || card.name.includes('防御')) score += 20;
        if (state.playerHp < state.playerMaxHp * 0.5 && e.block) score += 15;
        break;
      case 'control':
        if (e.vulnerableStacks || e.weakStacks || e.poisonStacks) score += 25;
        if (e.burnStacks) score += 20;
        break;
      case 'boss':
        if (e.summon || e.areaDamage) score += 30;
        if (this._state.inSecondPhase && e.damage) score += e.damage * 1.5;
        break;
    }
    score -= (card.cost || 0) * 3;
    return score;
  }

  getPreferredCard(scores) {
    if (!scores?.length) return null;
    scores.sort((a, b) => b.score - a.score);
    return scores[0].card;
  }

  shouldUseSpecialAbility(state) {
    return this.specialAbility && this._state.turnCount % this.specialAbility.every === 0;
  }

  getTypeName() {
    return { random: '随机', aggressive: '攻击优先', defensive: '防御优先', control: '消耗控制', boss: 'Boss' }[this.type] || this.type;
  }

  getState() { return { ...this._state, type: this.type, difficulty: this.difficulty, isSecondPhase: this._state.inSecondPhase }; }
}

if (typeof window !== 'undefined') {
  window.EnemyAI = EnemyAI;
}
if (typeof global !== 'undefined') {
  global.EnemyAI = EnemyAI;
}
if (typeof globalThis !== 'undefined') {
  globalThis.EnemyAI = EnemyAI;
}
