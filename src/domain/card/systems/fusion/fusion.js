// ============================================================================
// Card Fusion System — V100 Direction T
// ============================================================================
// Allow cards to absorb XP and evolve into stronger versions.
// Two fusion modes: (1) Same-type fusion (same card × 2 → +1 level),
//                   (2) Cross-type fusion (different types → hybrid card).
// ============================================================================

'use strict';

// --------------------------------------------------------------------------
// CardFusionEngine — core fusion logic
// --------------------------------------------------------------------------
class CardFusionEngine {
  constructor() {
    this.fusionCount = 0;
  }

  // Check if two cards can fuse
  canFuse(card1, card2) {
    if (!card1 || !card2) return { allowed: false, reason: 'missing_card' };
    if (!card1.name || !card2.name) return { allowed: false, reason: 'invalid_card' };
    if (card1.id === card2.id && card1.name === card2.name) {
      // Same-type fusion: always allowed if same card
      return { allowed: true, mode: 'same_type' };
    }
    // Cross-type fusion: different cards
    if (card1.type !== card2.type) {
      return { allowed: true, mode: 'cross_type' };
    }
    return { allowed: false, reason: 'same_type_different_card' };
  }

  // Execute fusion
  fuse(card1, card2, gameState = {}) {
    const check = this.canFuse(card1, card2);
    if (!check.allowed) return null;

    this.fusionCount++;
    if (check.mode === 'same_type') {
      return this._fuseSameType(card1);
    } else {
      return this._fuseCrossType(card1, card2);
    }
  }

  _fuseSameType(card) {
    const level = (card.fusionLevel || 1) + 1;
    const newCard = {
      ...card,
      id: `${card.id}_f${level}`,
      fusionLevel: level,
      name: `${card.name}+${level}`,
      damage: card.damage ? Math.round(card.damage * 1.3) : undefined,
      block: card.block ? Math.round(card.block * 1.3) : undefined,
      cost: card.cost ? Math.min(card.cost + 1, 10) : undefined,
      description: card.description
        ? `${card.description} [融合+${level}]`
        : `[融合+${level}]`,
      tags: [...(card.tags || []), 'fused', `level_${level}`]
    };
    return newCard;
  }

  _fuseCrossType(card1, card2) {
    // Hybrid: average stats, mixed type, combined name
    const type = `${card1.type}_hybrid`;
    return {
      id: `hybrid_${card1.id}_${card2.id}`,
      name: `${card1.name}/${card2.name}`,
      type,
      cost: Math.round(((card1.cost || 0) + (card2.cost || 0)) / 2),
      damage: Math.round(((card1.damage || 0) + (card2.damage || 0)) / 2),
      block: Math.round(((card1.block || 0) + (card2.block || 0)) / 2),
      cardDraw: Math.round(((card1.cardDraw || 0) + (card2.cardDraw || 0)) / 2),
      fusionLevel: 1,
      isHybrid: true,
      parentCards: [card1.id, card2.id],
      description: `[杂交] 融合 ${card1.name} 和 ${card2.name}`,
      tags: ['fused', 'hybrid', card1.type, card2.type]
    };
  }

  // Get XP cost to fuse a card to target level
  getXPCost(currentLevel, targetLevel) {
    let total = 0;
    for (let l = currentLevel; l < targetLevel; l++) {
      total += l * 100; // 100, 200, 300... per level
    }
    return total;
  }

  // Get max fusion level for a card
  getMaxFusionLevel(card) {
    return Math.max(3, (card.fusionLevel || 1) + 2);
  }
}

// --------------------------------------------------------------------------
// FusionInventory — tracks fused cards in inventory
// --------------------------------------------------------------------------
class FusionInventory {
  constructor() {
    this.fusedCards = new Map(); // cardId → card
    this.fusionHistory = []; // [{result, parents, timestamp}]
  }

  addFusedCard(card) {
    this.fusedCards.set(card.id, card);
    this.fusionHistory.push({
      cardId: card.id,
      name: card.name,
      fusionLevel: card.fusionLevel || 1,
      timestamp: Date.now()
    });
  }

  getFusedCard(cardId) {
    return this.fusedCards.get(cardId) || null;
  }

  hasFusedVariant(cardId) {
    return this.fusedCards.has(cardId);
  }

  getFusionHistory() {
    return this.fusionHistory;
  }

  getFusionCount() {
    return this.fusionHistory.length;
  }
}

// --------------------------------------------------------------------------
// FusionPanel — UI for the fusion interface
// --------------------------------------------------------------------------
class FusionPanel {
  constructor(engine, inventory) {
    this.engine = engine;
    this.inventory = inventory;
    this.isOpen = false;
    this.panel = null;
    this.selectedCards = [];
    this.maxSelect = 2;
  }

  open() {
    this.isOpen = true;
    this._render();
  }

  close() {
    this.isOpen = false;
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  selectCard(card) {
    const existing = this.selectedCards.findIndex(c => c.id === card.id);
    if (existing >= 0) {
      this.selectedCards.splice(existing, 1);
    } else if (this.selectedCards.length < this.maxSelect) {
      this.selectedCards.push(card);
    }
    this._updateSelection();
  }

  executeFusion() {
    if (this.selectedCards.length !== 2) return null;
    const result = this.engine.fuse(this.selectedCards[0], this.selectedCards[1]);
    if (result) {
      this.inventory.addFusedCard(result);
      this.selectedCards = [];
      this._updateResult(result);
    }
    return result;
  }

  _render() {
    // Creates a simple fusion panel DOM element
    if (typeof document === 'undefined') return;
    this.panel = document.createElement('div');
    this.panel.id = 'fusion-panel';
    this.panel.style.cssText = [
      'position:fixed;bottom:80px;right:20px;width:320px;background:rgba(10,10,30,0.95);',
      'border:2px solid #9b59b6;border-radius:12px;padding:16px;z-index:9999;',
      'font-family:monospace;font-size:13px;color:#ecf0f1;'
    ].join('');
    this.panel.innerHTML = '<div style="color:#9b59b6;font-weight:bold;margin-bottom:8px;">⚗️ 卡牌融合</div>';
    document.body.appendChild(this.panel);
  }

  _updateSelection() {
    if (!this.panel) return;
    const selDiv = this.panel.querySelector('#fusion-selection') ||
      (() => { const d = document.createElement('div'); d.id = 'fusion-selection'; this.panel.appendChild(d); return d; })();
    selDiv.textContent = `已选择: ${this.selectedCards.map(c => c.name).join(' + ') || '(无)'}`;
  }

  _updateResult(result) {
    if (!this.panel) return;
    const resDiv = this.panel.querySelector('#fusion-result') ||
      (() => { const d = document.createElement('div'); d.id = 'fusion-result'; this.panel.appendChild(d); return d; })();
    resDiv.textContent = result ? `结果: ${result.name}` : '融合失败';
  }

  getStats() {
    return {
      fusionOpen: this.isOpen,
      selectedCount: this.selectedCards.length,
      historyCount: this.inventory.getFusionCount(),
      totalFusions: this.engine.fusionCount
    };
  }
}

// --------------------------------------------------------------------------
// FusionTools — MCP tools for fusion system
// --------------------------------------------------------------------------
const FusionTools = {
  'fusion.canFuse': {
    description: 'Check if two cards can be fused together',
    parameters: {
      type: 'object',
      properties: {
        card1: { type: 'object' },
        card2: { type: 'object' }
      },
      required: ['card1', 'card2']
    },
    handler(args, context) {
      const engine = new CardFusionEngine();
      return engine.canFuse(args.card1, args.card2);
    }
  },
  'fusion.execute': {
    description: 'Execute fusion of two cards',
    parameters: {
      type: 'object',
      properties: {
        card1: { type: 'object' },
        card2: { type: 'object' }
      },
      required: ['card1', 'card2']
    },
    handler(args, context) {
      const engine = new CardFusionEngine();
      const result = engine.fuse(args.card1, args.card2, context.gameState || {});
      return result || { error: 'fusion_failed' };
    }
  },
  'fusion.getInventory': {
    description: 'Get fusion inventory status',
    parameters: { type: 'object', properties: {} },
    handler(args, context) {
      if (!context.inventory) return { error: 'no_inventory' };
      return {
        count: context.inventory.getFusionCount(),
        history: context.inventory.getFusionHistory().slice(-10)
      };
    }
  }
};

// --------------------------------------------------------------------------
// Export for Node.js testing / browser global
// --------------------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardFusionEngine, FusionInventory, FusionPanel, FusionTools };
}
if (typeof window !== 'undefined') {
  window.CardFusionEngine = CardFusionEngine;
  window.FusionInventory = FusionInventory;
  window.FusionPanel = FusionPanel;
  window.FusionTools = FusionTools;
}