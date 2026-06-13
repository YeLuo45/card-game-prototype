// ============================================================================
// Distributed Memory Vault — V303 Direction F Iteration 4/30
// NPCDreamBridge: NPC记忆互通桥
// 来源：chatdev Multi-Agent + nanobot Mesh
// ============================================================================
'use strict';

(function () {

  // NPCDreamBridge — NPC ↔ player memory sharing
  function NPCDreamBridge(playerStore, npcStores, options) {
    this.playerStore = playerStore;
    this.npcStores = npcStores || {};
    this.maxShared = (options && options.maxShared) || 50;
    this.sharingEnabled = (options && options.sharingEnabled) || true;
    this.shareLog = [];
  }

  NPCDreamBridge.prototype.registerNPC = function (npcId, store) {
    this.npcStores[npcId] = store;
    return this;
  };

  NPCDreamBridge.prototype._exists = function (store, id) {
    return store && store.peek(id) != null;
  };

  NPCDreamBridge.prototype.share = function (npcId, memoryId, direction) {
    if (!this.sharingEnabled) return { error: 'sharing_disabled', success: false };
    var npcStore = this.npcStores[npcId];
    if (!npcStore) return { error: 'npc_not_found', success: false };
    var dir = direction || 'player_to_npc';
    if (dir === 'player_to_npc') {
      if (!this._exists(this.playerStore, memoryId)) return { error: 'memory_not_found', success: false };
      var entry = this.playerStore.peek(memoryId);
      var r = npcStore.save(entry.type, entry.layer, entry.content, Object.assign({ sharedFrom: 'player', originalId: memoryId }, entry.metadata));
      this.shareLog.push({ npcId: npcId, memoryId: memoryId, dir: dir, at: Date.now() });
      return { success: true, shared: r, npcId: npcId };
    } else if (dir === 'npc_to_player') {
      if (!this._exists(npcStore, memoryId)) return { error: 'memory_not_found', success: false };
      var entry2 = npcStore.peek(memoryId);
      var r2 = this.playerStore.save(entry2.type, entry2.layer, entry2.content, Object.assign({ sharedFrom: 'npc:' + npcId, originalId: memoryId }, entry2.metadata));
      this.shareLog.push({ npcId: npcId, memoryId: memoryId, dir: dir, at: Date.now() });
      return { success: true, shared: r2, npcId: npcId };
    }
    return { error: 'invalid_direction', success: false };
  };

  NPCDreamBridge.prototype.shareAll = function (npcId) {
    if (!this.sharingEnabled) return { error: 'sharing_disabled' };
    var npcStore = this.npcStores[npcId];
    if (!npcStore) return { error: 'npc_not_found' };
    var playerEntries = this.playerStore.listByLayer('L4');
    var shared = 0;
    for (var i = 0; i < playerEntries.length && shared < this.maxShared; i++) {
      this.share(npcId, playerEntries[i].id, 'player_to_npc');
      shared++;
    }
    return { success: true, shared: shared };
  };

  NPCDreamBridge.prototype.getSharedMemories = function (npcId) {
    var npcStore = this.npcStores[npcId];
    if (!npcStore) return [];
    var all = npcStore.listByLayer('L4').concat(npcStore.listByLayer('L3'));
    var shared = [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].metadata && all[i].metadata.sharedFrom) shared.push(all[i]);
    }
    return shared;
  };

  NPCDreamBridge.prototype.getShareLog = function () { return this.shareLog; };
  NPCDreamBridge.prototype.setSharingEnabled = function (v) { this.sharingEnabled = !!v; return this.sharingEnabled; };
  NPCDreamBridge.prototype.getStats = function () {
    return { npcCount: Object.keys(this.npcStores).length, shareEvents: this.shareLog.length, sharingEnabled: this.sharingEnabled };
  };

  // Exports
  window.NPCDreamBridge = NPCDreamBridge;

})();
