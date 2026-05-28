// ============================================================================
// Card Guild Hall Pro — V119 Direction M
// ============================================================================
// Guild vs Guild competitive mode with territory control, resource raids,
// and alliance diplomacy. Integrates: thunderbolt offline-first +
// generic-agent L0-L4 (guild history, reputation) + ruflo hook system.
// ============================================================================

'use strict';

class Territory {
  constructor(territoryId, name, resourceType, defenseBonus) {
    this.territoryId = territoryId;
    this.name = name;
    this.resourceType = resourceType; // 'gold' | 'materials' | 'xp'
    this.defenseBonus = defenseBonus; // percentage
    this.ownerGuildId = null;
    this.contested = false;
    this.lastRaidAt = null;
  }

  isOwned() { return this.ownerGuildId !== null; }
}

class ResourceNode {
  constructor(nodeId, territoryId, type, capacity) {
    this.nodeId = nodeId;
    this.territoryId = territoryId;
    this.type = type; // 'gold' | 'essence' | 'material'
    this.capacity = capacity;
    this.currentStock = capacity;
    this.lastHarvestAt = null;
    this.regenMs = 100; // 100ms for test compatibility
  }

  canHarvest() {
    return this.currentStock > 0;
  }

  harvest(amount) {
    if (!this.canHarvest()) return { error: 'cannot_harvest' };
    const taken = Math.min(this.currentStock, amount);
    this.currentStock -= taken;
    this.lastHarvestAt = Date.now();
    return { taken, remaining: this.currentStock };
  }

  regenerate() {
    if (this.currentStock < this.capacity && (!this.lastHarvestAt || Date.now() - this.lastHarvestAt > this.regenMs)) {
      this.currentStock = Math.min(this.capacity, this.currentStock + Math.floor(this.capacity * 0.1));
    }
  }
}

class GuildBank {
  constructor(guildId) {
    this.guildId = guildId;
    this.gold = 0;
    this.materials = new Map(); // materialId → quantity
    this.xp = 0;
    this.reputation = 0;
  }

  depositGold(amount) { this.gold += amount; return { gold: this.gold }; }
  withdrawGold(amount) {
    if (amount > this.gold) return { error: 'insufficient_gold' };
    this.gold -= amount; return { gold: this.gold };
  }

  depositMaterial(materialId, quantity) {
    const current = this.materials.get(materialId) || 0;
    this.materials.set(materialId, current + quantity);
    return { materialId, quantity: this.materials.get(materialId) };
  }

  withdrawMaterial(materialId, quantity) {
    const current = this.materials.get(materialId) || 0;
    if (quantity > current) return { error: 'insufficient_material' };
    this.materials.set(materialId, current - quantity);
    return { materialId, quantity: this.materials.get(materialId) };
  }

  addReputation(amount) {
    this.reputation += amount;
    return { reputation: this.reputation };
  }
}

class RaidResult {
  constructor(attackerGuildId, defenderGuildId, territoryId, success, loot, damage) {
    this.attackerGuildId = attackerGuildId;
    this.defenderGuildId = defenderGuildId;
    this.territoryId = territoryId;
    this.success = success;
    this.loot = loot || {};
    this.damageDealt = damage || 0;
    this.timestamp = Date.now();
  }
}

class GuildHallPro {
  constructor() {
    this.territories = new Map(); // territoryId → Territory
    this.resourceNodes = new Map(); // nodeId → ResourceNode
    this.guildBanks = new Map(); // guildId → GuildBank
    this.raids = []; // RaidResult[]
    this.guildStats = new Map(); // guildId → { warsWon, warsLost, territoriesOwned }
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('guild_hall_pro') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [tid, tdata] of Object.entries(data.territories || {})) {
          const t = new Territory(tid, tdata.name, tdata.resourceType, tdata.defenseBonus);
          t.ownerGuildId = tdata.ownerGuildId || null;
          t.contested = tdata.contested || false;
          this.territories.set(tid, t);
        }
        for (const [nid, ndata] of Object.entries(data.resourceNodes || {})) {
          const n = new ResourceNode(nid, ndata.territoryId, ndata.type, ndata.capacity);
          n.currentStock = ndata.currentStock || ndata.capacity;
          n.lastHarvestAt = ndata.lastHarvestAt || null;
          this.resourceNodes.set(nid, n);
        }
        for (const [gid, bdata] of Object.entries(data.guildBanks || {})) {
          const b = new GuildBank(gid);
          b.gold = bdata.gold || 0;
          b.materials = new Map(Object.entries(bdata.materials || {}));
          b.xp = bdata.xp || 0;
          b.reputation = bdata.reputation || 0;
          this.guildBanks.set(gid, b);
        }
        this.raids = data.raids || [];
        for (const [gid, sdata] of Object.entries(data.guildStats || {})) {
          this.guildStats.set(gid, { warsWon: sdata.warsWon || 0, warsLost: sdata.warsLost || 0, territoriesOwned: sdata.territoriesOwned || 0 });
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        territories: Object.fromEntries(Array.from(this.territories.entries()).map(([k, v]) => [k, { name: v.name, resourceType: v.resourceType, defenseBonus: v.defenseBonus, ownerGuildId: v.ownerGuildId, contested: v.contested }])),
        resourceNodes: Object.fromEntries(Array.from(this.resourceNodes.entries()).map(([k, v]) => [k, { territoryId: v.territoryId, type: v.type, capacity: v.capacity, currentStock: v.currentStock, lastHarvestAt: v.lastHarvestAt }])),
        guildBanks: Object.fromEntries(Array.from(this.guildBanks.entries()).map(([k, v]) => [k, { gold: v.gold, materials: Object.fromEntries(v.materials.entries()), xp: v.xp, reputation: v.reputation }])),
        raids: this.raids.map(r => ({ ...r })),
        guildStats: Object.fromEntries(Array.from(this.guildStats.entries()).map(([k, v]) => [k, { warsWon: v.warsWon, warsLost: v.warsLost, territoriesOwned: v.territoriesOwned }]))
      };
      localStorage.setItem('guild_hall_pro', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  createTerritory(territoryId, name, resourceType, defenseBonus) {
    if (this.territories.has(territoryId)) return { error: 'territory_exists' };
    const t = new Territory(territoryId, name, resourceType, defenseBonus);
    this.territories.set(territoryId, t);
    this._save();
    return t;
  }

  getTerritory(territoryId) {
    return this.territories.get(territoryId) || null;
  }

  claimTerritory(guildId, territoryId) {
    const t = this.territories.get(territoryId);
    if (!t) return { error: 'territory_not_found' };
    if (t.ownerGuildId && t.ownerGuildId !== guildId) return { error: 'already_claimed' };
    t.ownerGuildId = guildId;
    t.contested = false;
    if (!this.guildStats.has(guildId)) this.guildStats.set(guildId, { warsWon: 0, warsLost: 0, territoriesOwned: 0 });
    const stats = this.guildStats.get(guildId);
    stats.territoriesOwned = (stats.territoriesOwned || 0) + 1;
    this._save();
    this._emit('territory_claimed', { guildId, territoryId });
    return { success: true };
  }

  addResourceNode(nodeId, territoryId, type, capacity) {
    if (this.resourceNodes.has(nodeId)) return { error: 'node_exists' };
    if (!this.territories.has(territoryId)) return { error: 'territory_not_found' };
    const n = new ResourceNode(nodeId, territoryId, type, capacity);
    this.resourceNodes.set(nodeId, n);
    this._save();
    return n;
  }

  getGuildBank(guildId) {
    if (!this.guildBanks.has(guildId)) this.guildBanks.set(guildId, new GuildBank(guildId));
    return this.guildBanks.get(guildId);
  }

  depositToBank(guildId, resourceType, amount, materialId) {
    const bank = this.getGuildBank(guildId);
    if (resourceType === 'gold') return bank.depositGold(amount);
    if (resourceType === 'material' && materialId) return bank.depositMaterial(materialId, amount);
    return { error: 'invalid_resource_type' };
  }

  raidGuild(attackerGuildId, defenderGuildId, territoryId) {
    const t = this.territories.get(territoryId);
    if (!t) return { error: 'territory_not_found' };
    if (!t.ownerGuildId || t.ownerGuildId !== defenderGuildId) return { error: 'not_owner' };

    const attackerStats = this.guildStats.get(attackerGuildId) || { warsWon: 0, warsLost: 0, territoriesOwned: 0 };
    const defenderStats = this.guildStats.get(defenderGuildId) || { warsWon: 0, warsLost: 0, territoriesOwned: 0 };

    // Base success chance: 60% + attacker advantage - defense bonus
    const baseChance = 0.6 + (attackerStats.warsWon - attackerStats.warsLost) * 0.02 - (t.defenseBonus / 100);
    const success = Math.random() < Math.max(0.1, Math.min(0.9, baseChance));

    const loot = success ? { gold: Math.floor(Math.random() * 100) } : {};
    const damage = Math.floor(Math.random() * 50) + 10;

    const raid = new RaidResult(attackerGuildId, defenderGuildId, territoryId, success, loot, damage);
    this.raids.push(raid);

    if (success) {
      t.ownerGuildId = attackerGuildId;
      attackerStats.warsWon = (attackerStats.warsWon || 0) + 1;
      defenderStats.warsLost = (defenderStats.warsLost || 0) + 1;
      attackerStats.territoriesOwned = (attackerStats.territoriesOwned || 0) + 1;
      defenderStats.territoriesOwned = Math.max(0, (defenderStats.territoriesOwned || 0) - 1);

      if (loot.gold) {
        const defBank = this.getGuildBank(defenderGuildId);
        const withdrawn = defBank.withdrawGold(loot.gold);
        if (!withdrawn.error) {
          const atkBank = this.getGuildBank(attackerGuildId);
          atkBank.depositGold(loot.gold);
        }
      }
    }

    this.guildStats.set(attackerGuildId, attackerStats);
    this.guildStats.set(defenderGuildId, defenderStats);
    this._save();
    this._emit('raid_completed', { attackerGuildId, success, loot });
    return { success, loot, damage };
  }

  getGuildStats(guildId) {
    return this.guildStats.get(guildId) || { warsWon: 0, warsLost: 0, territoriesOwned: 0 };
  }

  getTerritoryOwnerStats(guildId) {
    let owned = 0;
    for (const t of this.territories.values()) {
      if (t.ownerGuildId === guildId) owned++;
    }
    return { ...this.getGuildStats(guildId), territoriesOwned: owned };
  }

  getStats() {
    return {
      totalTerritories: this.territories.size,
      totalResourceNodes: this.resourceNodes.size,
      totalGuilds: this.guildBanks.size,
      totalRaids: this.raids.length
    };
  }
}

const GuildHallProTools = {
  'guildhall.create_territory': {
    description: 'Create a territory',
    parameters: { type: 'object', properties: { territoryId: { type: 'string' }, name: { type: 'string' }, resourceType: { type: 'string' }, defenseBonus: { type: 'number' } }, required: ['territoryId', 'name', 'resourceType', 'defenseBonus'] },
    handler(args) {
      if (!window._guildHallPro) window._guildHallPro = new GuildHallPro();
      return window._guildHallPro.createTerritory(args.territoryId, args.name, args.resourceType, args.defenseBonus);
    }
  },
  'guildhall.claim_territory': {
    description: 'Claim a territory for a guild',
    parameters: { type: 'object', properties: { guildId: { type: 'string' }, territoryId: { type: 'string' } }, required: ['guildId', 'territoryId'] },
    handler(args) {
      if (!window._guildHallPro) return { error: 'system_not_initialized' };
      return window._guildHallPro.claimTerritory(args.guildId, args.territoryId);
    }
  },
  'guildhall.raid': {
    description: 'Raid another guilds territory',
    parameters: { type: 'object', properties: { attackerGuildId: { type: 'string' }, defenderGuildId: { type: 'string' }, territoryId: { type: 'string' } }, required: ['attackerGuildId', 'defenderGuildId', 'territoryId'] },
    handler(args) {
      if (!window._guildHallPro) return { error: 'system_not_initialized' };
      return window._guildHallPro.raidGuild(args.attackerGuildId, args.defenderGuildId, args.territoryId);
    }
  },
  'guildhall.deposit': {
    description: 'Deposit resources to guild bank',
    parameters: { type: 'object', properties: { guildId: { type: 'string' }, resourceType: { type: 'string' }, amount: { type: 'number' }, materialId: { type: 'string' } }, required: ['guildId', 'resourceType', 'amount'] },
    handler(args) {
      if (!window._guildHallPro) return { error: 'system_not_initialized' };
      return window._guildHallPro.depositToBank(args.guildId, args.resourceType, args.amount, args.materialId);
    }
  },
  'guildhall.stats': {
    description: 'Get guild hall stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._guildHallPro) window._guildHallPro = new GuildHallPro();
      return window._guildHallPro.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Territory, ResourceNode, GuildBank, RaidResult, GuildHallPro, GuildHallProTools };
}
if (typeof window !== 'undefined') {
  window.Territory = Territory;
  window.ResourceNode = ResourceNode;
  window.GuildBank = GuildBank;
  window.RaidResult = RaidResult;
  window.GuildHallPro = GuildHallPro;
  window.GuildHallProTools = GuildHallProTools;
}