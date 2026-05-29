// ============================================================================
// Card Cosmetic System — V109 Direction C
// ============================================================================
// Card skins/frames/borders with rarity tiers and unlock rewards.
// Integrates: ruflo hook system + thunderbolt offline-first.
// ============================================================================

'use strict';

class CardCosmetic {
  constructor(cosmeticId, name, type, rarity, price, unlockCondition) {
    this.cosmeticId = cosmeticId;
    this.name = name;
    this.type = type; // 'frame' | 'border' | 'effect' | 'avatar' | 'back'
    this.rarity = rarity; // 'common' | 'rare' | 'epic' | 'legendary'
    this.price = price;
    this.unlockCondition = unlockCondition; // null = direct purchase
    this.unlockedAt = null;
    this.owned = false;
  }

  getRarityColor() {
    const colors = { common: '#bdc3c7', rare: '#3498db', epic: '#9b59b6', legendary: '#f39c12' };
    return colors[this.rarity] || '#bdc3c7';
  }
}

class CosmeticShop {
  constructor() {
    this.cosmetics = new Map();
    this.ownedCosmetics = new Map(); // playerId → Set of cosmeticIds
    this.equippedCosmetics = new Map(); // playerId → { frame, border, effect, back }
    this.transactionLog = [];
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('cosmetic_shop') : null;
      if (raw) {
        const data = JSON.parse(raw);
        this.ownedCosmetics = new Map(Object.entries(data.ownedCosmetics || {}).map(([k, v]) => [k, new Set(v)]));
        this.equippedCosmetics = new Map(Object.entries(data.equippedCosmetics || {}));
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const serializable = {};
      for (const [k, v] of this.ownedCosmetics) serializable[k] = Array.from(v);
      localStorage.setItem('cosmetic_shop', JSON.stringify({
        ownedCosmetics: serializable,
        equippedCosmetics: Object.fromEntries(this.equippedCosmetics)
      }));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  registerCosmetic(cosmetic) {
    this.cosmetics.set(cosmetic.cosmeticId, cosmetic);
    return cosmetic;
  }

  registerDefaultCosmetics() {
    const defaults = [
      new CardCosmetic('frame_default', '默认边框', 'frame', 'common', 0, null),
      new CardCosmetic('frame_gold', '黄金边框', 'frame', 'rare', 500, null),
      new CardCosmetic('frame_crystal', '水晶边框', 'frame', 'epic', 1500, null),
      new CardCosmetic('frame_legendary', '传奇边框', 'frame', 'legendary', 5000, null),
      new CardCosmetic('border_simple', '简约边框', 'border', 'common', 0, null),
      new CardCosmetic('border_ornate', '华丽边框', 'border', 'rare', 800, null),
      new CardCosmetic('effect_fire', '火焰特效', 'effect', 'epic', 2000, null),
      new CardCosmetic('effect_ice', '冰霜特效', 'effect', 'rare', 1000, null),
      new CardCosmetic('effect_lightning', '闪电特效', 'effect', 'legendary', 8000, null),
      new CardCosmetic('effect_shadow', '暗影特效', 'effect', 'epic', 2500, null),
      new CardCosmetic('back_classic', '经典卡背', 'back', 'common', 0, null),
      new CardCosmetic('back_galaxy', '星河卡背', 'back', 'rare', 1200, null),
      new CardCosmetic('back_dragon', '龙纹卡背', 'back', 'legendary', 10000, { type: 'achievement', id: 'tournament_win' }),
      new CardCosmetic('avatar_default', '默认头像', 'avatar', 'common', 0, null),
      new CardCosmetic('avatar_king', '国王头像', 'avatar', 'epic', 3000, { type: 'achievement', id: 'win_100' }),
    ];
    for (const c of defaults) this.registerCosmetic(c);
    return defaults.length;
  }

  purchaseCosmetic(playerId, cosmeticId, currency = 'gold') {
    const cosmetic = this.cosmetics.get(cosmeticId);
    if (!cosmetic) return { error: 'cosmetic_not_found' };
    const owned = this.ownedCosmetics.get(playerId) || new Set();
    if (owned.has(cosmeticId)) return { error: 'already_owned' };

    const transaction = {
      playerId, cosmeticId, currency,
      timestamp: Date.now(), status: 'success'
    };
    this.transactionLog.push(transaction);
    owned.add(cosmeticId);
    this.ownedCosmetics.set(playerId, owned);
    this._save();
    this._emit('cosmetic_purchased', { playerId, cosmeticId, rarity: cosmetic.rarity });
    return { success: true, cosmetic: { ...cosmetic, owned: true } };
  }

  equipCosmetic(playerId, cosmeticId, slot) {
    const cosmetic = this.cosmetics.get(cosmeticId);
    if (!cosmetic) return { error: 'cosmetic_not_found' };
    const owned = this.ownedCosmetics.get(playerId) || new Set();
    if (!owned.has(cosmeticId)) return { error: 'not_owned' };
    if (cosmetic.type !== slot && !(slot === 'frame' && cosmetic.type === 'border')) {
      // Allow border to be equipped as frame
    }

    if (!this.equippedCosmetics.has(playerId)) this.equippedCosmetics.set(playerId, {});
    const equipped = this.equippedCosmetics.get(playerId);
    equipped[slot] = cosmeticId;
    this._save();
    this._emit('cosmetic_equipped', { playerId, cosmeticId, slot });
    return { success: true, equipped };
  }

  getOwnedCosmetics(playerId) {
    const ids = this.ownedCosmetics.get(playerId) || new Set();
    return Array.from(ids).map(id => ({ ...this.cosmetics.get(id), owned: true })).filter(c => c);
  }

  getEquippedCosmetics(playerId) {
    const equipped = this.equippedCosmetics.get(playerId) || {};
    const result = {};
    for (const [slot, cosmeticId] of Object.entries(equipped)) {
      const c = this.cosmetics.get(cosmeticId);
      if (c) result[slot] = { ...c, owned: true };
    }
    return result;
  }

  getShopInventory() {
    return Array.from(this.cosmetics.values()).map(c => ({ ...c, owned: false }));
  }

  getCosmeticsByRarity(rarity) {
    return Array.from(this.cosmetics.values()).filter(c => c.rarity === rarity);
  }

  getStats() {
    const totalCosmetics = this.cosmetics.size;
    const byType = {};
    for (const c of this.cosmetics.values()) byType[c.type] = (byType[c.type] || 0) + 1;
    const transactions = this.transactionLog.length;
    const recentTransactions = this.transactionLog.slice(-10);
    return { totalCosmetics, byType, transactions, recentTransactions };
  }
}

const CosmeticTools = {
  'cosmetic.shop': {
    description: 'Get shop inventory',
    parameters: { type: 'object', properties: {} },
    handler() {
      return window._cosmeticShop ? window._cosmeticShop.getShopInventory() : [];
    }
  },
  'cosmetic.purchase': {
    description: 'Purchase a cosmetic',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, cosmeticId: { type: 'string' } }, required: ['playerId', 'cosmeticId'] },
    handler(args) {
      if (!window._cosmeticShop) return { error: 'shop_not_initialized' };
      return window._cosmeticShop.purchaseCosmetic(args.playerId, args.cosmeticId);
    }
  },
  'cosmetic.equip': {
    description: 'Equip a cosmetic',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, cosmeticId: { type: 'string' }, slot: { type: 'string' } }, required: ['playerId', 'cosmeticId', 'slot'] },
    handler(args) {
      if (!window._cosmeticShop) return { error: 'shop_not_initialized' };
      return window._cosmeticShop.equipCosmetic(args.playerId, args.cosmeticId, args.slot);
    }
  },
  'cosmetic.owned': {
    description: 'Get owned cosmetics for player',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
    handler(args) {
      if (!window._cosmeticShop) return [];
      return window._cosmeticShop.getOwnedCosmetics(args.playerId);
    }
  },
  'cosmetic.stats': {
    description: 'Get shop statistics',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._cosmeticShop) return { error: 'shop_not_initialized' };
      return window._cosmeticShop.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardCosmetic, CosmeticShop, CosmeticTools };
}
if (typeof window !== 'undefined') {
  window.CardCosmetic = CardCosmetic;
  window.CosmeticShop = CosmeticShop;
  window.CosmeticTools = CosmeticTools;
}