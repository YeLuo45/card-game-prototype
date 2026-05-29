// ============================================================================
// Card Arena Draft System — V120 Direction N
// ============================================================================
// Draft mode: pick cards from a rotating pool to build your deck.
// Boosts arena mode with thunderbolt offline-first + generic-agent L0-L4
// (draft history, win rate per draft archetype).
// ============================================================================

'use strict';

class DraftPool {
  constructor() {
    this.cards = []; // [{cardId, rarity, cost, attack, defense, type, name}]
    this.drafted = []; // cards taken by player
    this.passed = []; // cards passed by player
    this.currentPackNum = 0; // 0-indexed pack number
    this.packSize = 3;
  }

  init(cards) {
    this.cards = cards.slice(0, this.packSize * 3); // multiple packs
    this.drafted = [];
    this.passed = [];
    this.currentPackNum = 0;
  }

  hasNext() { return this.currentPackNum * this.packSize < this.cards.length; }

  getCurrentPack() {
    const packStart = this.currentPackNum * this.packSize;
    return this.cards.slice(packStart, packStart + this.packSize);
  }

  pick(cardId) {
    if (!this.hasNext()) return { error: 'no_more_packs' };
    const pack = this.getCurrentPack();
    const idx = pack.findIndex(c => c.cardId === cardId);
    if (idx < 0) return { error: 'card_not_in_pack' };

    this.drafted.push(pack[idx]);
    const idxInPack = this.drafted.length - 1 - this.currentPackNum * this.packSize;
    if (idxInPack >= this.packSize - 1) this.currentPackNum++;
    return { card: pack[idx], drafted: this.drafted.length };
  }

  pass(cardId) {
    if (!this.hasNext()) return { error: 'no_more_packs' };
    const pack = this.getCurrentPack();
    const idx = pack.findIndex(c => c.cardId === cardId);
    if (idx < 0) return { error: 'card_not_in_pack' };

    this.passed.push(pack[idx]);
    const passedInPack = this.passed.length - 1 - this.currentPackNum * this.packSize;
    if (passedInPack >= this.packSize - 1) this.currentPackNum++;
    return { passed: this.passed.length };
  }

  reset() {
    this.cards = [];
    this.drafted = [];
    this.passed = [];
    this.currentPackNum = 0;
  }
}

class DraftSession {
  constructor(sessionId, playerId, format, totalPacks) {
    this.sessionId = sessionId;
    this.playerId = playerId;
    this.format = format; // 'classic' | 'sealed' | 'auction'
    this.totalPacks = totalPacks;
    this.currentPack = 1;
    this.pools = []; // one DraftPool per pack
    this.deck = []; // final drafted deck
    this.wins = 0;
    this.losses = 0;
    this.createdAt = Date.now();
    this.finishedAt = null;
    this.status = 'drafting'; // 'drafting' | 'decking' | 'complete'
  }

  isComplete() { return this.status === 'complete'; }

  getDeck() { return this.deck; }

  recordResult(wins, losses) {
    this.wins = wins;
    this.losses = losses;
    this.finishedAt = Date.now();
    this.status = 'complete';
  }
}

class ArenaDraftSystem {
  constructor() {
    this.sessions = new Map(); // sessionId → DraftSession
    this.pools = new Map(); // sessionId → DraftPool
    this.playerStats = new Map(); // playerId → { totalDrafts, totalWins, totalLosses, archetypes }
    this.cardCatalog = new Map(); // cardId → card def
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('arena_draft') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [sid, sdata] of Object.entries(data.sessions || {})) {
          const s = new DraftSession(sdata.sessionId, sdata.playerId, sdata.format, sdata.totalPacks);
          s.currentPack = sdata.currentPack || 1;
          s.deck = sdata.deck || [];
          s.wins = sdata.wins || 0;
          s.losses = sdata.losses || 0;
          s.createdAt = sdata.createdAt || Date.now();
          s.finishedAt = sdata.finishedAt || null;
          s.status = sdata.status || 'drafting';
          this.sessions.set(sid, s);
        }
        for (const [pid, pdata] of Object.entries(data.playerStats || {})) {
          this.playerStats.set(pid, { totalDrafts: pdata.totalDrafts || 0, totalWins: pdata.totalWins || 0, totalLosses: pdata.totalLosses || 0, archetypes: pdata.archetypes || {} });
        }
        for (const [cid, cdata] of Object.entries(data.cardCatalog || {})) {
          this.cardCatalog.set(cid, cdata);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        sessions: Object.fromEntries(Array.from(this.sessions.entries()).map(([k, v]) => [k, { sessionId: v.sessionId, playerId: v.playerId, format: v.format, totalPacks: v.totalPacks, currentPack: v.currentPack, deck: v.deck, wins: v.wins, losses: v.losses, createdAt: v.createdAt, finishedAt: v.finishedAt, status: v.status }])),
        playerStats: Object.fromEntries(Array.from(this.playerStats.entries()).map(([k, v]) => [k, { totalDrafts: v.totalDrafts, totalWins: v.totalWins, totalLosses: v.totalLosses, archetypes: v.archetypes }])),
        cardCatalog: Object.fromEntries(Array.from(this.cardCatalog.entries()))
      };
      localStorage.setItem('arena_draft', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  registerCard(cardId, name, rarity, cost, attack, defense, type) {
    if (this.cardCatalog.has(cardId)) return { error: 'card_exists' };
    const card = { cardId, name, rarity, cost, attack, defense, type };
    this.cardCatalog.set(cardId, card);
    this._save();
    return card;
  }

  startDraftSession(playerId, format, totalPacks) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const session = new DraftSession(sessionId, playerId, format, totalPacks);

    for (let p = 0; p < totalPacks; p++) {
      const pool = new DraftPool();
      const packCards = this._generatePack();
      pool.init(packCards);
      this.pools.set(`${sessionId}_pack${p}`, pool);
    }

    this.sessions.set(sessionId, session);
    this._save();
    this._emit('draft_started', { sessionId, playerId, format });
    return session;
  }

  _generatePack() {
    const pool = [];
    const catalog = Array.from(this.cardCatalog.values());
    // Shuffle and pick packSize cards
    const shuffled = catalog.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  getCurrentPack(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const poolKey = `${sessionId}_pack${session.currentPack - 1}`;
    const pool = this.pools.get(poolKey);
    if (!pool) return null;
    return pool.getCurrentPack();
  }

  pickCard(sessionId, cardId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'session_not_found' };
    if (session.isComplete()) return { error: 'session_complete' };

    const poolKey = `${sessionId}_pack${session.currentPack - 1}`;
    const pool = this.pools.get(poolKey);
    if (!pool) return { error: 'pack_not_found' };

    const result = pool.pick(cardId);
    if (result.error) return result;

    if (!pool.hasNext()) {
      session.currentPack++;
      if (session.currentPack > session.totalPacks) {
        session.deck = pool.drafted;
        session.status = 'decking';
        this._emit('draft_pack_complete', { sessionId, pack: session.currentPack - 1 });
      }
    }

    this._save();
    this._emit('card_picked', { sessionId, card: result.card });
    return result;
  }

  passCard(sessionId, cardId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'session_not_found' };

    const poolKey = `${sessionId}_pack${session.currentPack - 1}`;
    const pool = this.pools.get(poolKey);
    if (!pool) return { error: 'pack_not_found' };

    const result = pool.pass(cardId);
    if (!pool.hasNext()) {
      session.currentPack++;
      if (session.currentPack > session.totalPacks) {
        session.deck = pool.drafted;
        session.status = 'decking';
      }
    }

    this._save();
    this._emit('card_passed', { sessionId, cardId });
    return result;
  }

  submitDeck(sessionId, deckCardIds) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'session_not_found' };
    if (session.status !== 'decking') return { error: 'not_in_decking_phase' };

    session.deck = deckCardIds.map(id => ({ cardId: id }));
    session.status = 'complete';
    this._save();
    this._emit('deck_submitted', { sessionId, deck: session.deck });
    return { success: true, deck: session.deck };
  }

  recordDraftResult(sessionId, wins, losses) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'session_not_found' };
    session.recordResult(wins, losses);

    // Update player stats
    let stats = this.playerStats.get(session.playerId) || { totalDrafts: 0, totalWins: 0, totalLosses: 0, archetypes: {} };
    stats.totalDrafts++;
    stats.totalWins += wins;
    stats.totalLosses += losses;
    this.playerStats.set(session.playerId, stats);

    this._save();
    this._emit('draft_result_recorded', { sessionId, wins, losses });
    return { wins, losses, totalDrafts: stats.totalDrafts };
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  getPlayerStats(playerId) {
    return this.playerStats.get(playerId) || { totalDrafts: 0, totalWins: 0, totalLosses: 0, archetypes: {} };
  }

  getStats() {
    return {
      totalSessions: this.sessions.size,
      totalCardsCataloged: this.cardCatalog.size,
      totalPlayers: this.playerStats.size
    };
  }
}

const ArenaDraftTools = {
  'draft.start_session': {
    description: 'Start a new arena draft session',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, format: { type: 'string' }, totalPacks: { type: 'number' } }, required: ['playerId', 'format', 'totalPacks'] },
    handler(args) {
      if (!window._arenaDraft) window._arenaDraft = new ArenaDraftSystem();
      return window._arenaDraft.startDraftSession(args.playerId, args.format, args.totalPacks);
    }
  },
  'draft.pick': {
    description: 'Pick a card from current pack',
    parameters: { type: 'object', properties: { sessionId: { type: 'string' }, cardId: { type: 'string' } }, required: ['sessionId', 'cardId'] },
    handler(args) {
      if (!window._arenaDraft) return { error: 'system_not_initialized' };
      return window._arenaDraft.pickCard(args.sessionId, args.cardId);
    }
  },
  'draft.current_pack': {
    description: 'Get current pack cards',
    parameters: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] },
    handler(args) {
      if (!window._arenaDraft) return { error: 'system_not_initialized' };
      return window._arenaDraft.getCurrentPack(args.sessionId) || { error: 'no_pack' };
    }
  },
  'draft.stats': {
    description: 'Get draft stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._arenaDraft) window._arenaDraft = new ArenaDraftSystem();
      return window._arenaDraft.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DraftPool, DraftSession, ArenaDraftSystem, ArenaDraftTools };
}
if (typeof window !== 'undefined') {
  window.DraftPool = DraftPool;
  window.DraftSession = DraftSession;
  window.ArenaDraftSystem = ArenaDraftSystem;
  window.ArenaDraftTools = ArenaDraftTools;
}