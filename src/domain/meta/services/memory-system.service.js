// ============================================================================
// Card Memory System — V123 Direction Q
// ============================================================================
// Persistent memory: card play history, win rate tracking, deck preferences,
// tag-based card queries, favorite cards. ThunderBolt offline-first +
// generic-agent L0-L4 (user preferences, play history, tag corpus).
// ============================================================================

'use strict';

class CardPlayRecord {
  constructor(cardId, timestamp, outcome, deckId, opponentDeckId) {
    this.cardId = cardId;
    this.timestamp = timestamp || Date.now();
    this.outcome = outcome; // 'win' | 'loss' | 'draw'
    this.deckId = deckId || null;
    this.opponentDeckId = opponentDeckId || null;
  }
}

class CardMemorySystem {
  constructor() {
    this.playHistory = []; // CardPlayRecord[]
    this.deckMemories = new Map(); // deckId → { name, tag, wins, losses, matches }
    this.cardStats = new Map(); // cardId → { plays, wins, losses, tags }
    this.tagIndex = new Map(); // tag → Set<cardId>
    this.favoriteCards = new Set(); // cardId
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('card_memory') : null;
      if (raw) {
        const data = JSON.parse(raw);
        this.playHistory = (data.playHistory || []).map(r => new CardPlayRecord(r.cardId, r.timestamp, r.outcome, r.deckId, r.opponentDeckId));
        for (const [k, v] of Object.entries(data.deckMemories || {})) {
          this.deckMemories.set(k, v);
        }
        for (const [k, v] of Object.entries(data.cardStats || {})) {
          this.cardStats.set(k, v);
        }
        for (const [k, v] of Object.entries(data.tagIndex || {})) {
          this.tagIndex.set(k, new Set(v));
        }
        this.favoriteCards = new Set(data.favoriteCards || []);
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        playHistory: this.playHistory.map(r => ({ cardId: r.cardId, timestamp: r.timestamp, outcome: r.outcome, deckId: r.deckId, opponentDeckId: r.opponentDeckId })),
        deckMemories: Object.fromEntries(this.deckMemories.entries()),
        cardStats: Object.fromEntries(Array.from(this.cardStats.entries()).map(([k, v]) => [k, { plays: v.plays, wins: v.wins, losses: v.losses, tags: v.tags }])),
        tagIndex: Object.fromEntries(Array.from(this.tagIndex.entries()).map(([k, v]) => [k, Array.from(v)])),
        favoriteCards: Array.from(this.favoriteCards)
      };
      localStorage.setItem('card_memory', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  recordPlay(cardId, outcome, deckId, opponentDeckId) {
    const record = new CardPlayRecord(cardId, Date.now(), outcome, deckId, opponentDeckId);
    this.playHistory.push(record);

    // Update card stats
    if (!this.cardStats.has(cardId)) this.cardStats.set(cardId, { plays: 0, wins: 0, losses: 0, tags: [] });
    const cs = this.cardStats.get(cardId);
    cs.plays++;
    if (outcome === 'win') cs.wins++;
    else if (outcome === 'loss') cs.losses++;

    this._save();
    this._emit('play_recorded', { cardId, outcome });
    return { recorded: true, totalPlays: cs.plays };
  }

  tagCard(cardId, tag) {
    if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
    this.tagIndex.get(tag).add(cardId);

    if (!this.cardStats.has(cardId)) this.cardStats.set(cardId, { plays: 0, wins: 0, losses: 0, tags: [] });
    const cs = this.cardStats.get(cardId);
    if (!cs.tags.includes(tag)) cs.tags.push(tag);

    this._save();
    this._emit('card_tagged', { cardId, tag });
    return { success: true };
  }

  getCardsByTag(tag) {
    const ids = this.tagIndex.get(tag);
    if (!ids) return [];
    return Array.from(ids).map(id => ({ cardId: id, stats: this.cardStats.get(id) || null }));
  }

  setFavorite(cardId, favorite) {
    if (favorite) this.favoriteCards.add(cardId);
    else this.favoriteCards.delete(cardId);
    this._save();
    return { favorite: this.favoriteCards.has(cardId) };
  }

  getCardStats(cardId) {
    const cs = this.cardStats.get(cardId);
    if (!cs) return null;
    const winRate = cs.plays > 0 ? cs.wins / cs.plays : 0;
    return { plays: cs.plays, wins: cs.wins, losses: cs.losses, winRate: Math.round(winRate * 100) / 100, tags: cs.tags };
  }

  getPlayHistory(cardId, limit) {
    const filtered = this.playHistory.filter(r => r.cardId === cardId);
    return filtered.slice(-limit || 20);
  }

  getTopCards(metric, limit) {
    // metric: 'plays' | 'wins' | 'winRate'
    const cards = Array.from(this.cardStats.entries()).map(([id, cs]) => ({ cardId: id, ...cs }));
    if (metric === 'winRate') {
      cards.sort((a, b) => (b.wins / (b.plays || 1)) - (a.wins / (a.plays || 1)));
    } else {
      cards.sort((a, b) => b[metric] - a[metric]);
    }
    return cards.slice(0, limit || 10);
  }

  getStats() {
    const totalPlays = this.playHistory.length;
    const totalWins = this.playHistory.filter(r => r.outcome === 'win').length;
    const totalTags = this.tagIndex.size;
    return { totalPlays, totalWins, totalLosses: this.playHistory.filter(r => r.outcome === 'loss').length, totalTags, totalFavorites: this.favoriteCards.size };
  }
}

const CardMemoryTools = {
  'memory.record': {
    description: 'Record a card play result',
    parameters: { type: 'object', properties: { cardId: { type: 'string' }, outcome: { type: 'string' }, deckId: { type: 'string' } }, required: ['cardId', 'outcome'] },
    handler(args) {
      if (!window._cardMemory) window._cardMemory = new CardMemorySystem();
      return window._cardMemory.recordPlay(args.cardId, args.outcome, args.deckId);
    }
  },
  'memory.tag': {
    description: 'Tag a card',
    parameters: { type: 'object', properties: { cardId: { type: 'string' }, tag: { type: 'string' } }, required: ['cardId', 'tag'] },
    handler(args) {
      if (!window._cardMemory) return { error: 'not_init' };
      return window._cardMemory.tagCard(args.cardId, args.tag);
    }
  },
  'memory.top': {
    description: 'Get top cards by metric',
    parameters: { type: 'object', properties: { metric: { type: 'string' }, limit: { type: 'number' } }, required: ['metric'] },
    handler(args) {
      if (!window._cardMemory) window._cardMemory = new CardMemorySystem();
      return window._cardMemory.getTopCards(args.metric, args.limit || 10);
    }
  },
  'memory.stats': {
    description: 'Get memory stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._cardMemory) window._cardMemory = new CardMemorySystem();
      return window._cardMemory.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardPlayRecord, CardMemorySystem, CardMemoryTools };
}
if (typeof window !== 'undefined') {
  window.CardPlayRecord = CardPlayRecord;
  window.CardMemorySystem = CardMemorySystem;
  window.CardMemoryTools = CardMemoryTools;
}