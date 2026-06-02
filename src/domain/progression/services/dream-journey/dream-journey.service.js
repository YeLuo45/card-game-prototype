// ============================================================================
// Card Dream Journey System — V126 Direction T
// ============================================================================
// Roguelike journey mode: pick paths, encounter events, build a deck
// from random rewards. thunderbolt offline-first + nanobot (journey nodes,
// event outcomes) + generic-agent L0-L4 (path history, journey preferences).
// ============================================================================

'use strict';

class JourneyNode {
  constructor(nodeId, type, reward) {
    this.nodeId = nodeId;
    this.type = type; // 'battle' | 'event' | 'rest' | 'shop' | 'treasure'
    this.reward = reward || null;
    this.visited = false;
  }
}

class JourneyRun {
  constructor(runId, playerId) {
    this.runId = runId;
    this.playerId = playerId;
    this.nodes = []; // JourneyNode[]
    this.currentNodeIndex = 0;
    this.deck = []; // cardId[]
    this.gold = 50;
    this.hp = 100;
    this.status = 'active'; // 'active' | 'won' | 'lost'
    this.startedAt = Date.now();
    this.finishedAt = null;
  }

  addNode(type, reward) {
    const node = new JourneyNode(`node_${this.nodes.length}`, type, reward);
    this.nodes.push(node);
    return node;
  }

  advance() {
    if (this.currentNodeIndex < this.nodes.length - 1) {
      this.currentNodeIndex++;
      return this.getCurrentNode();
    }
    return null;
  }

  getCurrentNode() {
    return this.nodes[this.currentNodeIndex] || null;
  }

  collectReward() {
    const node = this.getCurrentNode();
    if (!node || !node.reward || node.visited) return null;
    node.visited = true;
    if (node.type === 'treasure' || node.type === 'shop') this.gold += node.reward.gold || 0;
    if (node.reward.card) this.deck.push(node.reward.card);
    if (node.reward.hp) this.hp = Math.min(100, this.hp + node.reward.hp);
    return node.reward;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.status = 'lost'; this.finishedAt = Date.now(); }
  }

  finish(won) {
    this.status = won ? 'won' : 'lost';
    this.finishedAt = Date.now();
  }
}

class DreamJourneySystem {
  constructor() {
    this.runs = new Map(); // runId → JourneyRun
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('dream_journey') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [rid, rdata] of Object.entries(data.runs || {})) {
          const run = new JourneyRun(rdata.runId, rdata.playerId);
          run.nodes = (rdata.nodes || []).map(n => { const jn = new JourneyNode(n.nodeId, n.type, n.reward); jn.visited = n.visited; return jn; });
          run.currentNodeIndex = rdata.currentNodeIndex || 0;
          run.deck = rdata.deck || [];
          run.gold = rdata.gold || 50;
          run.hp = rdata.hp || 100;
          run.status = rdata.status || 'active';
          run.startedAt = rdata.startedAt || Date.now();
          run.finishedAt = rdata.finishedAt || null;
          this.runs.set(rid, run);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        runs: Object.fromEntries(Array.from(this.runs.entries()).map(([k, v]) => [k, { runId: v.runId, playerId: v.playerId, nodes: v.nodes.map(n => ({ nodeId: n.nodeId, type: n.type, reward: n.reward, visited: n.visited })), currentNodeIndex: v.currentNodeIndex, deck: v.deck, gold: v.gold, hp: v.hp, status: v.status, startedAt: v.startedAt, finishedAt: v.finishedAt }]))
      };
      localStorage.setItem('dream_journey', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  startRun(playerId) {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const run = new JourneyRun(runId, playerId);
    // Build the journey path
    run.addNode('battle', { xp: 20 });
    run.addNode('event', { gold: 30 });
    run.addNode('rest', { hp: 20 });
    run.addNode('shop', { gold: 10 });
    run.addNode('treasure', { card: 'rare_scroll', gold: 50 });
    run.addNode('battle', { xp: 40 });
    run.addNode('event', null);
    run.addNode('battle', { xp: 60 });
    run.addNode('treasure', { card: 'legendary_artifact' });

    this.runs.set(runId, run);
    this._save();
    this._emit('journey_started', { runId, playerId });
    return run;
  }

  advanceJourney(runId) {
    const run = this.runs.get(runId);
    if (!run) return { error: 'run_not_found' };
    if (run.status !== 'active') return { error: 'journey_not_active' };
    const next = run.advance();
    if (!next) { run.finish(true); this._save(); return { finished: true, status: run.status }; }
    return { nextNode: { nodeId: next.nodeId, type: next.type }, deckSize: run.deck.length, gold: run.gold, hp: run.hp };
  }

  collectReward(runId) {
    const run = this.runs.get(runId);
    if (!run) return { error: 'run_not_found' };
    const reward = run.collectReward();
    this._save();
    return { reward, gold: run.gold, deckSize: run.deck.length, hp: run.hp };
  }

  takeDamage(runId, damage) {
    const run = this.runs.get(runId);
    if (!run) return { error: 'run_not_found' };
    run.takeDamage(damage);
    this._save();
    this._emit('damage_taken', { runId, damage, hp: run.hp });
    return { hp: run.hp, status: run.status };
  }

  finishJourney(runId, won) {
    const run = this.runs.get(runId);
    if (!run) return { error: 'run_not_found' };
    run.finish(won);
    this._save();
    return { status: run.status, deck: run.deck, gold: run.gold };
  }

  getRun(runId) {
    const run = this.runs.get(runId);
    if (!run) return null;
    return { runId, playerId: run.playerId, nodeIndex: run.currentNodeIndex, totalNodes: run.nodes.length, deck: run.deck, gold: run.gold, hp: run.hp, status: run.status };
  }

  getStats() { return { totalRuns: this.runs.size }; }
}

const DreamJourneyTools = {
  'dream.start': {
    description: 'Start a dream journey',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
    handler(args) {
      if (!window._dreamJourney) window._dreamJourney = new DreamJourneySystem();
      return window._dreamJourney.startRun(args.playerId);
    }
  },
  'dream.advance': {
    description: 'Advance to next journey node',
    parameters: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'] },
    handler(args) {
      if (!window._dreamJourney) return { error: 'not_init' };
      return window._dreamJourney.advanceJourney(args.runId);
    }
  },
  'dream.reward': {
    description: 'Collect current node reward',
    parameters: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'] },
    handler(args) {
      if (!window._dreamJourney) return { error: 'not_init' };
      return window._dreamJourney.collectReward(args.runId);
    }
  },
  'dream.stats': {
    description: 'Get journey stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._dreamJourney) window._dreamJourney = new DreamJourneySystem();
      return window._dreamJourney.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { JourneyNode, JourneyRun, DreamJourneySystem, DreamJourneyTools };
}
if (typeof window !== 'undefined') {
  window.JourneyNode = JourneyNode;
  window.JourneyRun = JourneyRun;
  window.DreamJourneySystem = DreamJourneySystem;
  window.DreamJourneyTools = DreamJourneyTools;
}