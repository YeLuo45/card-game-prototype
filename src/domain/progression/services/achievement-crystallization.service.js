// ============================================================================
// Card Game Achievement Crystallization — V252
// Achievement Crystallization: generic-agent self-evolution + ruflo hierarchical trees
// Achievement trees, crystallization unlocks, and player growth tracking
// ============================================================================
'use strict';

(function () {
  // ------ Models ------
  var AchievementNode = function(nodeId, name, category, tier) {
    this.nodeId = nodeId;
    this.name = name || 'Achievement';
    this.category = category || 'general'; // combat, collection, social, mastery
    this.tier = tier || 'bronze'; // bronze, silver, gold, diamond, legendary
    this.description = '';
    this.unlocked = false;
    this.unlockedAt = null;
    this.progress = 0;
    this.threshold = 1;
    this.prerequisites = [];   // nodeIds required before this
    this.rewards = {};
    this.children = [];       // child nodeIds (ruflo hierarchical)
    this.parents = [];         // parent nodeIds
  };

  var AchievementTree = function(treeId, name, layer) {
    this.treeId = treeId;
    this.name = name || 'Achievement Tree';
    this.layer = layer || 0;  // L0-L4 layer
    this.nodes = {};          // nodeId -> AchievementNode
    this.rootIds = [];        // top-level nodeIds
    this.unlockedNodeIds = [];
    this.stats = { totalUnlocked: 0 };
  };

  var PlayerAchievement = function(playerId) {
    this.playerId = playerId;
    this.trees = {};           // treeId -> { unlockedIds: [], activeProgress: {} }
    this.crystals = 0;        // crystallization currency
    this.totalAchievements = 0;
    this.categoryProgress = {}; // category -> count
    this.milestones = [];
    this.layerProgress = [0, 0, 0, 0, 0]; // L0-L4 progress
  };

  // ------ Achievement Crystal Engine ------
  var AchievementCrystallizer = function() {
    this.tierMultipliers = { bronze: 1, silver: 3, gold: 10, diamond: 25, legendary: 100 };
  };

  AchievementCrystallizer.prototype.calculateCrystallization = function(node) {
    if (!node.unlocked) return 0;
    var base = 10;
    var tierMult = this.tierMultipliers[node.tier] || 1;
    return base * tierMult;
  };

  AchievementCrystallizer.prototype.canUnlock = function(tree, nodeId) {
    var node = tree.nodes[nodeId];
    if (!node) return false;
    if (node.unlocked) return false;
    // Check prerequisites
    for (var i = 0; i < node.prerequisites.length; i++) {
      var prereqId = node.prerequisites[i];
      if (!tree.nodes[prereqId] || !tree.nodes[prereqId].unlocked) return false;
    }
    return true;
  };

  // ------ Main Manager ------
  var AchievementManager = function(managerId) {
    this.managerId = managerId;
    this.trees = {};           // treeId -> AchievementTree
    this.playerAchievements = {}; // playerId -> PlayerAchievement
    this.crystallizer = new AchievementCrystallizer();
    this.hooks = {};
  };

  // Tree Management
  AchievementManager.prototype.createTree = function(treeId, name, layer) {
    var tree = new AchievementTree(treeId, name, layer);
    this.trees[treeId] = tree;
    return { success: true, treeId: treeId, tree: tree };
  };

  AchievementManager.prototype.addNode = function(treeId, nodeId, name, category, tier, threshold) {
    var tree = this.trees[treeId];
    if (!tree) return { error: 'tree_not_found' };
    if (tree.nodes[nodeId]) return { error: 'node_exists' };
    var node = new AchievementNode(nodeId, name, category, tier);
    node.threshold = threshold || 1;
    tree.nodes[nodeId] = node;
    return { success: true, node: node };
  };

  AchievementManager.prototype.linkNodes = function(treeId, parentId, childId) {
    var tree = this.trees[treeId];
    if (!tree || !tree.nodes[parentId] || !tree.nodes[childId]) return { error: 'not_found' };
    tree.nodes[parentId].children.push(childId);
    tree.nodes[childId].parents.push(parentId);
    return { success: true };
  };

  AchievementManager.prototype.setPrerequisites = function(treeId, nodeId, prereqIds) {
    var tree = this.trees[treeId];
    if (!tree || !tree.nodes[nodeId]) return { error: 'not_found' };
    tree.nodes[nodeId].prerequisites = prereqIds || [];
    return { success: true };
  };

  // Player Achievement Management
  AchievementManager.prototype.registerPlayer = function(playerId) {
    if (this.playerAchievements[playerId]) return { error: 'already_registered' };
    this.playerAchievements[playerId] = new PlayerAchievement(playerId);
    return { success: true, player: this.playerAchievements[playerId] };
  };

  AchievementManager.prototype.joinTree = function(playerId, treeId) {
    var player = this.playerAchievements[playerId];
    if (!player) return { error: 'player_not_found' };
    if (!this.trees[treeId]) return { error: 'tree_not_found' };
    if (!player.trees[treeId]) {
      player.trees[treeId] = { unlockedIds: [], activeProgress: {} };
    }
    return { success: true };
  };

  // Progress & Unlocking (generic-agent self-evolution pattern)
  AchievementManager.prototype.addProgress = function(playerId, treeId, nodeId, delta) {
    var player = this.playerAchievements[playerId];
    var tree = this.trees[treeId];
    if (!player || !tree || !tree.nodes[nodeId]) return { error: 'not_found' };

    var node = tree.nodes[nodeId];
    var progressData = player.trees[treeId].activeProgress;

    if (!progressData[nodeId]) progressData[nodeId] = 0;
    progressData[nodeId] += delta;
    node.progress = progressData[nodeId];

    // Check if threshold reached
    if (node.progress >= node.threshold && !node.unlocked) {
      return this._unlockNode(playerId, treeId, nodeId);
    }

    return { success: true, progress: node.progress, threshold: node.threshold, delta: delta };
  };

  AchievementManager.prototype._unlockNode = function(playerId, treeId, nodeId) {
    var tree = this.trees[treeId];
    var node = tree.nodes[nodeId];
    var player = this.playerAchievements[playerId];

    // Re-check prerequisites at unlock time
    if (!this.crystallizer.canUnlock(tree, nodeId)) {
      return { success: true, progress: node.progress, unlocked: false, reason: 'prerequisites' };
    }

    node.unlocked = true;
    node.unlockedAt = Date.now();
    node.progress = node.threshold;
    player.trees[treeId].activeProgress[nodeId] = node.progress;

    if (player.trees[treeId].unlockedIds.indexOf(nodeId) < 0) {
      player.trees[treeId].unlockedIds.push(nodeId);
    }

    // Update player stats
    player.totalAchievements++;
    player.categoryProgress[node.category] = (player.categoryProgress[node.category] || 0) + 1;

    // Crystallize
    var crystals = this.crystallizer.calculateCrystallization(node);
    player.crystals += crystals;

    // Update layer progress
    if (tree.layer >= 0 && tree.layer <= 4) {
      player.layerProgress[tree.layer]++;
    }

    this._triggerHook('onAchievementUnlock', playerId, treeId, node, crystals);
    return { success: true, progress: node.progress, unlocked: true, crystals: crystals };
  };

  AchievementManager.prototype.setProgress = function(playerId, treeId, nodeId, value) {
    var player = this.playerAchievements[playerId];
    var tree = this.trees[treeId];
    if (!player || !tree || !tree.nodes[nodeId]) return { error: 'not_found' };
    tree.nodes[nodeId].progress = value;
    if (!player.trees[treeId]) player.trees[treeId] = { unlockedIds: [], activeProgress: {} };
    player.trees[treeId].activeProgress[nodeId] = value;
    if (value >= tree.nodes[nodeId].threshold) {
      return this._unlockNode(playerId, treeId, nodeId);
    }
    return { success: true, progress: value };
  };

  // Queries
  AchievementManager.prototype.getNode = function(treeId, nodeId) {
    var tree = this.trees[treeId];
    if (!tree) return null;
    return tree.nodes[nodeId] || null;
  };

  AchievementManager.prototype.getPlayerProgress = function(playerId, treeId) {
    var player = this.playerAchievements[playerId];
    if (!player || !player.trees[treeId]) return null;
    return {
      unlockedIds: player.trees[treeId].unlockedIds.slice(),
      activeProgress: JSON.parse(JSON.stringify(player.trees[treeId].activeProgress)),
      totalUnlocked: player.trees[treeId].unlockedIds.length
    };
  };

  AchievementManager.prototype.getAvailableNodes = function(playerId, treeId) {
    var player = this.playerAchievements[playerId];
    var tree = this.trees[treeId];
    if (!player || !tree) return [];
    var result = [];
    for (var nid in tree.nodes) {
      var node = tree.nodes[nid];
      if (!node.unlocked && this.crystallizer.canUnlock(tree, nid)) {
        result.push(node);
      }
    }
    return result;
  };

  AchievementManager.prototype.getNextNodes = function(playerId, treeId) {
    var player = this.playerAchievements[playerId];
    var tree = this.trees[treeId];
    if (!player || !tree) return [];
    var unlocked = player.trees[treeId] ? player.trees[treeId].unlockedIds : [];
    var result = [];
    for (var nid in tree.nodes) {
      var node = tree.nodes[nid];
      if (node.unlocked) continue;
      // Check both explicit prerequisites and parent links
      var prereqsMet = node.prerequisites.every(function(pid) { return unlocked.indexOf(pid) >= 0; });
      var parentsMet = node.parents.every(function(pid) { return unlocked.indexOf(pid) >= 0; });
      if (prereqsMet && parentsMet) {
        result.push(node);
      }
    }
    return result;
  };

  AchievementManager.prototype.getPlayerStats = function(playerId) {
    var player = this.playerAchievements[playerId];
    if (!player) return null;
    return {
      playerId: playerId,
      totalAchievements: player.totalAchievements,
      crystals: player.crystals,
      categoryProgress: JSON.parse(JSON.stringify(player.categoryProgress)),
      layerProgress: player.layerProgress.slice(),
      treeCount: Object.keys(player.trees).length
    };
  };

  // Tree Stats
  AchievementManager.prototype.getTreeStats = function(treeId) {
    var tree = this.trees[treeId];
    if (!tree) return null;
    var nodes = Object.values(tree.nodes);
    return {
      totalNodes: nodes.length,
      unlockedCount: nodes.filter(function(n) { return n.unlocked; }).length,
      layer: tree.layer,
      tierCounts: nodes.reduce(function(acc, n) { acc[n.tier] = (acc[n.tier] || 0) + 1; return acc; }, {})
    };
  };

  // Hook System
  AchievementManager.prototype.registerHook = function(eventName, callback) {
    if (!this.hooks[eventName]) this.hooks[eventName] = [];
    this.hooks[eventName].push(callback);
    return { success: true };
  };

  AchievementManager.prototype._triggerHook = function(eventName) {
    var hooks = this.hooks[eventName] || [];
    var args = Array.prototype.slice.call(arguments, 1);
    hooks.forEach(function(h) { h.apply(null, args); });
  };

  // ------ Expose globally ------
  window.AchievementManager = window.AchievementManager || AchievementManager;
  window.AchievementTree = window.AchievementTree || AchievementTree;
  window.AchievementNode = window.AchievementNode || AchievementNode;
  window.PlayerAchievement = window.PlayerAchievement || PlayerAchievement;

})();
