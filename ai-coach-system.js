// ============================================================================
// Card AI Coach System — V131 Direction Y
// ============================================================================
// AI-powered deck advisor, opponent modeling, strategy suggestions.
// generic-agent L0-L4 (deck history, opponent modeling, win patterns).
// ============================================================================

'use strict';

class DeckAdvisor {
  constructor() {
    this.knowledgeBase = new Map(); // playerId → DeckKnowledge
    this.opponentModels = new Map(); // opponentId → OpponentModel
    this.hooks = [];
  }

  _getOrCreate(playerId) {
    if (!this.knowledgeBase.has(playerId)) {
      this.knowledgeBase.set(playerId, new DeckKnowledge(playerId));
    }
    return this.knowledgeBase.get(playerId);
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  // Record a game for learning
  recordGame(playerId, deck, opponentId, won, myCards, opponentCards) {
    const dk = this._getOrCreate(playerId);
    dk.addGame(deck, won, myCards, opponentCards);

    // Update opponent model
    if (opponentId) {
      if (!this.opponentModels.has(opponentId)) {
        this.opponentModels.set(opponentId, new OpponentModel(opponentId));
      }
      const om = this.opponentModels.get(opponentId);
      om.recordGame(deck, won);
    }

    this._emit('game_recorded', { playerId, opponentId, won });
    return { success: true };
  }

  // Get deck advice for current opponent
  getAdvice(playerId, opponentId) {
    const dk = this._getOrCreate(playerId);
    const om = this.opponentModels.get(opponentId);

    const suggestions = [];
    const recentGames = dk.getRecentGames(10);
    if (recentGames.length >= 3) {
      const winRate = recentGames.filter(g => g.won).length / recentGames.length;
      if (winRate < 0.4) {
        suggestions.push('Consider a more defensive deck against this opponent');
        suggestions.push('Try saving energy for late-game combos');
      } else if (winRate > 0.7) {
        suggestions.push('Your current strategy is working well');
        suggestions.push('Keep pressure on early');
      }
    }

    if (om) {
      const omStats = om.getStats();
      if (omStats.games >= 5 && omStats.winRateAgainst < 0.35) {
        suggestions.push('Opponent is strong early game - survive and outlast');
        suggestions.push('Avoid going first if possible');
      }
      if (om.strongColors.size > 0) {
        suggestions.push(`Opponent shows preference for ${Array.from(om.strongColors).join(', ')} cards`);
      }
    }

    return { suggestions, confidence: recentGames.length >= 5 ? 'high' : 'medium' };
  }

  getPlayerKnowledge(playerId) {
    return this._getOrCreate(playerId).serialize();
  }
}

class DeckKnowledge {
  constructor(playerId) {
    this.playerId = playerId;
    this.games = [];
    this.deckPerformance = new Map(); // deckCode → { wins, games }
    this.colorPreferences = new Map(); // color → winRate
  }

  addGame(deckCode, won, myCards, opponentCards) {
    this.games.push({ deckCode, won, myCards, opponentCards, timestamp: Date.now() });
    if (this.games.length > 100) this.games.shift();

    if (!this.deckPerformance.has(deckCode)) this.deckPerformance.set(deckCode, { wins: 0, games: 0 });
    const dp = this.deckPerformance.get(deckCode);
    dp.games++;
    if (won) dp.wins++;

    for (const card of (myCards || [])) {
      if (!this.colorPreferences.has(card.color)) this.colorPreferences.set(card.color, { wins: 0, games: 0 });
      const cp = this.colorPreferences.get(card.color);
      cp.games++;
      if (won) cp.wins++;
    }
  }

  getRecentGames(n) { return this.games.slice(-n); }

  getBestDeck() {
    let best = null, bestRate = -1;
    for (const [deck, dp] of this.deckPerformance.entries()) {
      if (dp.games >= 3) {
        const rate = dp.wins / dp.games;
        if (rate > bestRate) { bestRate = rate; best = deck; }
      }
    }
    return best ? { deck: best, winRate: bestRate } : null;
  }

  serialize() {
    return {
      playerId: this.playerId,
      totalGames: this.games.length,
      bestDeck: this.getBestDeck(),
      colorPreferences: Object.fromEntries(Array.from(this.colorPreferences.entries()).map(([k, v]) => [k, (v.wins / v.games * 100).toFixed(1) + '%']))
    };
  }
}

class OpponentModel {
  constructor(opponentId) {
    this.opponentId = opponentId;
    this.games = [];
    this.strongColors = new Set();
    this.weakDecks = new Set();
    this.avgGameLength = 0;
  }

  recordGame(deckUsed, won) {
    this.games.push({ deckUsed, won, timestamp: Date.now() });
    if (this.games.length > 50) this.games.shift();

    if (!won) this.weakDecks.add(deckUsed);
    else this.strongColors.add(deckUsed);
  }

  getStats() {
    const won = this.games.filter(g => g.won).length;
    return {
      games: this.games.length,
      winRateAgainst: this.games.length > 0 ? won / this.games.length : null
    };
  }
}

class AICoachSystem {
  constructor() {
    this.advisor = new DeckAdvisor();
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('ai_coach_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        if (data.knowledgeBase) {
          for (const [pid, kdata] of Object.entries(data.knowledgeBase)) {
            const dk = new DeckKnowledge(pid);
            dk.games = kdata.games || [];
            dk.deckPerformance = new Map(Object.entries(kdata.deckPerformance || {}).map(([k, v]) => [k, { wins: v.wins, games: v.games }]));
            dk.colorPreferences = new Map(Object.entries(kdata.colorPreferences || {}).map(([k, v]) => [k, { wins: v.wins, games: v.games }]));
            this.advisor.knowledgeBase.set(pid, dk);
          }
        }
        if (data.opponentModels) {
          for (const [oid, odata] of Object.entries(data.opponentModels)) {
            const om = new OpponentModel(oid);
            om.games = odata.games || [];
            om.strongColors = new Set(odata.strongColors || []);
            om.weakDecks = new Set(odata.weakDecks || []);
            this.advisor.opponentModels.set(oid, om);
          }
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const kb = {};
      for (const [pid, dk] of this.advisor.knowledgeBase.entries()) {
        kb[pid] = {
          games: dk.games,
          deckPerformance: Object.fromEntries(Array.from(dk.deckPerformance.entries()).map(([k, v]) => [k, { wins: v.wins, games: v.games }])),
          colorPreferences: Object.fromEntries(Array.from(dk.colorPreferences.entries()).map(([k, v]) => [k, { wins: v.wins, games: v.games }]))
        };
      }
      const om = {};
      for (const [oid, model] of this.advisor.opponentModels.entries()) {
        om[oid] = { games: model.games, strongColors: Array.from(model.strongColors), weakDecks: Array.from(model.weakDecks) };
      }
      localStorage.setItem('ai_coach_system', JSON.stringify({ knowledgeBase: kb, opponentModels: om }));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  analyzeGame(playerId, deck, opponentId, won, myCards, opponentCards) {
    const result = this.advisor.recordGame(playerId, deck, opponentId, won, myCards, opponentCards);
    this._save();
    return result;
  }

  getDeckAdvice(playerId, opponentId) {
    return this.advisor.getAdvice(playerId, opponentId);
  }

  getPlayerStats(playerId) {
    return this.advisor.getPlayerKnowledge(playerId);
  }
}

const AICoachTools = {
  'coach.analyze': {
    description: 'Record a game result for AI learning',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, deck: { type: 'string' }, opponentId: { type: 'string' }, won: { type: 'boolean' }, myCards: { type: 'array' }, opponentCards: { type: 'array' } }, required: ['playerId', 'deck', 'opponentId', 'won'] },
    handler(args) {
      if (!window._aiCoachSystem) window._aiCoachSystem = new AICoachSystem();
      return window._aiCoachSystem.analyzeGame(args.playerId, args.deck, args.opponentId, args.won, args.myCards || [], args.opponentCards || []);
    }
  },
  'coach.advice': {
    description: 'Get deck advice for opponent',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, opponentId: { type: 'string' } }, required: ['playerId', 'opponentId'] },
    handler(args) {
      if (!window._aiCoachSystem) window._aiCoachSystem = new AICoachSystem();
      return window._aiCoachSystem.getDeckAdvice(args.playerId, args.opponentId);
    }
  },
  'coach.stats': {
    description: 'Get player AI coach stats',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } } },
    handler(args) {
      if (!window._aiCoachSystem) window._aiCoachSystem = new AICoachSystem();
      return window._aiCoachSystem.getPlayerStats(args.playerId || 'default');
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DeckAdvisor, DeckKnowledge, OpponentModel, AICoachSystem, AICoachTools };
}
if (typeof window !== 'undefined') {
  window.DeckAdvisor = DeckAdvisor;
  window.DeckKnowledge = DeckKnowledge;
  window.OpponentModel = OpponentModel;
  window.AICoachSystem = AICoachSystem;
  window.AICoachTools = AICoachTools;
}