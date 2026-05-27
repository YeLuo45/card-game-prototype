// ============================================================================
// Card Evolution System — V101 Direction U
// ============================================================================
// Cards auto-evolve by gaining XP from battles. Each card has an XP bar,
// and upon reaching thresholds, evolves into stronger versions.
// ============================================================================

'use strict';

class CardEvolutionEngine {
  constructor(config = {}) {
    this.xpPerWin = config.xpPerWin || 30;
    this.xpPerLoss = config.xpPerLoss || 10;
    this.xpPerDamageDealt = config.xpPerDamageDealt || 0.5;
    this.xpPerBlock = config.xpPerBlock || 0.3;
    this.evolutionTiers = config.evolutionTiers || [
      { xp: 0,    name: 'I',   statBonus: 0 },
      { xp: 100,  name: 'II',  statBonus: 0.1 },
      { xp: 250,  name: 'III', statBonus: 0.2 },
      { xp: 500,  name: 'IV',  statBonus: 0.35 },
      { xp: 1000, name: 'V',   statBonus: 0.5 }
    ];
    this.totalEvolutions = 0;
  }

  // Award XP to a card after a game
  awardXP(card, gameResult) {
    if (!card || !card.id) return null;
    const result = {
      xpGained: 0,
      previousXP: card.evolutionXP || 0,
      newXP: card.evolutionXP || 0
    };

    if (gameResult.outcome === 'win') {
      result.xpGained += this.xpPerWin;
    } else if (gameResult.outcome === 'loss') {
      result.xpGained += this.xpPerLoss;
    }

    if (gameResult.damageDealt) {
      result.xpGained += Math.floor(gameResult.damageDealt * this.xpPerDamageDealt);
    }
    if (gameResult.blockGenerated) {
      result.xpGained += Math.floor(gameResult.blockGenerated * this.xpPerBlock);
    }

    result.newXP += result.xpGained;
    return result;
  }

  // Check if card should evolve
  checkEvolution(card) {
    const xp = card.evolutionXP || 0;
    const currentTier = this.getTier(card);
    const nextTier = this.evolutionTiers[currentTier + 1];
    if (!nextTier) return { shouldEvolve: false, reason: 'max_tier' };

    if (xp >= nextTier.xp) {
      return { shouldEvolve: true, currentTier, nextTier };
    }
    return { shouldEvolve: false, reason: 'xp_insufficient' };
  }

  // Execute evolution
  evolve(card) {
    // For pre-evolved cards (with explicit evolutionTier), advance tier directly
    if (card.evolutionTier != null) {
      const currentTierIndex = Math.min(card.evolutionTier - 1, this.evolutionTiers.length - 2);
      const nextTier = this.evolutionTiers[currentTierIndex + 1];
      if (!nextTier) return null; // already at max tier
      const bonus = nextTier.statBonus;
      this.totalEvolutions++;
      return {
        ...card,
        evolutionXP: 0,
        evolutionTier: card.evolutionTier + 1,
        evolutionName: `${card.name}[${nextTier.name}]`,
        damage: card.damage ? Math.round(card.damage * (1 + bonus)) : undefined,
        block: card.block ? Math.round(card.block * (1 + bonus)) : undefined,
        cost: card.cost ? Math.max(1, card.cost + (bonus > 0.3 ? 1 : 0)) : undefined,
        cardDraw: card.cardDraw ? card.cardDraw + (bonus > 0.4 ? 1 : 0) : undefined,
        description: card.description ? `${card.description} [进化${nextTier.name}]` : `[进化${nextTier.name}]`,
        tags: [...(card.tags || []), `evolved_tier_${card.evolutionTier + 1}`]
      };
    }

    // For XP-based evolution
    const check = this.checkEvolution(card);
    if (!check.shouldEvolve) return null;

    const currentTierData = this.evolutionTiers[check.currentTier];
    const nextTier = check.nextTier;
    const bonus = nextTier.statBonus;

    this.totalEvolutions++;
    const evolved = {
      ...card,
      evolutionXP: 0, // reset XP bar after evolution
      evolutionTier: check.currentTier + 2,
      evolutionName: `${card.name}[${nextTier.name}]`,
      damage: card.damage ? Math.round(card.damage * (1 + bonus)) : undefined,
      block: card.block ? Math.round(card.block * (1 + bonus)) : undefined,
      cost: card.cost ? Math.max(1, card.cost + (bonus > 0.3 ? 1 : 0)) : undefined,
      cardDraw: card.cardDraw ? card.cardDraw + (bonus > 0.4 ? 1 : 0) : undefined,
      description: card.description ? `${card.description} [进化${nextTier.name}]` : `[进化${nextTier.name}]`,
      tags: [...(card.tags || []), `evolved_tier_${check.currentTier + 2}`]
    };
    return evolved;
  }

  getTier(card) {
    // If card was already evolved, use evolutionTier - 1 (tier index)
    if (card.evolutionTier != null) {
      return Math.min((card.evolutionTier || 1) - 1, this.evolutionTiers.length - 1);
    }
    const xp = card.evolutionXP || 0;
    for (let i = this.evolutionTiers.length - 1; i >= 0; i--) {
      if (xp >= this.evolutionTiers[i].xp) return i;
    }
    return 0;
  }

  getXPProgress(card) {
    const xp = card.evolutionXP || 0;
    const tier = this.getTier(card);
    const currentThreshold = this.evolutionTiers[tier].xp;
    const nextThreshold = this.evolutionTiers[tier + 1]
      ? this.evolutionTiers[tier + 1].xp
      : currentThreshold;
    const progress = nextThreshold > currentThreshold
      ? (xp - currentThreshold) / (nextThreshold - currentThreshold)
      : 1;
    return {
      xp,
      tier: this.evolutionTiers[tier].name,
      progress: Math.min(progress, 1),
      nextTier: this.evolutionTiers[tier + 1]?.name || null
    };
  }

  getStatMultiplier(tierIndex) {
    return this.evolutionTiers[tierIndex]?.statBonus || 0;
  }
}

class CardEvolutionInventory {
  constructor() {
    this.cardXP = new Map();    // cardId → { xp, tier, lastUpdated }
    this.evolutionHistory = [];
  }

  addXP(cardId, xp) {
    const current = this.cardXP.get(cardId) || { xp: 0, tier: 0 };
    const newXP = current.xp + xp;
    const tier = this._calcTier(newXP);
    this.cardXP.set(cardId, { xp: newXP, tier, lastUpdated: Date.now() });
    return { xp: newXP, tier };
  }

  getXP(cardId) {
    return this.cardXP.get(cardId) || { xp: 0, tier: 0 };
  }

  getAllCards() {
    return Array.from(this.cardXP.entries()).map(([id, data]) => ({ cardId: id, ...data }));
  }

  _calcTier(xp) {
    const thresholds = [0, 100, 250, 500, 1000];
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (xp >= thresholds[i]) return i;
    }
    return 0;
  }
}

class EvolutionPanel {
  constructor(engine, inventory) {
    this.engine = engine;
    this.inventory = inventory;
    this.isOpen = false;
    this.panel = null;
  }

  open() { this.isOpen = true; this._render(); }
  close() { this.isOpen = false; if (this.panel) { this.panel.remove(); this.panel = null; } }
  toggle() { if (this.isOpen) this.close(); else this.open(); }

  _render() {
    if (typeof document === 'undefined') return;
    this.panel = document.createElement('div');
    this.panel.id = 'evolution-panel';
    this.panel.style.cssText = [
      'position:fixed;bottom:80px;right:20px;width:300px;background:rgba(10,25,10,0.95);',
      'border:2px solid #2ecc71;border-radius:12px;padding:16px;z-index:9998;',
      'font-family:monospace;font-size:13px;color:#ecf0f1;'
    ].join('');
    this.panel.innerHTML = '<div style="color:#2ecc71;font-weight:bold;margin-bottom:8px;">🌱 卡牌进化</div>';
    document.body.appendChild(this.panel);
  }

  getStats() {
    const cards = this.inventory.getAllCards();
    return {
      open: this.isOpen,
      trackedCards: cards.length,
      evolutions: this.engine.totalEvolutions,
      xpProgress: cards.map(c => ({ cardId: c.cardId, xp: c.xp, tier: c.tier }))
    };
  }
}

const EvolutionTools = {
  'evolution.check': {
    description: 'Check if a card should evolve',
    parameters: { type: 'object', properties: { card: { type: 'object' } }, required: ['card'] },
    handler(args) {
      const engine = new CardEvolutionEngine();
      return engine.checkEvolution(args.card);
    }
  },
  'evolution.evolve': {
    description: 'Evolve a card to its next tier',
    parameters: { type: 'object', properties: { card: { type: 'object' } }, required: ['card'] },
    handler(args) {
      const engine = new CardEvolutionEngine();
      return engine.evolve(args.card) || { error: 'cannot_evolve' };
    }
  },
  'evolution.award': {
    description: 'Award XP to a card after a game',
    parameters: { type: 'object', properties: { card: { type: 'object' }, result: { type: 'object' } }, required: ['card', 'result'] },
    handler(args) {
      const engine = new CardEvolutionEngine();
      return engine.awardXP(args.card, args.result);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardEvolutionEngine, CardEvolutionInventory, EvolutionPanel, EvolutionTools };
}
if (typeof window !== 'undefined') {
  window.CardEvolutionEngine = CardEvolutionEngine;
  window.CardEvolutionInventory = CardEvolutionInventory;
  window.EvolutionPanel = EvolutionPanel;
  window.EvolutionTools = EvolutionTools;
}