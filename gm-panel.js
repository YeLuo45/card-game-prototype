// ============================================================================
// GM Panel — Game Master Debug Console
// ============================================================================
// Adds admin capabilities to quickly provision resources, unlock content,
// set levels, and verify game features. Toggle via settings panel.
// nanobot registry + ruflo hook system + thunderbolt offline-first.
// ============================================================================

'use strict';

// ------------------------------------------------------------------------.----
// GMCommand — individual admin command
// ------------------------------------------------------------------------.----
class GMCommand {
  constructor(id, label, category, handler, description) {
    this.id = id; this.label = label; this.category = category;
    this.handler = handler; this.description = description;
  }
  execute(args, context) { return this.handler(args, context); }
}

// ------------------------------------------------------------------------.----
// GMSettings — persistent GM preferences
// ------------------------------------------------------------------------.----
class GMSettings {
  constructor() {
    this.enabled = false;
    this.hidden = true;
    this.logToConsole = false;
    this.confirmDangerous = true; // confirm before destructive ops
    this._load();
  }
  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('gm_settings') : null;
      if (raw) { const d = JSON.parse(raw); Object.assign(this, d); }
    } catch {}
  }
  _save() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gm_settings', JSON.stringify({
        enabled: this.enabled, hidden: this.hidden,
        logToConsole: this.logToConsole, confirmDangerous: this.confirmDangerous
      }));
    }
  }
  enable() { this.enabled = true; this._save(); }
  disable() { this.enabled = false; this._save(); }
  toggle() { this.enabled = !this.enabled; this._save(); return this.enabled; }
}

// ------------------------------------------------------------------------.----
// GMLogger — audit log for GM actions
// ------------------------------------------------------------------------.----
class GMLogger {
  constructor(maxEntries = 200) {
    this.entries = [];
    this.maxEntries = maxEntries;
  }
  log(action, actor, detail) {
    this.entries.push({ timestamp: Date.now(), action, actor, detail });
    if (this.entries.length > this.maxEntries) this.entries.shift();
  }
  getEntries(limit) {
    return this.entries.slice(-limit || this.maxEntries);
  }
  clear() { this.entries = []; }
}

// ------------------------------------------------------------------------.----
// GMConsole — main Game Master system
// ------------------------------------------------------------------------.----
class GMConsole {
  constructor() {
    this.settings = new GMSettings();
    this.logger = new GMLogger();
    this.hooks = [];
    this._commands = new Map();
    this._playerCache = new Map(); // playerId → mock player state
    this._resourceCache = new Map(); // playerId → resource balances
    this._initCommands();
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('gm_console') : null;
      if (raw) {
        const d = JSON.parse(raw);
        // Restore player caches
        for (const [pid, data] of Object.entries(d.playerCache || {})) {
          this._playerCache.set(pid, data);
        }
        for (const [pid, res] of Object.entries(d.resourceCache || {})) {
          this._resourceCache.set(pid, res);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        playerCache: Object.fromEntries(this._playerCache.entries()),
        resourceCache: Object.fromEntries(this._resourceCache.entries())
      };
      localStorage.setItem('gm_console', JSON.stringify(data));
    }
  }

  _initCommands() {
    // --- Resources ---
    this._add(new GMCommand('gold.add', 'Add Gold', 'Resources',
      (args) => {
        const amt = parseInt(args.amount) || 0;
        if (amt <= 0) return { error: 'amount must be positive' };
        const pid = args.playerId || 'default';
        const res = this._getRes(pid);
        res.gold = (res.gold || 0) + amt;
        this._setRes(pid, res);
        this._log('gold.add', pid, { amount: amt, total: res.gold });
        return { success: true, gold: res.gold };
      }, 'Add gold to player account'));

    this._add(new GMCommand('gold.set', 'Set Gold', 'Resources',
      (args) => {
        const amt = parseInt(args.amount) || 0;
        if (amt < 0) return { error: 'amount must be non-negative' };
        const pid = args.playerId || 'default';
        const res = this._getRes(pid);
        res.gold = amt;
        this._setRes(pid, res);
        this._log('gold.set', pid, { amount: amt });
        return { success: true, gold: amt };
      }, 'Set gold to exact amount'));

    this._add(new GMCommand('gems.add', 'Add Gems', 'Resources',
      (args) => {
        const amt = parseInt(args.amount) || 0;
        if (amt <= 0) return { error: 'amount must be positive' };
        const pid = args.playerId || 'default';
        const res = this._getRes(pid);
        res.gems = (res.gems || 0) + amt;
        this._setRes(pid, res);
        this._log('gems.add', pid, { amount: amt, total: res.gems });
        return { success: true, gems: res.gems };
      }, 'Add gems'));

    this._add(new GMCommand('gems.set', 'Set Gems', 'Resources',
      (args) => {
        const amt = parseInt(args.amount) || 0;
        if (amt < 0) return { error: 'amount must be non-negative' };
        const pid = args.playerId || 'default';
        const res = this._getRes(pid);
        res.gems = amt;
        this._setRes(pid, res);
        this._log('gems.set', pid, { amount: amt });
        return { success: true, gems: amt };
      }, 'Set gems to exact amount'));

    this._add(new GMCommand('essence.add', 'Add Essence', 'Resources',
      (args) => {
        const amt = parseInt(args.amount) || 0;
        const type = args.type || 'rare';
        if (amt <= 0) return { error: 'amount must be positive' };
        const pid = args.playerId || 'default';
        const res = this._getRes(pid);
        if (!res.essence) res.essence = {};
        res.essence[type] = (res.essence[type] || 0) + amt;
        this._setRes(pid, res);
        this._log('essence.add', pid, { type, amount: amt });
        return { success: true, essence: res.essence };
      }, 'Add essence by type (common/rare/epic/legendary)'));

    this._add(new GMCommand('resources.set_all', 'Set All Resources', 'Resources',
      (args) => {
        const pid = args.playerId || 'default';
        const res = this._getRes(pid);
        res.gold = parseInt(args.gold) || res.gold || 0;
        res.gems = parseInt(args.gems) || res.gems || 0;
        this._setRes(pid, res);
        this._log('resources.set_all', pid, { gold: res.gold, gems: res.gems });
        return { success: true, ...res };
      }, 'Set gold and gems at once'));

    this._add(new GMCommand('resources.get', 'Get Resources', 'Resources',
      (args) => {
        const pid = args.playerId || 'default';
        return this._getRes(pid);
      }, 'Get current resource balances for player'));

    // --- Level & XP ---
    this._add(new GMCommand('level.set', 'Set Level', 'Level & XP',
      (args) => {
        const lvlRaw = parseInt(args.level);
        if (isNaN(lvlRaw) || lvlRaw < 1 || lvlRaw > 100) return { error: 'level 1-100' };
        const lvl = lvlRaw;
        const pid = args.playerId || 'default';
        const p = this._getPlayer(pid);
        p.level = lvl;
        p.xp = 0;
        this._setPlayer(pid, p);
        this._log('level.set', pid, { level: lvl });
        return { success: true, level: lvl, xp: 0 };
      }, 'Set player level (1-100)'));

    this._add(new GMCommand('xp.add', 'Add XP', 'Level & XP',
      (args) => {
        const amt = parseInt(args.amount) || 0;
        if (amt <= 0) return { error: 'amount must be positive' };
        const pid = args.playerId || 'default';
        const p = this._getPlayer(pid);
        p.xp = (p.xp || 0) + amt;
        // Level = floor(previous_levels_xp_threshold + current_xp / 1000) capped at 100
        // Approximate: total XP accumulated / 1000 + 1, capped at 100
        const prevLvl = p.level;
        const newLvl = Math.min(100, Math.floor(p.xp / 1000) + 1);
        const leveled = newLvl > prevLvl;
        if (leveled) p.level = newLvl;
        this._setPlayer(pid, p);
        this._log('xp.add', pid, { amount: amt, xp: p.xp, level: p.level });
        return { success: true, xp: p.xp, level: p.level, leveledUp: leveled };
      }, 'Add XP (1000 XP = 1 level)'));

    this._add(new GMCommand('xp.set', 'Set XP', 'Level & XP',
      (args) => {
        const amt = Math.max(0, parseInt(args.xp) || 0);
        const pid = args.playerId || 'default';
        const p = this._getPlayer(pid);
        p.xp = amt;
        // Level N requires N*1000 XP total (level 1 = 0, level 2 = 2000, level 3 = 3000)
        p.level = Math.min(100, Math.floor(amt / 1000) + 1);
        this._setPlayer(pid, p);
        this._log('xp.set', pid, { xp: amt, level: p.level });
        return { success: true, xp: amt, level: p.level };
      }, 'Set XP directly'));

    this._add(new GMCommand('level.max', 'Max Level', 'Level & XP',
      (args) => {
        const pid = args.playerId || 'default';
        const p = this._getPlayer(pid);
        p.level = 100;
        p.xp = 0;
        this._setPlayer(pid, p);
        this._log('level.max', pid, { level: 100 });
        return { success: true, level: 100, xp: 0 };
      }, 'Set level to max (100)'));

    // --- Cards ---
    this._add(new GMCommand('cards.add', 'Add Card', 'Cards',
      (args) => {
        const cardId = args.cardId || 'card_unknown';
        const rarity = args.rarity || 'common';
        const pid = args.playerId || 'default';
        if (!this._playerCache.has(pid)) this._getPlayer(pid);
        const p = this._getPlayer(pid);
        if (!p.cards) p.cards = [];
        const newCard = { id: `gm_${cardId}_${Date.now()}`, cardId, rarity, level: 1, enchanted: false };
        p.cards.push(newCard);
        this._setPlayer(pid, p);
        this._log('cards.add', pid, { cardId, rarity });
        return { success: true, card: newCard, totalCards: p.cards.length };
      }, 'Add a card to inventory'));

    this._add(new GMCommand('cards.add_many', 'Add Cards (Bulk)', 'Cards',
      (args) => {
        const count = Math.min(parseInt(args.count) || 5, 100);
        const cardId = args.cardId || 'card_fire';
        const rarity = args.rarity || 'common';
        const pid = args.playerId || 'default';
        if (!this._playerCache.has(pid)) this._getPlayer(pid);
        const p = this._getPlayer(pid);
        if (!p.cards) p.cards = [];
        for (let i = 0; i < count; i++) {
          p.cards.push({ id: `gm_${cardId}_${Date.now()}_${i}`, cardId, rarity, level: 1, enchanted: false });
        }
        this._setPlayer(pid, p);
        this._log('cards.add_many', pid, { cardId, count });
        return { success: true, count, totalCards: p.cards.length };
      }, 'Add multiple copies of a card'));

    this._add(new GMCommand('cards.clear', 'Clear Cards', 'Cards',
      (args) => {
        const pid = args.playerId || 'default';
        const p = this._getPlayer(pid);
        const count = p.cards ? p.cards.length : 0;
        p.cards = [];
        this._setPlayer(pid, p);
        this._log('cards.clear', pid, { count });
        return { success: true, cleared: count };
      }, 'Remove all cards from inventory (destructive)'));

    this._add(new GMCommand('cards.list', 'List Cards', 'Cards',
      (args) => {
        const pid = args.playerId || 'default';
        const p = this._getPlayer(pid);
        return { cards: p.cards || [], count: (p.cards || []).length };
      }, 'List all cards in inventory'));

    // --- Achievements ---
    this._add(new GMCommand('achievement.unlock', 'Unlock Achievement', 'Achievements',
      (args) => {
        const achId = args.achievementId || 'first_blood';
        const pid = args.playerId || 'default';
        if (!this._playerCache.has(pid)) this._getPlayer(pid);
        const p = this._getPlayer(pid);
        if (!p.achievements) p.achievements = new Set();
        p.achievements.add(achId);
        this._setPlayer(pid, p);
        this._log('achievement.unlock', pid, { achievementId: achId });
        this._emit('gm_achievement_unlocked', { playerId: pid, achievementId: achId });
        return { success: true, achievementId: achId, totalUnlocked: p.achievements.size };
      }, 'Unlock a specific achievement'));

    this._add(new GMCommand('achievement.unlock_all', 'Unlock All Achievements', 'Achievements',
      (args) => {
        const pid = args.playerId || 'default';
        if (!this._playerCache.has(pid)) this._getPlayer(pid);
        const p = this._getPlayer(pid);
        if (!p.achievements) p.achievements = new Set();
        const knownAchs = ['first_blood', 'collector_10', 'collector_50', 'veteran_50', 'champion', 'legendary'];
        for (const ach of knownAchs) p.achievements.add(ach);
        this._setPlayer(pid, p);
        this._log('achievement.unlock_all', pid, { count: knownAchs.length });
        return { success: true, unlocked: knownAchs.length };
      }, 'Unlock all known achievements'));

    // --- Matches ---
    this._add(new GMCommand('match.simulate', 'Simulate Match', 'Matches',
      (args) => {
        const pid = args.playerId || 'default';
        const won = args.won !== undefined ? !!args.won : true;
        if (!this._playerCache.has(pid)) this._getPlayer(pid);
        const p = this._getPlayer(pid);
        if (!p.matchHistory) p.matchHistory = [];
        p.matchHistory.push({ won, timestamp: Date.now(), opponent: 'gm_opponent' });
        if (p.matchHistory.length > 100) p.matchHistory.shift();
        this._setPlayer(pid, p);
        this._log('match.simulate', pid, { won });
        return { success: true, won, totalMatches: p.matchHistory.length };
      }, 'Record a won/lost match for player'));

    this._add(new GMCommand('match.set_streak', 'Set Win Streak', 'Matches',
      (args) => {
        const streak = Math.max(0, parseInt(args.streak) || 0);
        const pid = args.playerId || 'default';
        if (!this._playerCache.has(pid)) this._getPlayer(pid);
        const p = this._getPlayer(pid);
        if (!p.matchHistory) p.matchHistory = [];
        // Wipe and create new streak
        p.matchHistory = [];
        for (let i = 0; i < streak; i++) {
          p.matchHistory.push({ won: true, timestamp: Date.now() - (streak - i) * 60000, opponent: 'gm_opponent' });
        }
        this._setPlayer(pid, p);
        this._log('match.set_streak', pid, { streak });
        return { success: true, streak };
      }, 'Set a win streak of N wins'));

    // --- General ---
    this._add(new GMCommand('player.get', 'Get Player', 'General',
      (args) => {
        const pid = args.playerId || 'default';
        const p = this._getPlayer(pid);
        // Serialize: achievements Set → Array for safe return
        return {
          id: p.id, level: p.level, xp: p.xp,
          cards: p.cards || [],
          achievements: Array.isArray(p.achievements) ? p.achievements : Array.from(p.achievements || []),
          matchHistory: p.matchHistory || []
        };
      }, 'Get full player state'));

    this._add(new GMCommand('player.reset', 'Reset Player', 'General',
      (args) => {
        const pid = args.playerId || 'default';
        this._playerCache.delete(pid);
        this._resourceCache.delete(pid);
        this._log('player.reset', pid, {});
        return { success: true, playerId: pid };
      }, 'Reset player to empty state (destructive)'));

    this._add(new GMCommand('gm.status', 'GM Status', 'General',
      (args) => {
        return {
          enabled: this.settings.enabled,
          hidden: this.settings.hidden,
          commandCount: this._commands.size,
          cachedPlayers: this._playerCache.size,
          logEntries: this.logger.entries.length
        };
      }, 'Get GM system status'));

    this._add(new GMCommand('gm.toggle', 'Toggle GM', 'General',
      (args) => {
        const newState = this.settings.toggle();
        this._log('gm.toggle', 'system', { enabled: newState });
        return { enabled: newState };
      }, 'Toggle GM mode on/off'));

    this._add(new GMCommand('log.get', 'Get GM Log', 'General',
      (args) => {
        return { entries: this.logger.getEntries(parseInt(args.limit) || 50) };
      }, 'Get recent GM action log'));

    this._add(new GMCommand('log.clear', 'Clear GM Log', 'General',
      (args) => {
        this.logger.clear();
        return { success: true };
      }, 'Clear GM action log'));
  }

  _add(cmd) { this._commands.set(cmd.id, cmd); }

  _getPlayer(playerId) {
    if (!this._playerCache.has(playerId)) {
      this._playerCache.set(playerId, { id: playerId, level: 1, xp: 0, cards: [], achievements: new Set(), matchHistory: [] });
    }
    const p = this._playerCache.get(playerId);
    // achievements may be stored as Array (after _setPlayer serialize) — convert back to Set
    if (Array.isArray(p.achievements)) {
      p.achievements = new Set(p.achievements);
    }
    return p;
  }

  _setPlayer(playerId, data) {
    // achievements Set doesn't serialize to JSON cleanly
    const serializable = { ...data };
    if (serializable.achievements instanceof Set) {
      serializable.achievements = Array.from(serializable.achievements);
    }
    this._playerCache.set(playerId, serializable);
    this._save();
    // Return reference to cached copy so callers can continue mutating it
    return this._playerCache.get(playerId);
  }

  _getRes(playerId) {
    if (!this._resourceCache.has(playerId)) {
      this._resourceCache.set(playerId, { gold: 0, gems: 0, essence: {} });
    }
    return this._resourceCache.get(playerId);
  }

  _setRes(playerId, data) {
    this._resourceCache.set(playerId, data);
    this._save();
  }

  _log(action, playerId, detail) {
    this.logger.log(action, playerId, detail);
    if (this.settings.logToConsole) {
      console.log(`[GM] ${action} | ${playerId} |`, detail);
    }
  }

  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  registerHook(cb) { this.hooks.push(cb); }

  // --- Public API ---
  execute(commandId, args) {
    // gm.toggle is always executable (even when disabled) to re-enable
    if (!this.settings.enabled && commandId !== 'gm.toggle') {
      return { error: 'gm_disabled', hint: 'Enable GM in settings' };
    }
    const cmd = this._commands.get(commandId);
    if (!cmd) return { error: 'unknown_command', known: Array.from(this._commands.keys()) };
    const context = { playerId: args.playerId || 'default', timestamp: Date.now() };
    const result = cmd.execute(args, context);
    return result;
  }

  listCommands() {
    const cats = {};
    for (const cmd of this._commands.values()) {
      if (!cats[cmd.category]) cats[cmd.category] = [];
      cats[cmd.category].push({ id: cmd.id, label: cmd.label, description: cmd.description });
    }
    return cats;
  }

  isEnabled() { return this.settings.enabled; }
  enable() { this.settings.enable(); }
  disable() { this.settings.disable(); }
  toggleGM() { return this.settings.toggle(); }
}

// ------------------------------------------------------------------------.----
// GMTools — nanobot-style tool registry for external access
// ------------------------------------------------------------------------.----
const GMTools = {
  'gm.execute': {
    description: 'Execute a GM command',
    parameters: { type: 'object', properties: { commandId: { type: 'string' }, args: { type: 'object' } }, required: ['commandId'] },
    handler(args) {
      if (typeof window !== 'undefined' && !window._gmConsole) window._gmConsole = new GMConsole();
      return window._gmConsole.execute(args.commandId, args.args || {});
    }
  },
  'gm.list_commands': {
    description: 'List all GM commands',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (typeof window !== 'undefined' && !window._gmConsole) window._gmConsole = new GMConsole();
      return window._gmConsole.listCommands();
    }
  },
  'gm.enable': {
    description: 'Enable GM mode',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (typeof window !== 'undefined' && !window._gmConsole) window._gmConsole = new GMConsole();
      window._gmConsole.enable();
      return { enabled: true };
    }
  },
  'gm.disable': {
    description: 'Disable GM mode',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (typeof window !== 'undefined' && !window._gmConsole) window._gmConsole = new GMConsole();
      window._gmConsole.disable();
      return { enabled: false };
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GMCommand, GMSettings, GMLogger, GMConsole, GMTools };
}
if (typeof window !== 'undefined') {
  window.GMCommand = GMCommand;
  window.GMSettings = GMSettings;
  window.GMLogger = GMLogger;
  window.GMConsole = GMConsole;
  window.GMTools = GMTools;
}