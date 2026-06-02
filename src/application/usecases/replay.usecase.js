// ============================================================================
// Card Battle Replay System — V132 Direction Z
// ============================================================================
// Record, annotate, and share battle replays with turn-by-turn playback.
// thunderbolt offline-first (replay storage) + generic-agent L0-L4 (replay memory).
// ============================================================================

'use strict';

class ReplayEvent {
  constructor(type, data, timestamp) {
    this.type = type; // 'play_card' | 'attack' | 'defend' | 'use_ability' | 'turn_end' | 'game_over'
    this.data = data || {};
    this.timestamp = timestamp || Date.now();
  }

  serialize() {
    return { type: this.type, data: this.data, timestamp: this.timestamp };
  }
}

class Turn {
  constructor(turnNumber, playerId) {
    this.turnNumber = turnNumber;
    this.playerId = playerId;
    this.events = [];
    this.startedAt = Date.now();
    this.endedAt = null;
  }

  addEvent(type, data) {
    this.events.push(new ReplayEvent(type, data));
  }

  endTurn() { this.endedAt = Date.now(); }

  getDuration() { return (this.endedAt || Date.now()) - this.startedAt; }

  serialize() {
    return {
      turnNumber: this.turnNumber,
      playerId: this.playerId,
      events: this.events.map(e => e.serialize()),
      startedAt: this.startedAt,
      endedAt: this.endedAt
    };
  }
}

class BattleReplay {
  constructor(replayId) {
    this.replayId = replayId;
    this.player1Id = null;
    this.player2Id = null;
    this.player1Deck = null;
    this.player2Deck = null;
    this.winnerId = null;
    this.turns = [];
    this.currentTurn = null;
    this.status = 'recording'; // 'recording' | 'completed' | 'annotated' | 'shared'
    this.createdAt = Date.now();
    this.annotations = []; // Annotation[]
    this.rating = null;
    this.tags = [];
  }

  startTurn(turnNumber, playerId) {
    if (this.currentTurn) this.currentTurn.endTurn();
    this.currentTurn = new Turn(turnNumber, playerId);
    this.turns.push(this.currentTurn);
    return this.currentTurn;
  }

  addEvent(type, data) {
    if (this.currentTurn) this.currentTurn.addEvent(type, data);
  }

  endReplay(winnerId) {
    if (this.currentTurn) this.currentTurn.endTurn();
    this.winnerId = winnerId;
    this.status = 'completed';
  }

  addAnnotation(annotation) { this.annotations.push(annotation); }
  setRating(rating) { this.rating = rating; }
  addTag(tag) { this.tags.push(tag); }

  getDuration() {
    if (this.turns.length === 0) return 0;
    const first = this.turns[0];
    const last = this.turns[this.turns.length - 1];
    return (last.endedAt || Date.now()) - first.startedAt;
  }

  serialize() {
    return {
      replayId: this.replayId,
      player1Id: this.player1Id,
      player2Id: this.player2Id,
      player1Deck: this.player1Deck,
      player2Deck: this.player2Deck,
      winnerId: this.winnerId,
      turns: this.turns.map(t => t.serialize()),
      status: this.status,
      createdAt: this.createdAt,
      annotations: this.annotations,
      rating: this.rating,
      tags: this.tags
    };
  }
}

class Annotation {
  constructor(turnNumber, eventIndex, text, type) {
    this.turnNumber = turnNumber;
    this.eventIndex = eventIndex;
    this.text = text; // 'highlight' | 'mistake' | 'tip' | 'comment'
    this.type = type || 'comment';
    this.createdAt = Date.now();
  }
}

class ReplaySystem {
  constructor() {
    this.replays = new Map(); // replayId → BattleReplay
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('replay_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [rid, rdata] of Object.entries(data.replays || {})) {
          const replay = new BattleReplay(rid);
          replay.player1Id = rdata.player1Id;
          replay.player2Id = rdata.player2Id;
          replay.player1Deck = rdata.player1Deck;
          replay.player2Deck = rdata.player2Deck;
          replay.winnerId = rdata.winnerId;
          replay.status = rdata.status;
          replay.createdAt = rdata.createdAt;
          replay.annotations = rdata.annotations || [];
          replay.rating = rdata.rating;
          replay.tags = rdata.tags || [];
          replay.turns = (rdata.turns || []).map(t => {
            const turn = new Turn(t.turnNumber, t.playerId);
            turn.startedAt = t.startedAt;
            turn.endedAt = t.endedAt;
            turn.events = (t.events || []).map(e => new ReplayEvent(e.type, e.data, e.timestamp));
            return turn;
          });
          this.replays.set(rid, replay);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        replays: Object.fromEntries(Array.from(this.replays.entries()).map(([k, v]) => [k, v.serialize()]))
      };
      localStorage.setItem('replay_system', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  startReplay(replayId, player1Id, player2Id, player1Deck, player2Deck) {
    const replay = new BattleReplay(replayId);
    replay.player1Id = player1Id;
    replay.player2Id = player2Id;
    replay.player1Deck = player1Deck;
    replay.player2Deck = player2Deck;
    this.replays.set(replayId, replay);
    this._save();
    this._emit('replay_started', { replayId });
    return replay;
  }

  recordTurn(replayId, turnNumber, playerId) {
    const replay = this.replays.get(replayId);
    if (!replay) return null;
    return replay.startTurn(turnNumber, playerId);
  }

  recordEvent(replayId, type, data) {
    const replay = this.replays.get(replayId);
    if (!replay) return;
    replay.addEvent(type, data);
    this._save();
  }

  endReplay(replayId, winnerId) {
    const replay = this.replays.get(replayId);
    if (!replay) return { error: 'replay_not_found' };
    replay.endReplay(winnerId);
    this._save();
    this._emit('replay_completed', { replayId, winnerId });
    return { success: true };
  }

  getReplay(replayId) {
    const replay = this.replays.get(replayId);
    if (!replay) return null;
    return replay.serialize();
  }

  listReplays(playerId, limit) {
    const all = Array.from(this.replays.values())
      .filter(r => r.player1Id === playerId || r.player2Id === playerId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit || 20);
    return all.map(r => r.serialize());
  }

  addAnnotation(replayId, turnNumber, eventIndex, text, type) {
    const replay = this.replays.get(replayId);
    if (!replay) return { error: 'replay_not_found' };
    const annotation = new Annotation(turnNumber, eventIndex, text, type);
    replay.addAnnotation(annotation);
    this._save();
    return { success: true };
  }

  rateReplay(replayId, rating) {
    const replay = this.replays.get(replayId);
    if (!replay) return { error: 'replay_not_found' };
    replay.setRating(rating);
    this._save();
    return { success: true };
  }

  getStats() {
    return {
      totalReplays: this.replays.size,
      completedReplays: Array.from(this.replays.values()).filter(r => r.status === 'completed').length,
      annotatedReplays: Array.from(this.replays.values()).filter(r => r.annotations.length > 0).length
    };
  }

  deleteReplay(replayId) {
    if (this.replays.has(replayId)) {
      this.replays.delete(replayId);
      this._save();
      return { success: true };
    }
    return { error: 'replay_not_found' };
  }
}

const ReplayTools = {
  'replay.start': {
    description: 'Start recording a battle replay',
    parameters: { type: 'object', properties: { replayId: { type: 'string' }, player1Id: { type: 'string' }, player2Id: { type: 'string' }, player1Deck: { type: 'string' }, player2Deck: { type: 'string' } }, required: ['replayId', 'player1Id', 'player2Id'] },
    handler(args) {
      if (!window._replaySystem) window._replaySystem = new ReplaySystem();
      return window._replaySystem.startReplay(args.replayId, args.player1Id, args.player2Id, args.player1Deck || 'unknown', args.player2Deck || 'unknown');
    }
  },
  'replay.turn': {
    description: 'Record a turn in a replay',
    parameters: { type: 'object', properties: { replayId: { type: 'string' }, turnNumber: { type: 'number' }, playerId: { type: 'string' } }, required: ['replayId', 'turnNumber', 'playerId'] },
    handler(args) {
      if (!window._replaySystem) return { error: 'not_init' };
      return window._replaySystem.recordTurn(args.replayId, args.turnNumber, args.playerId);
    }
  },
  'replay.event': {
    description: 'Record an event in the current turn',
    parameters: { type: 'object', properties: { replayId: { type: 'string' }, type: { type: 'string' }, data: { type: 'object' } }, required: ['replayId', 'type'] },
    handler(args) {
      if (!window._replaySystem) return { error: 'not_init' };
      window._replaySystem.recordEvent(args.replayId, args.type, args.data || {});
      return { success: true };
    }
  },
  'replay.end': {
    description: 'End and finalize a replay',
    parameters: { type: 'object', properties: { replayId: { type: 'string' }, winnerId: { type: 'string' } }, required: ['replayId', 'winnerId'] },
    handler(args) {
      if (!window._replaySystem) return { error: 'not_init' };
      return window._replaySystem.endReplay(args.replayId, args.winnerId);
    }
  },
  'replay.get': {
    description: 'Get replay details',
    parameters: { type: 'object', properties: { replayId: { type: 'string' } }, required: ['replayId'] },
    handler(args) {
      if (!window._replaySystem) window._replaySystem = new ReplaySystem();
      return window._replaySystem.getReplay(args.replayId);
    }
  },
  'replay.stats': {
    description: 'Get replay system stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._replaySystem) window._replaySystem = new ReplaySystem();
      return window._replaySystem.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReplayEvent, Turn, BattleReplay, Annotation, ReplaySystem, ReplayTools };
}
if (typeof window !== 'undefined') {
  window.ReplayEvent = ReplayEvent;
  window.Turn = Turn;
  window.BattleReplay = BattleReplay;
  window.Annotation = Annotation;
  window.ReplaySystem = ReplaySystem;
  window.ReplayTools = ReplayTools;
}