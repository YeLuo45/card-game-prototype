// ============================================================================
// Card Gacha/Summon System — V102 Direction V
// ============================================================================
// Spend in-game currency (gold/gems) to summon random cards.
// Multiple summon tiers: Single, Multi (×10), Premium.
// ============================================================================

'use strict';

class CardGachaEngine {
  constructor(config = {}) {
    this.currency = { gold: config.gold ?? 1000, gems: config.gems ?? 50 };
    this.summonTypes = config.summonTypes || [
      { id: 'basic', name: 'Basic Summon', cost: 100, currency: 'gold', pity: 10 },
      { id: 'premium', name: 'Premium Summon', cost: 30, currency: 'gems', pity: 10 },
      { id: 'legendary', name: 'Legendary Summon', cost: 100, currency: 'gems', pity: 10 }
    ];
    this.rates = config.rates || {
      basic: { common: 0.6, uncommon: 0.3, rare: 0.09, epic: 0.01 },
      premium: { common: 0.4, uncommon: 0.35, rare: 0.20, epic: 0.04, legendary: 0.01 },
      legendary: { common: 0.1, uncommon: 0.2, rare: 0.35, epic: 0.25, legendary: 0.10 }
    };
    this.pityCounters = {}; // summonType → count since last rarity
    this.summonHistory = [];
    this.totalSummons = 0;
  }

  getCurrency() {
    return { ...this.currency };
  }

  spendCurrency(type, amount) {
    if (this.currency[type] >= amount) {
      this.currency[type] -= amount;
      return true;
    }
    return false;
  }

  addCurrency(type, amount) {
    this.currency[type] = (this.currency[type] || 0) + amount;
  }

  _rollRarity(summonType) {
    const rates = this.rates[summonType];
    const rand = Math.random();
    let cumulative = 0;
    for (const [rarity, prob] of Object.entries(rates)) {
      cumulative += prob;
      if (rand < cumulative) return rarity;
    }
    return 'common';
  }

  _getPity(summonType) {
    const pityThreshold = this.summonTypes.find(s => s.id === summonType)?.pity || 10;
    return this.pityCounters[summonType] || 0;
  }

  _incrementPity(summonType) {
    this.pityCounters[summonType] = (this.pityCounters[summonType] || 0) + 1;
  }

  _checkPity(summonType, rolledRarity) {
    const pityThreshold = this.summonTypes.find(s => s.id === summonType)?.pity || 10;
    const pityCounter = this.pityCounters[summonType] || 0;
    if (pityCounter >= pityThreshold && rolledRarity !== 'legendary') {
      this.pityCounters[summonType] = 0;
      return this.rates[summonType].legendary ? 'legendary' : 'epic';
    }
    return rolledRarity;
  }

  summon(summonTypeId, count = 1) {
    const summonType = this.summonTypes.find(s => s.id === summonTypeId);
    if (!summonType) return { error: 'invalid_summon_type' };
    if (count !== 1 && count !== 10) return { error: 'invalid_count' };
    if (!this.spendCurrency(summonType.currency, summonType.cost * count)) {
      return { error: 'insufficient_currency' };
    }

    const results = [];
    for (let i = 0; i < count; i++) {
      const rolledRarity = this._rollRarity(summonTypeId);
      const rarity = this._checkPity(summonTypeId, rolledRarity);
      this._incrementPity(summonTypeId);
      this.totalSummons++;
      results.push({ rarity, pity: this._getPity(summonTypeId) });
      this.summonHistory.push({ summonType: summonTypeId, rarity, timestamp: Date.now() });
    }
    return { results, currency: this.getCurrency(), totalSummons: this.totalSummons };
  }

  getRates(summonTypeId) {
    return { ...this.rates[summonTypeId] };
  }

  getPityCounter(summonTypeId) {
    return this._getPity(summonTypeId);
  }

  getHistory(count = 10) {
    return this.summonHistory.slice(-count);
  }

  getTotalSummons() {
    return this.totalSummons;
  }
}

class GachaInventory {
  constructor() {
    this.ownedCards = new Map(); // cardId → count
    this.rarityCounts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    this.totalGachaPulls = 0;
  }

  addCard(cardId, rarity, count = 1) {
    const prev = this.ownedCards.get(cardId) || 0;
    this.ownedCards.set(cardId, prev + count);
    this.rarityCounts[rarity] = (this.rarityCounts[rarity] || 0) + count;
    this.totalGachaPulls += count;
  }

  getCardCount(cardId) {
    return this.ownedCards.get(cardId) || 0;
  }

  hasCard(cardId) {
    return this.ownedCards.has(cardId);
  }

  getAllCards() {
    return Array.from(this.ownedCards.entries()).map(([id, count]) => ({ cardId: id, count }));
  }

  getRarityCounts() {
    return { ...this.rarityCounts };
  }

  getTotalPulls() {
    return this.totalGachaPulls;
  }
}

class GachaPanel {
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
    this.panel.id = 'gacha-panel';
    this.panel.style.cssText = [
      'position:fixed;bottom:80px;right:20px;width:300px;background:rgba(20,10,40,0.95);',
      'border:2px solid #e74c3c;border-radius:12px;padding:16px;z-index:9997;',
      'font-family:monospace;font-size:13px;color:#ecf0f1;'
    ].join('');
    this.panel.innerHTML = '<div style="color:#e74c3c;font-weight:bold;margin-bottom:8px;">🎰 卡牌召唤</div>';
    document.body.appendChild(this.panel);
  }

  getStats() {
    const currency = this.engine.getCurrency();
    return {
      open: this.isOpen,
      currency,
      totalSummons: this.engine.getTotalSummons(),
      totalGachaPulls: this.inventory.getTotalPulls(),
      pityCounters: { ...this.engine.pityCounters }
    };
  }
}

const GachaTools = {
  'gacha.summon': {
    description: 'Perform a card summon (1 or 10)',
    parameters: {
      type: 'object',
      properties: { summonType: { type: 'string' }, count: { type: 'number' } },
      required: ['summonType', 'count']
    },
    handler(args, context) {
      const engine = new CardGachaEngine();
      return engine.summon(args.summonType, args.count);
    }
  },
  'gacha.currency': {
    description: 'Check current gacha currency',
    parameters: { type: 'object', properties: {} },
    handler() {
      const engine = new CardGachaEngine();
      return engine.getCurrency();
    }
  },
  'gacha.rates': {
    description: 'Get summon rates for a type',
    parameters: { type: 'object', properties: { summonType: { type: 'string' } } },
    handler(args) {
      const engine = new CardGachaEngine();
      return engine.getRates(args.summonType);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardGachaEngine, GachaInventory, GachaPanel, GachaTools };
}
if (typeof window !== 'undefined') {
  window.CardGachaEngine = CardGachaEngine;
  window.GachaInventory = GachaInventory;
  window.GachaPanel = GachaPanel;
  window.GachaTools = GachaTools;
}