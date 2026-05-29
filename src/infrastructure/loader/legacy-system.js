// ============================================================================
// Card Legacy System — V106 Direction Z
// ============================================================================
// Cards pass down XP/stats to new game+ copies via self-evolution.
// Integrates generic-agent self-evolution + thunderbolt persistence.
// ============================================================================

'use strict';

class LegacyCard {
  constructor(baseCard, sourceCardId = null, generation = 1) {
    this.id = 'legacy_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    this.baseCard = baseCard;
    this.sourceCardId = sourceCardId;
    this.generation = generation;
    this.inheritedStats = {};
    this.legacyPower = 0;
    this.legacyBonuses = {};
  }

  applyLegacy(stats) {
    const result = { ...this.baseCard };
    for (const [key, val] of Object.entries(stats)) {
      if (typeof val === 'number' && result[key] !== undefined) {
        result[key] = Math.round(result[key] + val * 0.5);
      }
    }
    return result;
  }
}

class LegacyRegistry {
  constructor() {
    this.legacyCards = this._load();
    this.hooks = [];
    this._xpCache = new Map();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('legacy_cards') : null;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('legacy_cards', JSON.stringify(this.legacyCards));
    }
  }

  _emit(event, data) {
    for (const h of this.hooks) { try { h(event, data); } catch {} }
  }

  registerCard(baseCard) {
    const legacyCard = new LegacyCard(baseCard);
    this.legacyCards[baseCard.id] = legacyCard;
    this._save();
    this._emit('card_registered', { cardId: baseCard.id });
    return legacyCard;
  }

  inheritLegacy(sourceCardId, newCardId, inheritedStats) {
    const source = this.legacyCards[sourceCardId];
    if (!source) return null;
    const legacy = new LegacyCard(source.baseCard, sourceCardId, source.generation + 1);
    legacy.inheritedStats = inheritedStats;
    legacy.legacyPower = source.legacyPower + this._calcLegacyPower(inheritedStats);
    legacy.legacyBonuses = this._mergeBonuses(source.legacyBonuses, inheritedStats);
    this.legacyCards[newCardId] = legacy;
    this._save();
    this._emit('legacy_inherited', { sourceId: sourceCardId, newId: newCardId, generation: legacy.generation });
    return legacy;
  }

  _calcLegacyPower(stats) {
    return Object.values(stats).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
  }

  _mergeBonuses(existing, incoming) {
    const merged = { ...existing };
    for (const [k, v] of Object.entries(incoming)) {
      merged[k] = (merged[k] || 0) + v;
    }
    return merged;
  }

  getLegacyCard(cardId) { return this.legacyCards[cardId] || null; }

  getLegacyLineage(cardId) {
    const lineage = [];
    let current = this.legacyCards[cardId];
    while (current) {
      lineage.push({ id: current.id, generation: current.generation, legacyPower: current.legacyPower });
      current = current.sourceCardId ? this.legacyCards[current.sourceCardId] : null;
    }
    return lineage;
  }

  getStats() {
    const cards = Object.values(this.legacyCards);
    return {
      totalCards: cards.length,
      totalGenerations: cards.reduce((max, c) => Math.max(max, c.generation), 0),
      averageLegacyPower: cards.length > 0 ? Math.round(cards.reduce((s, c) => s + c.legacyPower, 0) / cards.length) : 0,
      maxLegacyPower: cards.length > 0 ? Math.max(...cards.map(c => c.legacyPower)) : 0
    };
  }

  clear() {
    this.legacyCards = {};
    this._save();
    this._emit('registry_cleared', {});
  }
}

// ---- LegacyTools (nanobot pattern) ----
const LegacyTools = {
  'legacy.register': {
    description: 'Register a card in the legacy system',
    parameters: { type: 'object', properties: { card: { type: 'object' } }, required: ['card'] },
    handler(args) {
      const registry = new LegacyRegistry();
      return registry.registerCard(args.card);
    }
  },
  'legacy.inherit': {
    description: 'Inherit legacy from one card to another',
    parameters: { type: 'object', properties: { sourceId: { type: 'string' }, newId: { type: 'string' }, inheritedStats: { type: 'object' } }, required: ['sourceId', 'newId', 'inheritedStats'] },
    handler(args) {
      const registry = new LegacyRegistry();
      return registry.inheritLegacy(args.sourceId, args.newId, args.inheritedStats);
    }
  },
  'legacy.lineage': {
    description: 'Get the legacy lineage of a card',
    parameters: { type: 'object', properties: { cardId: { type: 'string' } }, required: ['cardId'] },
    handler(args) {
      const registry = new LegacyRegistry();
      return registry.getLegacyLineage(args.cardId);
    }
  },
  'legacy.stats': {
    description: 'Get legacy system statistics',
    parameters: { type: 'object', properties: {} },
    handler(args) {
      const registry = new LegacyRegistry();
      return registry.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LegacyCard, LegacyRegistry, LegacyTools };
}
if (typeof window !== 'undefined') {
  window.LegacyCard = LegacyCard;
  window.LegacyRegistry = LegacyRegistry;
  window.LegacyTools = LegacyTools;
}