// ============================================================================
// Rune Inscription System — V103 Direction W
// ============================================================================
// Inscribe magical runes onto cards for passive/active effects.
// Runes can be applied, upgraded, or removed.
// ============================================================================

'use strict';

class RuneInscriptionEngine {
  constructor() {
    this.availableRunes = [
      { id: 'strength', name: '力量符文', type: 'attack', power: 5, cost: 200, description: '+5 Attack' },
      { id: 'defense', name: '防御符文', type: 'defense', power: 5, cost: 200, description: '+5 Block' },
      { id: 'swiftness', name: '迅捷符文', type: 'utility', power: 1, cost: 150, description: '+1 Card Draw' },
      { id: 'vampirism', name: '吸血符文', type: 'lifesteal', power: 2, cost: 300, description: '+2 Life Steal' },
      { id: 'frost', name: '寒冰符文', type: 'control', power: 3, cost: 250, description: '+3 Freeze Chance' },
      { id: 'fire', name: '火焰符文', type: 'attack', power: 8, cost: 350, description: '+8 Attack' }
    ];
    this.inscribedCards = new Map(); // cardId → [{runeId, level, slot}]
    this.inscriptionCount = 0;
    this.maxRunesPerCard = 3;
  }

  getRune(runeId) {
    return this.availableRunes.find(r => r.id === runeId) || null;
  }

  getRunesForCard(cardId) {
    return this.inscribedCards.get(cardId) || [];
  }

  canInscribe(cardId, runeId) {
    const runes = this.getRunesForCard(cardId);
    const rune = this.getRune(runeId);
    if (!rune) return { allowed: false, reason: 'invalid_rune' };
    if (runes.length >= this.maxRunesPerCard) return { allowed: false, reason: 'max_runes' };
    if (runes.some(r => r.runeId === runeId)) return { allowed: false, reason: 'already_inscribed' };
    return { allowed: true, slot: runes.length };
  }

  inscribe(cardId, runeId) {
    const check = this.canInscribe(cardId, runeId);
    if (!check.allowed) return null;
    const runes = this.getRunesForCard(cardId);
    const runeData = { runeId, level: 1, slot: check.slot };
    runes.push(runeData);
    this.inscribedCards.set(cardId, runes);
    this.inscriptionCount++;
    return this._applyRune(cardId, runeData);
  }

  upgradeRune(cardId, runeId) {
    const runes = this.getRunesForCard(cardId);
    const runeIndex = runes.findIndex(r => r.runeId === runeId);
    if (runeIndex < 0) return null;
    const runeData = runes[runeIndex];
    runeData.level = Math.min(runeData.level + 1, 5);
    runes[runeIndex] = runeData;
    return this._applyRune(cardId, runeData);
  }

  removeRune(cardId, runeId) {
    const runes = this.getRunesForCard(cardId);
    const filtered = runes.filter(r => r.runeId !== runeId);
    if (filtered.length === runes.length) return false;
    this.inscribedCards.set(cardId, filtered);
    return true;
  }

  _applyRune(cardId, runeData) {
    const rune = this.getRune(runeData.runeId);
    const power = rune.power * runeData.level;
    return {
      cardId,
      runeId: runeData.runeId,
      runeName: rune.name,
      level: runeData.level,
      power,
      slot: runeData.slot,
      type: rune.type,
      description: `${rune.description} (Lv.${runeData.level})`
    };
  }

  getStats() {
    return {
      totalInscriptions: this.inscriptionCount,
      inscribedCardCount: this.inscribedCards.size,
      maxRunesPerCard: this.maxRunesPerCard
    };
  }

  clearCard(cardId) {
    if (this.inscribedCards.has(cardId)) {
      this.inscribedCards.delete(cardId);
      return true;
    }
    return false;
  }
}

class RuneInventory {
  constructor() {
    this.purchasedRunes = new Set(); // runeId
    this.runeSlots = 3; // max rune slots per card
    this.inscriptionHistory = [];
  }

  purchaseRune(runeId) {
    this.purchasedRunes.add(runeId);
    this.inscriptionHistory.push({ runeId, action: 'purchase', timestamp: Date.now() });
  }

  hasRune(runeId) {
    return this.purchasedRunes.has(runeId);
  }

  getAllRunes() {
    return Array.from(this.purchasedRunes);
  }

  getHistory() {
    return this.inscriptionHistory.slice(-10);
  }
}

class RunePanel {
  constructor(engine, inventory) {
    this.engine = engine;
    this.inventory = inventory;
    this.isOpen = false;
    this.panel = null;
  }

  open() { this.isOpen = true; this._render(); }
  close() { this.isOpen = false; if (this.panel) { this.panel.remove(); this.panel = null; } }
  toggle() { if (this.isOpen) this.close(); else this.open(); }

  _render() {
    if (typeof document === 'undefined') return;
    this.panel = document.createElement('div');
    this.panel.id = 'rune-panel';
    this.panel.style.cssText = [
      'position:fixed;bottom:80px;right:20px;width:300px;background:rgba(20,20,10,0.95);',
      'border:2px solid #f39c12;border-radius:12px;padding:16px;z-index:9996;',
      'font-family:monospace;font-size:13px;color:#ecf0f1;'
    ].join('');
    this.panel.innerHTML = '<div style="color:#f39c12;font-weight:bold;margin-bottom:8px;">🔮 符文铭刻</div>';
    document.body.appendChild(this.panel);
  }

  getStats() {
    return {
      open: this.isOpen,
      inscriptions: this.engine.inscriptionCount,
      inscribedCards: this.engine.inscribedCards.size
    };
  }
}

// Shared engine instance for RuneTools (singleton pattern for tool-based access)
let _sharedEngine = null;
function getRuneEngine() {
  if (!_sharedEngine) _sharedEngine = new RuneInscriptionEngine();
  return _sharedEngine;
}

const RuneTools = {
  'rune.inscribe': {
    description: 'Inscribe a rune onto a card',
    parameters: { type: 'object', properties: { cardId: { type: 'string' }, runeId: { type: 'string' } }, required: ['cardId', 'runeId'] },
    handler(args) {
      const engine = getRuneEngine();
      const result = engine.inscribe(args.cardId, args.runeId);
      return result || { error: 'inscription_failed' };
    }
  },
  'rune.upgrade': {
    description: 'Upgrade a rune on a card',
    parameters: { type: 'object', properties: { cardId: { type: 'string' }, runeId: { type: 'string' } }, required: ['cardId', 'runeId'] },
    handler(args) {
      const engine = getRuneEngine();
      const result = engine.upgradeRune(args.cardId, args.runeId);
      return result || { error: 'upgrade_failed' };
    }
  },
  'rune.remove': {
    description: 'Remove a rune from a card',
    parameters: { type: 'object', properties: { cardId: { type: 'string' }, runeId: { type: 'string' } }, required: ['cardId', 'runeId'] },
    handler(args) {
      const engine = getRuneEngine();
      const result = engine.removeRune(args.cardId, args.runeId);
      return result || { error: 'remove_failed' };
    }
  },
  'rune.list': {
    description: 'List all runes inscribed on a card',
    parameters: { type: 'object', properties: { cardId: { type: 'string' } } },
    handler(args) {
      const engine = getRuneEngine();
      return engine.getRunesForCard(args.cardId);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RuneInscriptionEngine, RuneInventory, RunePanel, RuneTools };
}
if (typeof window !== 'undefined') {
  window.RuneInscriptionEngine = RuneInscriptionEngine;
  window.RuneInventory = RuneInventory;
  window.RunePanel = RunePanel;
  window.RuneTools = RuneTools;
}