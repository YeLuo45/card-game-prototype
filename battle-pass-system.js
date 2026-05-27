// ============================================================================
// Card Battle Pass System — V111 Direction E
// ============================================================================
// Season-based battle pass with XP progression and tier rewards.
// Integrates: generic-agent L0-L4 progression + thunderbolt offline-first.
// ============================================================================

'use strict';

class BattlePass {
  constructor(passId, name, startDate, endDate) {
    this.passId = passId;
    this.name = name;
    this.startDate = startDate;
    this.endDate = endDate;
    this.status = 'active'; // active | completed | expired
    this.tiers = [];
    this._generateTiers();
  }

  _generateTiers() {
    const tierNames = [
      'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5',
      'Tier 6', 'Tier 7', 'Tier 8', 'Tier 9', 'Tier 10',
      'Tier 11', 'Tier 12', 'Tier 13', 'Tier 14', 'Tier 15',
      'Tier 16', 'Tier 17', 'Tier 18', 'Tier 19', 'Tier 20',
      'Tier 21', 'Tier 22', 'Tier 23', 'Tier 24', 'Tier 25',
      'Tier 26', 'Tier 27', 'Tier 28', 'Tier 29', 'Tier 30',
      'Tier 31', 'Tier 32', 'Tier 33', 'Tier 34', 'Tier 35',
      'Tier 36', 'Tier 37', 'Tier 38', 'Tier 39', 'Tier 40',
      'Tier 41', 'Tier 42', 'Tier 43', 'Tier 44', 'Tier 45',
      'Tier 46', 'Tier 47', 'Tier 48', 'Tier 49', 'Tier 50'
    ];
    const rewards = [
      '100 Gold', 'Common Card Pack', '150 Gold', 'Rare Card Pack',
      '200 Gold', '3x Common Cards', '250 Gold', 'Rare Card Pack',
      '300 Gold', 'Epic Card Pack', '350 Gold', '4x Rare Cards',
      '400 Gold', 'Legendary Card Pack', '500 Gold', '5x Rare Cards',
      '600 Gold', 'Epic Card Pack', '700 Gold', 'Legendary Card Pack',
      '800 Gold', '6x Rare Cards', '900 Gold', '7x Rare Cards',
      '1000 Gold', 'Epic Card Pack', '1200 Gold', 'Legendary Card Pack',
      '1500 Gold', '8x Rare Cards', '1800 Gold', 'Epic Card Pack',
      '2000 Gold', '10x Rare Cards', '2500 Gold', 'Legendary Card Pack',
      '3000 Gold', '15x Rare Cards', '3500 Gold', 'Epic Card Pack',
      '4000 Gold', 'Legendary Card Pack', '5000 Gold', '20x Rare Cards',
      '6000 Gold', '3x Legendary Cards', '8000 Gold', 'Crown'
    ];
    for (let i = 0; i < 50; i++) {
      this.tiers.push({
        tier: i + 1,
        name: tierNames[i] || `Tier ${i+1}`,
        xpRequired: (i + 1) * 100,
        reward: rewards[i] || '500 Gold',
        freeReward: i % 3 === 0 ? rewards[i] : null,
        premiumReward: rewards[i]
      });
    }
  }

  getTierForXP(xp) {
    for (let i = this.tiers.length - 1; i >= 0; i--) {
      if (xp >= this.tiers[i].xpRequired) return this.tiers[i];
    }
    return this.tiers[0];
  }

  getProgress(xp) {
    const tier = this.getTierForXP(xp);
    const tierIndex = this.tiers.indexOf(tier);
    const prevXP = tierIndex > 0 ? this.tiers[tierIndex - 1].xpRequired : 0;
    const progressInTier = xp - tier.xpRequired;  // XP earned within current tier
    const xpForNextTier = tierIndex < this.tiers.length - 1
        ? this.tiers[tierIndex + 1].xpRequired - tier.xpRequired
        : tier.xpRequired - prevXP;
    return {
      currentTier: tier,
      xp,
      progressInTier,
      xpForNextTier,
      percentToNext: Math.round(progressInTier / xpForNextTier * 100)
    };
  }
}

class PlayerBattlePass {
  constructor(playerId, passId) {
    this.playerId = playerId;
    this.passId = passId;
    this.xp = 0;
    this.level = 1;
    this.unlockedTiers = new Set([1]);
    this.premiumUnlocked = false;
    this.claimableTiers = new Set();
    this.claimedTiers = new Set();
    this.activityLog = [];
  }

  addXP(amount) {
    this.xp += amount;
    this.activityLog.push({ action: 'xp_earned', amount, timestamp: Date.now() });
    return this.xp;
  }

  unlockTier(tier) {
    this.unlockedTiers.add(tier);
    this.claimableTiers.add(tier);
  }

  claimTier(tier) {
    if (!this.claimableTiers.has(tier)) return false;
    if (this.claimedTiers.has(tier)) return false;
    this.claimedTiers.add(tier);
    this.activityLog.push({ action: 'tier_claimed', tier, timestamp: Date.now() });
    return true;
  }

  getUnclaimedTiers() {
    return Array.from(this.claimableTiers).filter(t => !this.claimedTiers.has(t)).sort((a, b) => a - b);
  }
}

class BattlePassSystem {
  constructor() {
    this.battlePasses = new Map();
    this.playerPasses = new Map(); // playerId → Map(passId → PlayerBattlePass)
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('battle_pass_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        // Reconstruct battle passes
        for (const bp of (data.battlePasses || [])) {
          const instance = new BattlePass(bp.passId, bp.name, bp.startDate, bp.endDate);
          instance.status = bp.status;
          this.battlePasses.set(bp.passId, instance);
        }
        // Reconstruct player passes
        for (const [pId, passes] of Object.entries(data.playerPasses || {})) {
          const pMap = new Map();
          for (const [passId, pp] of Object.entries(passes)) {
            const pbp = new PlayerBattlePass(pp.playerId, pp.passId);
            pbp.xp = pp.xp;
            pbp.premiumUnlocked = pp.premiumUnlocked;
            pbp.unlockedTiers = new Set(pp.unlockedTiers || [1]);
            pbp.claimableTiers = new Set(pp.claimableTiers || []);
            pbp.claimedTiers = new Set(pp.claimedTiers || []);
            pMap.set(passId, pbp);
          }
          this.playerPasses.set(pId, pMap);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const battlePasses = Array.from(this.battlePasses.values()).map(bp => ({
        passId: bp.passId, name: bp.name, startDate: bp.startDate, endDate: bp.endDate, status: bp.status
      }));
      const playerPasses = Object.fromEntries(Array.from(this.playerPasses.entries()).map(([k, v]) => [
        k, Object.fromEntries(Array.from(v.entries()).map(([pk, pv]) => [pk, {
          playerId: pv.playerId, passId: pv.passId, xp: pv.xp,
          premiumUnlocked: pv.premiumUnlocked,
          unlockedTiers: Array.from(pv.unlockedTiers),
          claimableTiers: Array.from(pv.claimableTiers),
          claimedTiers: Array.from(pv.claimedTiers)
        }]))
      ]));
      localStorage.setItem('battle_pass_system', JSON.stringify({ battlePasses, playerPasses }));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  createBattlePass(passId, name, startDate, endDate) {
    const bp = new BattlePass(passId, name, startDate, endDate);
    this.battlePasses.set(passId, bp);
    this._save();
    return bp;
  }

  getOrCreatePlayerPass(playerId, passId) {
    if (!this.playerPasses.has(playerId)) this.playerPasses.set(playerId, new Map());
    const pMap = this.playerPasses.get(playerId);
    if (!pMap.has(passId)) {
      const pbp = new PlayerBattlePass(playerId, passId);
      pMap.set(passId, pbp);
    }
    return pMap.get(passId);
  }

  addXP(playerId, passId, amount) {
    const bp = this.battlePasses.get(passId);
    if (!bp) return { error: 'pass_not_found' };
    const pbp = this.getOrCreatePlayerPass(playerId, passId);
    const prevXP = pbp.xp;
    const newXP = pbp.addXP(amount);
    const prevTier = bp.getTierForXP(prevXP);
    const newTier = bp.getTierForXP(newXP);
    // Auto-unlock tiers
    for (let t = 1; t <= newTier.tier; t++) {
      if (!bp.tiers[t-1]) continue;
      pbp.unlockedTiers.add(t);
      pbp.claimableTiers.add(t);
    }
    this._save();
    this._emit('xp_added', { playerId, passId, amount, newXP });
    return { xp: newXP, tier: newTier, unlocked: newTier.tier > prevTier.tier ? newTier.tier : null };
  }

  claimTierReward(playerId, passId, tier) {
    const bp = this.battlePasses.get(passId);
    if (!bp) return { error: 'pass_not_found' };
    const pbp = this.playerPasses.get(playerId)?.get(passId);
    if (!pbp) return { error: 'player_pass_not_found' };
    const tierData = bp.tiers[tier - 1];
    if (!tierData) return { error: 'invalid_tier' };
    if (!pbp.claimableTiers.has(tier)) return { error: 'tier_not_unlocked' };
    const claimed = pbp.claimTier(tier);
    if (!claimed) return { error: 'tier_already_claimed' };
    this._save();
    this._emit('tier_reward_claimed', { playerId, passId, tier, reward: tierData });
    return { success: true, reward: tierData };
  }

  unlockPremium(playerId, passId) {
    const pbp = this.playerPasses.get(playerId)?.get(passId);
    if (!pbp) return { error: 'player_pass_not_found' };
    pbp.premiumUnlocked = true;
    this._save();
    return { success: true };
  }

  getProgress(playerId, passId) {
    const bp = this.battlePasses.get(passId);
    const pbp = this.playerPasses.get(playerId)?.get(passId);
    if (!bp) return { error: 'pass_not_found' };
    if (!pbp) return { playerId, passId, xp: 0, currentTier: bp.tiers[0], unclaimedTiers: [] };
    const progress = bp.getProgress(pbp.xp);
    const unclaimedTiers = pbp.getUnclaimedTiers();
    return {
      playerId, passId,
      xp: pbp.xp,
      premiumUnlocked: pbp.premiumUnlocked,
      currentTier: progress.currentTier,
      progressInTier: progress.progressInTier,
      xpForNextTier: progress.xpForNextTier,
      percentToNext: progress.percentToNext,
      totalUnlocked: pbp.unlockedTiers.size,
      totalClaimed: pbp.claimedTiers.size,
      unclaimedTiers
    };
  }

  getAllRewards(playerId, passId) {
    const bp = this.battlePasses.get(passId);
    const pbp = this.playerPasses.get(playerId)?.get(passId);
    if (!bp) return { error: 'pass_not_found' };
    const result = [];
    for (const tier of bp.tiers) {
      const isUnlocked = pbp?.unlockedTiers.has(tier.tier) || false;
      const isClaimed = pbp?.claimedTiers.has(tier.tier) || false;
      result.push({ ...tier, isUnlocked, isClaimed, isPremium: true });
    }
    return result;
  }

  getStats() {
    return {
      totalBattlePasses: this.battlePasses.size,
      totalPlayers: this.playerPasses.size
    };
  }
}

const BattlePassTools = {
  'battlepass.create': {
    description: 'Create a new battle pass',
    parameters: { type: 'object', properties: { passId: { type: 'string' }, name: { type: 'string' } }, required: ['passId', 'name'] },
    handler(args) {
      const sys = window._battlePassSystem || new BattlePassSystem();
      if (window._battlePassSystem === undefined) window._battlePassSystem = sys;
      return sys.createBattlePass(args.passId, args.name, Date.now(), Date.now() + 30 * 86400000);
    }
  },
  'battlepass.add_xp': {
    description: 'Add XP to player battle pass',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, passId: { type: 'string' }, amount: { type: 'number' } }, required: ['playerId', 'passId', 'amount'] },
    handler(args) {
      if (!window._battlePassSystem) return { error: 'system_not_initialized' };
      return window._battlePassSystem.addXP(args.playerId, args.passId, args.amount);
    }
  },
  'battlepass.claim': {
    description: 'Claim a tier reward',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, passId: { type: 'string' }, tier: { type: 'number' } }, required: ['playerId', 'passId', 'tier'] },
    handler(args) {
      if (!window._battlePassSystem) return { error: 'system_not_initialized' };
      return window._battlePassSystem.claimTierReward(args.playerId, args.passId, args.tier);
    }
  },
  'battlepass.progress': {
    description: 'Get player battle pass progress',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, passId: { type: 'string' } }, required: ['playerId', 'passId'] },
    handler(args) {
      if (!window._battlePassSystem) return { error: 'system_not_initialized' };
      return window._battlePassSystem.getProgress(args.playerId, args.passId);
    }
  },
  'battlepass.stats': {
    description: 'Get battle pass system stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._battlePassSystem) return { error: 'system_not_initialized' };
      return window._battlePassSystem.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BattlePass, PlayerBattlePass, BattlePassSystem, BattlePassTools };
}
if (typeof window !== 'undefined') {
  window.BattlePass = BattlePass;
  window.PlayerBattlePass = PlayerBattlePass;
  window.BattlePassSystem = BattlePassSystem;
  window.BattlePassTools = BattlePassTools;
}