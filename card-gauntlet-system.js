// ============================================================================
// Card Challenge Gauntlet — V124 Direction R
// ============================================================================
// Timed challenge runs: earn stars, complete modifiers, climb the gauntlet.
// thunderbolt offline-first (gauntlet state) + generic-agent L0-L4
// (challenge history, modifier preferences, star records).
// ============================================================================

'use strict';

class GauntletRun {
  constructor(runId, playerId, modifiers) {
    this.runId = runId;
    this.playerId = playerId;
    this.modifiers = modifiers || [];
    this.score = 0;
    this.stars = 0; // 1-3
    this.wins = 0;
    this.losses = 0;
    this.startedAt = Date.now();
    this.finishedAt = null;
    this.status = 'active'; // 'active' | 'complete' | 'abandoned'
  }

  recordWin(opponentStrength) {
    this.wins++;
    this.score += 100 * (opponentStrength || 1);
    if (this.wins >= 3) this.stars = 3;
    else if (this.wins >= 2) this.stars = 2;
    else this.stars = 1;
    if (this.wins >= 5) this._finish();
  }

  recordLoss() {
    this.losses++;
    this._finish();
  }

  _finish() {
    this.finishedAt = Date.now();
    this.status = 'complete';
  }

  abandon() {
    this.status = 'abandoned';
    this.finishedAt = Date.now();
  }

  getScore() { return this.score; }
  getStars() { return this.stars; }
  isComplete() { return this.status === 'complete' || this.status === 'abandoned'; }
}

class GauntletSystem {
  constructor() {
    this.runs = new Map(); // runId → GauntletRun
    this.challengeRegistry = new Map(); // challengeId → { name, modifiers, baseScore, threshold }
    this.playerBest = new Map(); // playerId → { stars, score, runId }
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('gauntlet_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [rid, rdata] of Object.entries(data.runs || {})) {
          const run = new GauntletRun(rdata.runId, rdata.playerId, rdata.modifiers || []);
          run.score = rdata.score || 0;
          run.stars = rdata.stars || 0;
          run.wins = rdata.wins || 0;
          run.losses = rdata.losses || 0;
          run.startedAt = rdata.startedAt || Date.now();
          run.finishedAt = rdata.finishedAt || null;
          run.status = rdata.status || 'active';
          this.runs.set(rid, run);
        }
        for (const [cid, cdata] of Object.entries(data.challengeRegistry || {})) {
          this.challengeRegistry.set(cid, cdata);
        }
        for (const [pid, pdata] of Object.entries(data.playerBest || {})) {
          this.playerBest.set(pid, pdata);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        runs: Object.fromEntries(Array.from(this.runs.entries()).map(([k, v]) => [k, { runId: v.runId, playerId: v.playerId, modifiers: v.modifiers, score: v.score, stars: v.stars, wins: v.wins, losses: v.losses, startedAt: v.startedAt, finishedAt: v.finishedAt, status: v.status }])),
        challengeRegistry: Object.fromEntries(this.challengeRegistry.entries()),
        playerBest: Object.fromEntries(this.playerBest.entries())
      };
      localStorage.setItem('gauntlet_system', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  registerChallenge(challengeId, name, modifiers, baseScore, threshold) {
    if (this.challengeRegistry.has(challengeId)) return { error: 'challenge_exists' };
    this.challengeRegistry.set(challengeId, { name, modifiers, baseScore, threshold });
    this._save();
    return { success: true };
  }

  startRun(playerId, challengeId, modifiers) {
    if (!this.challengeRegistry.has(challengeId) && !challengeId) {
      // Free-form challenge
      challengeId = `custom_${Date.now()}`;
      this.challengeRegistry.set(challengeId, { name: 'Custom Challenge', modifiers: modifiers || [], baseScore: 100, threshold: 0 });
    }
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const run = new GauntletRun(runId, playerId, modifiers);
    this.runs.set(runId, run);
    this._save();
    this._emit('run_started', { runId, playerId, challengeId });
    return run;
  }

  recordRunResult(runId, wins, losses) {
    const run = this.runs.get(runId);
    if (!run) return { error: 'run_not_found' };
    run.wins = wins;
    run.losses = losses;
    run.score = wins * 100;
    run.stars = wins >= 5 ? 3 : wins >= 3 ? 2 : wins >= 1 ? 1 : 0;
    run._finish();
    this._save();
    this._emit('run_complete', { runId, stars: run.stars });
    return { stars: run.stars, score: run.score };
  }

  abandonRun(runId) {
    const run = this.runs.get(runId);
    if (!run) return { error: 'run_not_found' };
    run.abandon();
    this._save();
    return { success: true };
  }

  getRun(runId) { return this.runs.get(runId) || null; }

  getPlayerBest(playerId) { return this.playerBest.get(playerId) || { stars: 0, score: 0 }; }

  getChallengeRuns(challengeId, limit) {
    return Array.from(this.runs.values()).filter(r => r.status === 'complete').sort((a, b) => b.score - a.score).slice(0, limit || 10);
  }

  getStats() {
    let totalRuns = 0, totalStars = 0;
    for (const run of this.runs.values()) {
      if (run.status !== 'active') { totalRuns++; totalStars += run.stars; }
    }
    return { totalRuns, totalStars, totalChallenges: this.challengeRegistry.size, bestPlayers: this.playerBest.size };
  }
}

const GauntletTools = {
  'gauntlet.start': {
    description: 'Start a gauntlet challenge run',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, challengeId: { type: 'string' }, modifiers: { type: 'array', items: { type: 'string' } } }, required: ['playerId'] },
    handler(args) {
      if (!window._gauntlet) window._gauntlet = new GauntletSystem();
      return window._gauntlet.startRun(args.playerId, args.challengeId, args.modifiers);
    }
  },
  'gauntlet.result': {
    description: 'Record gauntlet run result',
    parameters: { type: 'object', properties: { runId: { type: 'string' }, wins: { type: 'number' }, losses: { type: 'number' } }, required: ['runId', 'wins', 'losses'] },
    handler(args) {
      if (!window._gauntlet) return { error: 'not_init' };
      return window._gauntlet.recordRunResult(args.runId, args.wins, args.losses);
    }
  },
  'gauntlet.stats': {
    description: 'Get gauntlet stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._gauntlet) window._gauntlet = new GauntletSystem();
      return window._gauntlet.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GauntletRun, GauntletSystem, GauntletTools };
}
if (typeof window !== 'undefined') {
  window.GauntletRun = GauntletRun;
  window.GauntletSystem = GauntletSystem;
  window.GauntletTools = GauntletTools;
}