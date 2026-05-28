// ============================================================================
// Card Studio Pro — V133 Direction A
// ============================================================================
// Advanced deck builder with mana curve analysis, AI suggestions, card synergy detection.
// nanobot tool registry + chatdev multi-agent (mana curve agent, synergy agent).
// ============================================================================

'use strict';

class ManaCurveAnalyzer {
  constructor() {
    this.curves = [
      { name: 'Aggro', minCurve: [0, 3, 4, 2, 1, 0, 0], maxCurve: [2, 5, 5, 3, 1, 1, 0] },
      { name: 'Midrange', minCurve: [0, 1, 2, 3, 3, 1, 0], maxCurve: [1, 3, 4, 4, 3, 2, 0] },
      { name: 'Control', minCurve: [0, 0, 1, 2, 3, 2, 2], maxCurve: [2, 2, 3, 4, 4, 3, 3] },
    ];
  }

  analyzeManaCurve(deck) {
    const curve = [0, 0, 0, 0, 0, 0, 0];
    for (const card of deck) {
      const cost = Math.min(card.cost || 0, 6);
      curve[cost]++;
    }
    return curve;
  }

  matchArchetype(curve) {
    for (const arch of this.curves) {
      let match = true;
      for (let i = 0; i < 7; i++) {
        if (curve[i] < arch.minCurve[i] || curve[i] > arch.maxCurve[i]) {
          match = false; break;
        }
      }
      if (match) return arch.name;
    }
    return 'Hybrid';
  }

  getManaCurveScore(curve) {
    const avgCost = curve.reduce((s, c, i) => s + c * i, 0) / (curve.reduce((s, c) => s + c, 1));
    return { avgCost: avgCost.toFixed(2), curve };
  }
}

class SynergyDetector {
  constructor() {
    this.synergyRules = [
      { cards: ['fireball', 'flame strike'], bonus: 15, label: 'Fire Combo' },
      { cards: ['lightning', 'storm'], bonus: 12, label: 'Lightning Chain' },
      { cards: ['heal', 'shield'], bonus: 10, label: 'Defense Sync' },
      { cards: ['draw', 'cycle'], bonus: 8, label: 'Card Advantage' },
    ];
  }

  detect(deck) {
    const cardIds = new Set(deck.map(c => c.id));
    const found = [];
    for (const rule of this.synergyRules) {
      const matches = rule.cards.filter(cid => cardIds.has(cid));
      if (matches.length >= 2) {
        found.push({ label: rule.label, cards: matches, bonus: rule.bonus });
      }
    }
    return found;
  }

  getSynergyScore(deck) {
    const synergies = this.detect(deck);
    return synergies.reduce((s, syn) => s + syn.bonus, 0);
  }
}

class DeckBuilderPro {
  constructor() {
    this.savedDecks = new Map(); // deckId → DeckData
    this.hooks = [];
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('deck_builder_pro') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [did, ddata] of Object.entries(data)) {
          this.savedDecks.set(did, ddata);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = Object.fromEntries(this.savedDecks.entries());
      localStorage.setItem('deck_builder_pro', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  createDeck(deckId, name, description, cards) {
    const deck = {
      deckId, name, description, cards,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { wins: 0, losses: 0, games: 0 },
      tags: [],
      version: 1
    };
    this.savedDecks.set(deckId, deck);
    this._save();
    this._emit('deck_created', { deckId, name });
    return deck;
  }

  updateDeck(deckId, updates) {
    const deck = this.savedDecks.get(deckId);
    if (!deck) return { error: 'deck_not_found' };
    Object.assign(deck, updates, { updatedAt: Date.now(), version: deck.version + 1 });
    this._save();
    return deck;
  }

  deleteDeck(deckId) {
    if (this.savedDecks.has(deckId)) {
      this.savedDecks.delete(deckId);
      this._save();
      return { success: true };
    }
    return { error: 'deck_not_found' };
  }

  getDeck(deckId) { return this.savedDecks.get(deckId) || null; }

  analyzeDeck(deckId) {
    const deck = this.savedDecks.get(deckId);
    if (!deck) return { error: 'deck_not_found' };
    return this.analyzeDeckCards(deck.cards);
  }

  analyzeDeckCards(cards) {
    const analyzer = new ManaCurveAnalyzer();
    const synergy = new SynergyDetector();
    const curve = analyzer.analyzeManaCurve(cards);
    const archetype = analyzer.matchArchetype(curve);
    const curveInfo = analyzer.getManaCurveScore(curve);
    const synergies = synergy.detect(cards);
    const synergyScore = synergy.getSynergyScore(cards);
    const avgCost = parseFloat(curveInfo.avgCost);

    const suggestions = [];
    if (avgCost > 4) suggestions.push('High average cost — consider more early-game cards');
    if (avgCost < 2) suggestions.push('Very low cost — you may lack late-game power');
    if (synergies.length === 0) suggestions.push('No strong synergies detected — add more combo cards');
    if (curve[0] < 2) suggestions.push('No 0-cost cards — you may miss early tempo');
    if (curve[6] > 2) suggestions.push('Many high-cost cards — ensure you can survive to late game');

    return {
      deckId: cards.deckId || 'unknown',
      cardCount: cards.length,
      curve,
      archetype,
      avgCost,
      synergies,
      synergyScore,
      suggestions
    };
  }

  listDecks(playerId, limit) {
    return Array.from(this.savedDecks.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit || 20)
      .map(d => ({ deckId: d.deckId, name: d.name, cardCount: d.cards.length, updatedAt: d.updatedAt }));
  }

  getTopDecks(limit) {
    return Array.from(this.savedDecks.values())
      .filter(d => d.stats.games >= 5)
      .sort((a, b) => (b.stats.wins / b.stats.games) - (a.stats.wins / a.stats.games))
      .slice(0, limit || 10)
      .map(d => ({ deckId: d.deckId, name: d.name, winRate: (d.stats.wins / d.stats.games * 100).toFixed(1) + '%', games: d.stats.games }));
  }
}

const DeckBuilderTools = {
  'deck.create': {
    description: 'Create a new deck',
    parameters: { type: 'object', properties: { deckId: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, cards: { type: 'array' } }, required: ['deckId', 'name', 'cards'] },
    handler(args) {
      if (!window._deckBuilderPro) window._deckBuilderPro = new DeckBuilderPro();
      return window._deckBuilderPro.createDeck(args.deckId, args.name, args.description || '', args.cards);
    }
  },
  'deck.analyze': {
    description: 'Analyze deck composition',
    parameters: { type: 'object', properties: { deckId: { type: 'string' } }, required: ['deckId'] },
    handler(args) {
      if (!window._deckBuilderPro) return { error: 'not_init' };
      return window._deckBuilderPro.analyzeDeck(args.deckId);
    }
  },
  'deck.list': {
    description: 'List saved decks',
    parameters: { type: 'object', properties: { limit: { type: 'number' } } },
    handler(args) {
      if (!window._deckBuilderPro) window._deckBuilderPro = new DeckBuilderPro();
      return window._deckBuilderPro.listDecks('default', args.limit);
    }
  },
  'deck.top': {
    description: 'Get top performing decks',
    parameters: { type: 'object', properties: { limit: { type: 'number' } } },
    handler(args) {
      if (!window._deckBuilderPro) window._deckBuilderPro = new DeckBuilderPro();
      return window._deckBuilderPro.getTopDecks(args.limit);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ManaCurveAnalyzer, SynergyDetector, DeckBuilderPro, DeckBuilderTools };
}
if (typeof window !== 'undefined') {
  window.ManaCurveAnalyzer = ManaCurveAnalyzer;
  window.SynergyDetector = SynergyDetector;
  window.DeckBuilderPro = DeckBuilderPro;
  window.DeckBuilderTools = DeckBuilderTools;
}