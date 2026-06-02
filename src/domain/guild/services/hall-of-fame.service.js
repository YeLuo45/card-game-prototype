// ============================================================================
// Card Game Hall of Fame — V247 Direction D
// Hall of Fame System: nanobot registry + ruflo hook lifecycle + claude-code tool
// Legendary records, achievement badges, and honor rolls
// ============================================================================
'use strict';

(function () {
  // ------ Models ------
  var HallOfFame = function(hofId, name, region) {
    this.hofId = hofId;
    this.name = name || 'Hall of Fame';
    this.region = region || 'global';
    this.entries = {};       // hofEntryId -> HallOfFameEntry
    this.badges = {};        // badgeId -> Badge
    this.inductionQueue = []; // pending inductions
    this.hookRegistry = {};   // ruflo-style hooks: 'onInduct', 'onBadgeEarn', etc.
    this.stats = { totalInducted: 0, totalBadges: 0, totalViews: 0 };
  };

  var HallOfFameEntry = function(eid, playerId, playerName, category, inductionYear, stats) {
    this.eid = eid;
    this.playerId = playerId;
    this.playerName = playerName;
    this.category = category || 'champion';
    this.inductionYear = inductionYear || new Date().getFullYear();
    this.stats = stats || {};
    this.badges = [];    // badgeIds earned
    this.rank = null;    // set by hall
    this.archived = false;
    this.inductedAt = null;
  };

  var Badge = function(badgeId, name, description, tier, criteria) {
    this.badgeId = badgeId;
    this.name = name;
    this.description = description || '';
    this.tier = tier || 'bronze';  // bronze, silver, gold, platinum, legendary
    this.criteria = criteria || null;
    this.recipients = [];  // playerIds
    this.createdAt = Date.now();
    this.hookRegistry = {};
  };

  // ------ HallOfFame Methods ------
  HallOfFame.prototype.inductEntry = function(playerId, playerName, category, stats) {
    var hofEntryId = 'he_' + playerId + '_' + Date.now();
    var entry = new HallOfFameEntry(hofEntryId, playerId, playerName, category, new Date().getFullYear(), stats);
    entry.inductedAt = Date.now();
    this.entries[hofEntryId] = entry;
    this.stats.totalInducted++;
    this._triggerHook('onInduct', entry);
    return { success: true, entryId: hofEntryId, entry: entry };
  };

  HallOfFame.prototype.getEntry = function(hofEntryId) {
    return this.entries[hofEntryId] || null;
  };

  HallOfFame.prototype.getEntriesByCategory = function(category) {
    var result = [];
    for (var hofEntryId in this.entries) {
      if (this.entries[hofEntryId].category === category && !this.entries[hofEntryId].archived) {
        result.push(this.entries[hofEntryId]);
      }
    }
    return result.sort(function(a, b) { return b.inductionYear - a.inductionYear; });
  };

  HallOfFame.prototype.getEntriesByPlayer = function(playerId) {
    var result = [];
    for (var hofEntryId in this.entries) {
      if (this.entries[hofEntryId].playerId === playerId && !this.entries[hofEntryId].archived) {
        result.push(this.entries[hofEntryId]);
      }
    }
    return result;
  };

  HallOfFame.prototype.getTopEntries = function(n, category) {
    var all = category ? this.getEntriesByCategory(category) : Object.values(this.entries).filter(function(e) { return !e.archived; });
    all.sort(function(a, b) { return (b.stats.wins || 0) - (a.stats.wins || 0); });
    return all.slice(0, n);
  };

  HallOfFame.prototype.removeEntry = function(hofEntryId) {
    if (!this.entries[hofEntryId]) return { error: 'entry_not_found' };
    this.entries[hofEntryId].archived = true;
    this.stats.totalInducted--;
    return { success: true };
  };

  HallOfFame.prototype.registerBadge = function(badgeId, name, description, tier, criteria) {
    if (this.badges[badgeId]) return { error: 'badge_already_exists' };
    this.badges[badgeId] = new Badge(badgeId, name, description, tier, criteria);
    this.stats.totalBadges++;
    return { success: true, badge: this.badges[badgeId] };
  };

  HallOfFame.prototype.awardBadge = function(hofEntryId, badgeId) {
    var entry = this.entries[hofEntryId];
    if (!entry) return { error: 'entry_not_found' };
    if (!this.badges[badgeId]) return { error: 'badge_not_found' };
    if (entry.badges.indexOf(badgeId) >= 0) return { error: 'badge_already_awarded' };
    entry.badges.push(badgeId);
    this.badges[badgeId].recipients.push(entry.playerId);
    this._triggerHook('onBadgeEarn', entry, badgeId);
    return { success: true, badge: this.badges[badgeId] };
  };

  HallOfFame.prototype.getBadgeRecipients = function(badgeId) {
    if (!this.badges[badgeId]) return [];
    return this.badges[badgeId].recipients;
  };

  HallOfFame.prototype.getAllBadges = function() {
    return Object.values(this.badges);
  };

  HallOfFame.prototype.addToQueue = function(playerId, playerName, category, stats, proposedBy) {
    this.inductionQueue.push({
      playerId: playerId, playerName: playerName,
      category: category, stats: stats, proposedBy: proposedBy || 'anonymous',
      proposedAt: Date.now(), votes: [], status: 'pending'
    });
    return { success: true, queuePosition: this.inductionQueue.length };
  };

  HallOfFame.prototype.voteQueue = function(playerId, voteIndex, approve) {
    if (voteIndex < 0 || voteIndex >= this.inductionQueue.length) return { error: 'invalid_index' };
    var entry = this.inductionQueue[voteIndex];
    var existingVote = entry.votes.find(function(v) { return v.voterId === playerId; });
    if (existingVote) return { error: 'already_voted' };
    entry.votes.push({ voterId: playerId, approve: approve, votedAt: Date.now() });
    var approvalCount = entry.votes.filter(function(v) { return v.approve; }).length;
    if (approvalCount >= 5) {
      entry.status = 'approved';
      var result = this.inductEntry(entry.playerId, entry.playerName, entry.category, entry.stats);
      this.inductionQueue.splice(voteIndex, 1);
      return { success: true, inducted: true, entryId: result.entryId };
    }
    return { success: true, inducted: false, approvals: approvalCount };
  };

  HallOfFame.prototype.registerHook = function(eventName, callback) {
    if (!this.hookRegistry[eventName]) this.hookRegistry[eventName] = [];
    this.hookRegistry[eventName].push(callback);
    return { success: true, hookCount: this.hookRegistry[eventName].length };
  };

  HallOfFame.prototype._triggerHook = function(eventName) {
    var hooks = this.hookRegistry[eventName] || [];
    var args = Array.prototype.slice.call(arguments, 1);
    hooks.forEach(function(h) { h.apply(null, args); });
  };

  HallOfFame.prototype.getHallStats = function() {
    return {
      totalInducted: this.stats.totalInducted,
      totalBadges: this.stats.totalBadges,
      totalViews: this.stats.totalViews,
      categories: Object.keys(this._groupByCategory()),
      entryCount: Object.keys(this.entries).length
    };
  };

  HallOfFame.prototype._groupByCategory = function() {
    var cats = {};
    for (var hofEntryId in this.entries) {
      var e = this.entries[hofEntryId];
      if (!cats[e.category]) cats[e.category] = 0;
      cats[e.category]++;
    }
    return cats;
  };

  HallOfFame.prototype.exportEntries = function() {
    var result = [];
    for (var hofEntryId in this.entries) {
      var e = this.entries[hofEntryId];
      if (!e.archived) result.push({
        hofEntryId: e.hofEntryId, playerId: e.playerId, playerName: e.playerName,
        category: e.category, inductionYear: e.inductionYear,
        stats: e.stats, badges: e.badges, rank: e.rank
      });
    }
    return result;
  };

  // ------ Expose globally ------
  window.HallOfFame = window.HallOfFame || HallOfFame;
  window.HallOfFameEntry = window.HallOfFameEntry || HallOfFameEntry;
  window.Badge = window.Badge || Badge;

})();
