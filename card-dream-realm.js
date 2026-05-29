// ============================================================================
// Card Dream Realm — V207 Direction C
// Dream realm with lucid dreaming, dream crafting, and nightmare defense
// thunderbolt feedback loops + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // DreamFragment: A fragment of a dream
  // -----------------------------------------------------------------------
  function DreamFragment(fragId, name, element, intensity, lucid) {
    this.fragId = fragId;
    this.name = name || fragId;
    this.element = element || 'neutral';
    this.intensity = intensity || 1; // 1-5
    this.lucid = lucid || false;
    this.attached = false;
    this.dreamId = null;
  }

  DreamFragment.prototype.setLucid = function () {
    this.lucid = true;
    return { success: true, lucid: true };
  };

  DreamFragment.prototype.attach = function (dreamId) {
    if (this.attached) return { error: 'already_attached' };
    this.attached = true;
    this.dreamId = dreamId;
    return { success: true };
  };

  DreamFragment.prototype.getPower = function () {
    var base = this.intensity * 20;
    return this.lucid ? base * 2 : base;
  };

  // -----------------------------------------------------------------------
  // Dream: A constructed dream
  // -----------------------------------------------------------------------
  function Dream(dreamId, name, depth, stability) {
    this.dreamId = dreamId;
    this.name = name || dreamId;
    this.depth = depth || 1; // 1-10
    this.stability = stability || 50; // 0-100
    this.fragments = {}; // fragId -> DreamFragment
    this.lucidLevel = 0;
    this.turnsExisted = 0;
    this.collapsing = false;
  }

  Dream.prototype.addFragment = function (frag) {
    if (this.fragments[frag.fragId]) return { error: 'fragment_exists' };
    this.fragments[frag.fragId] = frag;
    frag.attach(this.dreamId);
    return { success: true, fragCount: Object.keys(this.fragments).length };
  };

  Dream.prototype.removeFragment = function (fragId) {
    if (!this.fragments[fragId]) return { error: 'fragment_not_found' };
    delete this.fragments[fragId];
    return { success: true, fragCount: Object.keys(this.fragments).length };
  };

  Dream.prototype.stabilize = function (amount) {
    this.stability = Math.min(100, this.stability + amount);
    return { success: true, stability: this.stability };
  };

  Dream.prototype.tick = function () {
    this.turnsExisted++;
    this.stability = Math.max(0, this.stability - 5);
    if (this.stability <= 0) this.collapsing = true;
    return { collapsing: this.collapsing, stability: this.stability };
  };

  Dream.prototype.getTotalPower = function () {
    var total = 0;
    for (var fid in this.fragments) {
      total += this.fragments[fid].getPower();
    }
    return total + (this.lucidLevel * 10);
  };

  Dream.prototype.getFragmentCount = function () { return Object.keys(this.fragments).length; };

  // --------------------------------------------------------------------===
  // DreamWalker: A being that traverses dreams
  // --------------------------------------------------------------------===
  function DreamWalker(walkerId, name, dreamPower, sanity) {
    this.walkerId = walkerId;
    this.name = name || walkerId;
    this.dreamPower = dreamPower || 10;
    this.sanity = sanity || 100;
    this.maxSanity = sanity || 100;
    this.currentDream = null;
    this.skills = [];
  }

  DreamWalker.prototype.enterDream = function (dream) {
    if (this.currentDream) return { error: 'already_in_dream' };
    this.currentDream = dream.dreamId;
    return { success: true, dreamId: dream.dreamId };
  };

  DreamWalker.prototype.exitDream = function () {
    this.currentDream = null;
    return { success: true };
  };

  DreamWalker.prototype.loseSanity = function (amount) {
    this.sanity = Math.max(0, this.sanity - amount);
    return { sanity: this.sanity, damaged: this.sanity < 30 };
  };

  DreamWalker.prototype.restoreSanity = function (amount) {
    this.sanity = Math.min(this.maxSanity, this.sanity + amount);
    return { success: true, sanity: this.sanity };
  };

  DreamWalker.prototype.getSanityPercent = function () {
    return this.maxSanity > 0 ? (this.sanity / this.maxSanity * 100) : 0;
  };

  // --------------------------------------------------------------------===
  // DreamRealm: Main realm manager
  // ----------------------------------------------------------------=======
  function DreamRealm(realmId, name, maxDreams) {
    this.realmId = realmId || ('realm_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Dream Realm';
    this.dreams = {};
    this.walkers = {};
    this.maxDreams = maxDreams || 30;
  }

  DreamRealm.prototype.createDream = function (dream) {
    this.dreams[dream.dreamId] = dream;
    return { success: true, count: Object.keys(this.dreams).length };
  };

  DreamRealm.prototype.registerWalker = function (walker) {
    this.walkers[walker.walkerId] = walker;
    return { success: true, count: Object.keys(this.walkers).length };
  };

  DreamRealm.prototype.getDream = function (id) { return this.dreams[id] || null; };
  DreamRealm.prototype.getWalker = function (id) { return this.walkers[id] || null; };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.DreamFragment = DreamFragment;
  window.Dream = Dream;
  window.DreamWalker = DreamWalker;
  window.DreamRealm = DreamRealm;
})();