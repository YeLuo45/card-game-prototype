// ============================================================================
// Card Evolution System — V122 Direction P
// ============================================================================
// Cards auto-evolve via XP and tier thresholds.
// Inspired by: thunderbolt offline-first (evolution state persistence) +
// generic-agent L0-L4 (evolution tree, tier preferences).
// ============================================================================

'use strict';

class CardEvolution {
  constructor(cardId, initialTier) {
    this.cardId = cardId;
    this.tier = initialTier || 1; // 1-5
    this.xp = 0;
    this.evolveHistory = []; // [{fromTier, toTier, at}]
  }

  addXP(amount) {
    this.xp += amount;
    const nextTier = this._calcNextTier();
    if (nextTier > this.tier) {
      this._evolve(nextTier);
    }
  }

  _calcNextTier() {
    const thresholds = { 2: 100, 3: 300, 4: 600, 5: 1000 };
    let t = this.tier;
    for (const [tr, xp] of Object.entries(thresholds)) {
      if (parseInt(tr) > this.tier && this.xp >= xp) t = parseInt(tr);
    }
    return t;
  }

  _evolve(newTier) {
    this.evolveHistory.push({ fromTier: this.tier, toTier: newTier, at: Date.now() });
    this.tier = newTier;
  }

  getTier() { return this.tier; }
  getXP() { return this.xp; }
  getStats() { return { tier: this.tier, xp: this.xp, evolveCount: this.evolveHistory.length }; }
}

class CardEvolutionSystem {
  constructor() {
    this.evolutions = new Map(); // cardId → CardEvolution
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('card_evolution') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [cid, edata] of Object.entries(data.evolutions || {})) {
          const ev = new CardEvolution(cid, edata.tier || 1);
          ev.xp = edata.xp || 0;
          ev.evolveHistory = edata.evolveHistory || [];
          this.evolutions.set(cid, ev);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        evolutions: Object.fromEntries(Array.from(this.evolutions.entries()).map(([k, v]) => [k, { tier: v.tier, xp: v.xp, evolveHistory: v.evolveHistory }]))
      };
      localStorage.setItem('card_evolution', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  evolveCard(cardId, xpAmount) {
    if (!this.evolutions.has(cardId)) {
      this.evolutions.set(cardId, new CardEvolution(cardId, 1));
    }
    const ev = this.evolutions.get(cardId);
    const prevTier = ev.getTier();
    ev.addXP(xpAmount);
    const newTier = ev.getTier();
    this._save();
    this._emit('card_evolved', { cardId, fromTier: prevTier, toTier: newTier });
    return { cardId, prevTier, newTier, xp: ev.getXP(), tier: newTier };
  }

  getEvolution(cardId) {
    if (!this.evolutions.has(cardId)) return null;
    return this.evolutions.get(cardId);
  }

  getAllEvolutions() { return Array.from(this.evolutions.values()); }

  getStats() {
    let totalEv = 0;
    for (const ev of this.evolutions.values()) totalEv += ev.evolveHistory.length;
    return { totalCards: this.evolutions.size, totalEvolutions: totalEv };
  }
}

const CardEvolutionTools = {
  'evolution.evolve': {
    description: 'Add XP to evolve a card',
    parameters: { type: 'object', properties: { cardId: { type: 'string' }, xp: { type: 'number' } }, required: ['cardId', 'xp'] },
    handler(args) {
      if (!window._cardEvolution) window._cardEvolution = new CardEvolutionSystem();
      return window._cardEvolution.evolveCard(args.cardId, args.xp);
    }
  },
  'evolution.get': {
    description: 'Get card evolution state',
    parameters: { type: 'object', properties: { cardId: { type: 'string' } }, required: ['cardId'] },
    handler(args) {
      if (!window._cardEvolution) return { error: 'not_found' };
      const ev = window._cardEvolution.getEvolution(args.cardId);
      return ev ? ev.getStats() : { error: 'not_found' };
    }
  },
  'evolution.stats': {
    description: 'Get evolution stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._cardEvolution) window._cardEvolution = new CardEvolutionSystem();
      return window._cardEvolution.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardEvolution, CardEvolutionSystem, CardEvolutionTools };
}
if (typeof window !== 'undefined') {
  window.CardEvolution = CardEvolution;
  window.CardEvolutionSystem = CardEvolutionSystem;
  window.CardEvolutionTools = CardEvolutionTools;
}