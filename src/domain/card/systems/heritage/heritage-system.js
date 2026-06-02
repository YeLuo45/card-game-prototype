// ============================================================================
// Card Heritage System — V135 Direction C
// ============================================================================
// Card lineage, evolve chains, inheritance of special abilities.
// ruflo compositional architecture (heritage chains) + generic-agent L0-L4.
// ============================================================================

'use strict';

class HeritageNode {
  constructor(cardId, generation) {
    this.cardId = cardId;
    this.generation = generation;
    this.parentId = null;
    this.children = [];
    this.inheritedTraits = [];
    this.mutations = [];
    this.heritageDepth = 0;
  }
}

class HeritageChain {
  constructor(rootCardId) {
    this.rootId = rootCardId;
    this.nodes = new Map(); // cardId → HeritageNode
    this.root = new HeritageNode(rootCardId, 0);
    this.nodes.set(rootCardId, this.root);
    this.totalGenerations = 1;
  }

  addChild(parentId, childId, inheritedTraits) {
    if (!this.nodes.has(parentId)) return null;
    const parent = this.nodes.get(parentId);
    const child = new HeritageNode(childId, parent.generation + 1);
    child.parentId = parentId;
    child.inheritedTraits = [...inheritedTraits];
    parent.children.push(childId);
    this.nodes.set(childId, child);
    this.totalGenerations = Math.max(this.totalGenerations, child.generation + 1);
    return child;
  }

  addMutation(cardId, mutation) {
    if (!this.nodes.has(cardId)) return;
    const node = this.nodes.get(cardId);
    node.mutations.push({ ...mutation, timestamp: Date.now() });
  }

  getAncestry(cardId) {
    const ancestry = [];
    let current = this.nodes.get(cardId);
    while (current && current.parentId) {
      ancestry.unshift(current.parentId);
      current = this.nodes.get(current.parentId);
    }
    return ancestry;
  }

  getDescendants(cardId) {
    const descendants = [];
    const stack = [cardId];
    while (stack.length > 0) {
      const id = stack.pop();
      const node = this.nodes.get(id);
      if (node) {
        for (const childId of node.children) {
          descendants.push(childId);
          stack.push(childId);
        }
      }
    }
    return descendants;
  }

  getHeritageDepth(cardId) {
    const node = this.nodes.get(cardId);
    return node ? node.generation : 0;
  }

  getAllTraits(cardId) {
    const traits = new Set();
    for (const ancestorId of this.getAncestry(cardId)) {
      const node = this.nodes.get(ancestorId);
      if (node) for (const t of node.inheritedTraits) traits.add(t);
    }
    const node = this.nodes.get(cardId);
    if (node) for (const t of node.inheritedTraits) traits.add(t);
    for (const mutation of (node?.mutations || [])) {
      if (mutation.trait) traits.add(mutation.trait);
    }
    return Array.from(traits);
  }

  serialize() {
    const serializeNode = (n) => ({
      cardId: n.cardId, generation: n.generation, parentId: n.parentId,
      children: n.children, inheritedTraits: n.inheritedTraits,
      mutations: n.mutations
    });
    return {
      rootId: this.rootId,
      totalGenerations: this.totalGenerations,
      nodes: Object.fromEntries(Array.from(this.nodes.entries()).map(([k, v]) => [k, serializeNode(v)]))
    };
  }
}

class HeritageRegistry {
  constructor() {
    this.chains = new Map(); // rootId → HeritageChain
    this.hooks = [];
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('heritage_registry') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [rootId, cdata] of Object.entries(data.chains || {})) {
          const chain = new HeritageChain(rootId);
          for (const [cid, ndata] of Object.entries(cdata.nodes || {})) {
            const node = new HeritageNode(cid, ndata.generation);
            node.parentId = ndata.parentId;
            node.children = ndata.children || [];
            node.inheritedTraits = ndata.inheritedTraits || [];
            node.mutations = ndata.mutations || [];
            node.heritageDepth = ndata.heritageDepth || 0;
            chain.nodes.set(cid, node);
          }
          chain.totalGenerations = cdata.totalGenerations || 1;
          this.chains.set(rootId, chain);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        chains: Object.fromEntries(Array.from(this.chains.entries()).map(([k, v]) => [k, v.serialize()]))
      };
      localStorage.setItem('heritage_registry', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  createChain(rootCardId, traits) {
    const chain = new HeritageChain(rootCardId);
    if (chain.root) chain.root.inheritedTraits = [...(traits || [])];
    this.chains.set(rootCardId, chain);
    this._save();
    this._emit('chain_created', { rootId: rootCardId });
    return chain;
  }

  evolveCard(parentId, childId, inheritedTraits, mutation) {
    // Find the chain for this lineage
    let chain = null;
    for (const c of this.chains.values()) {
      if (c.nodes.has(parentId)) { chain = c; break; }
    }
    if (!chain) {
      chain = this.createChain(parentId, inheritedTraits.slice(0, 1));
    }

    const child = chain.addChild(parentId, childId, inheritedTraits);
    if (mutation && child) chain.addMutation(childId, mutation);
    this._save();
    this._emit('card_evolved', { parentId, childId });
    return child;
  }

  getAncestry(cardId) {
    for (const chain of this.chains.values()) {
      if (chain.nodes.has(cardId)) return chain.getAncestry(cardId);
    }
    return [];
  }

  getHeritageDepth(cardId) {
    for (const chain of this.chains.values()) {
      if (chain.nodes.has(cardId)) return chain.getHeritageDepth(cardId);
    }
    return 0;
  }

  getAllTraits(cardId) {
    for (const chain of this.chains.values()) {
      if (chain.nodes.has(cardId)) return chain.getAllTraits(cardId);
    }
    return [];
  }

  getDescendants(cardId) {
    for (const chain of this.chains.values()) {
      if (chain.nodes.has(cardId)) return chain.getDescendants(cardId);
    }
    return [];
  }

  getChainStats() {
    let totalCards = 0, maxDepth = 0;
    for (const chain of this.chains.values()) {
      totalCards += chain.nodes.size;
      maxDepth = Math.max(maxDepth, chain.totalGenerations);
    }
    return { chainCount: this.chains.size, totalCards, maxDepth };
  }

  getHeritageReport(cardId) {
    for (const chain of this.chains.values()) {
      if (chain.nodes.has(cardId)) {
        return {
          cardId,
          depth: chain.getHeritageDepth(cardId),
          ancestry: chain.getAncestry(cardId),
          traits: chain.getAllTraits(cardId),
          descendants: chain.getDescendants(cardId)
        };
      }
    }
    return null;
  }
}

const HeritageTools = {
  'heritage.evolve': {
    description: 'Evolve a card with heritage',
    parameters: { type: 'object', properties: { parentId: { type: 'string' }, childId: { type: 'string' }, inheritedTraits: { type: 'array' }, mutation: { type: 'object' } }, required: ['parentId', 'childId'] },
    handler(args) {
      if (!window._heritageRegistry) window._heritageRegistry = new HeritageRegistry();
      return window._heritageRegistry.evolveCard(args.parentId, args.childId, args.inheritedTraits || [], args.mutation || null);
    }
  },
  'heritage.report': {
    description: 'Get heritage report for a card',
    parameters: { type: 'object', properties: { cardId: { type: 'string' } } },
    handler(args) {
      if (!window._heritageRegistry) window._heritageRegistry = new HeritageRegistry();
      return window._heritageRegistry.getHeritageReport(args.cardId);
    }
  },
  'heritage.stats': {
    description: 'Get heritage registry stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._heritageRegistry) window._heritageRegistry = new HeritageRegistry();
      return window._heritageRegistry.getChainStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HeritageNode, HeritageChain, HeritageRegistry, HeritageTools };
}
if (typeof window !== 'undefined') {
  window.HeritageNode = HeritageNode;
  window.HeritageChain = HeritageChain;
  window.HeritageRegistry = HeritageRegistry;
  window.HeritageTools = HeritageTools;
}