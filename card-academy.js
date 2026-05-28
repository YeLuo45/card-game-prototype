// ============================================================================
// Card Academy — V184 Direction E
// Card academy for training, skill trees and instructor guidance
// ruflo hierarchical decomposition + nanobot distributed mesh
// ============================================================================
'use strict';

(function () {
  // ----------------------------------------------------------------=======
  // SkillNode: A single skill in the skill tree
  // ========================================================================
  function SkillNode(nodeId, name, description, skillClass, maxLevel, cost) {
    this.nodeId = nodeId;
    this.name = name || nodeId;
    this.description = description || '';
    this.skillClass = skillClass || 'attack'; // attack, defense, support, ultimate
    this.maxLevel = maxLevel || 3;
    this.currentLevel = 0;
    this.cost = cost || 1;
    this.unlocked = false;
    this.prerequisites = []; // array of nodeIds
  }

  SkillNode.prototype.unlock = function () {
    if (this.unlocked) return { alreadyUnlocked: true };
    this.unlocked = true;
    this.currentLevel = 1;
    return { success: true, level: this.currentLevel };
  };

  SkillNode.prototype.upgrade = function () {
    if (!this.unlocked) return { error: 'not_unlocked' };
    if (this.currentLevel >= this.maxLevel) return { error: 'max_level' };
    this.currentLevel++;
    return { success: true, level: this.currentLevel };
  };

  SkillNode.prototype.getPower = function () {
    return this.currentLevel * this.cost;
  };

  SkillNode.prototype.isMaxLevel = function () {
    return this.currentLevel >= this.maxLevel;
  };

  // ----------------------------------------------------------------=======
  // SkillTree: A skill tree for a player class
  // ========================================================================
  function SkillTree(treeId, name, playerClass) {
    this.treeId = treeId;
    this.name = name || 'Skill Tree ' + treeId;
    this.playerClass = playerClass || 'warrior';
    this.nodes = {}; // nodeId -> SkillNode
  }

  SkillTree.prototype.addNode = function (node) {
    this.nodes[node.nodeId] = node;
    return { success: true, nodeCount: Object.keys(this.nodes).length };
  };

  SkillTree.prototype.getNode = function (nodeId) {
    return this.nodes[nodeId] || null;
  };

  SkillTree.prototype.unlockNode = function (nodeId) {
    var node = this.nodes[nodeId];
    if (!node) return { error: 'node_not_found' };
    for (var i = 0; i < node.prerequisites.length; i++) {
      var prereq = this.nodes[node.prerequisites[i]];
      if (prereq && (!prereq.unlocked || prereq.currentLevel < 1)) {
        return { error: 'prerequisite_not_met' };
      }
    }
    return node.unlock();
  };

  SkillTree.prototype.getTotalPower = function () {
    var total = 0;
    for (var nodeId in this.nodes) {
      if (this.nodes[nodeId].unlocked) {
        total += this.nodes[nodeId].getPower();
      }
    }
    return total;
  };

  // ----------------------------------------------------------------=======
  // Instructor: An instructor that provides guidance
  // ========================================================================
  function Instructor(instructorId, name, expertise, discount) {
    this.instructorId = instructorId;
    this.name = name || instructorId;
    this.expertise = expertise || 'attack'; // attack, defense, support
    this.discount = discount || 0; // 0-0.5
    this.students = [];
  }

  Instructor.prototype.addStudent = function (studentId) {
    if (this.students.indexOf(studentId) >= 0) return { error: 'already_student' };
    this.students.push(studentId);
    return { success: true, studentCount: this.students.length };
  };

  Instructor.prototype.getEffectiveCost = function (baseCost) {
    return Math.floor(baseCost * (1 - this.discount));
  };

  // ----------------------------------------------------------------=======
  // Academy: Manages skill trees, training, and instructors
  // ========================================================================
  function Academy(storageKey) {
    this.storageKey = storageKey || 'card_academy';
    this._trees = {}; // treeId -> SkillTree
    this._instructors = {}; // instructorId -> Instructor
    this._treeIdCounter = 0;
    this._init();
  }

  Academy.prototype._init = function () {
    this._load();
    if (Object.keys(this._trees).length === 0) {
      this._seedDefault();
    }
  };

  Academy.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._treeIdCounter = data.treeCounter || 0;
        }
      }
    } catch (e) {}
  };

  Academy.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({ treeCounter: this._treeIdCounter }));
      }
    } catch (e) {}
  };

  Academy.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[Academy] ' + msg);
    }
  };

  Academy.prototype._seedDefault = function () {
    var tree = new SkillTree('tree_warrior', 'Warrior Skills', 'warrior');
    var strike = new SkillNode('n1', 'Power Strike', 'Strong attack', 'attack', 5, 2);
    strike.unlock();
    tree.addNode(strike);
    var block = new SkillNode('n2', 'Shield Block', 'Defensive stance', 'defense', 3, 1);
    block.prerequisites.push('n1');
    tree.addNode(block);
    this._trees['tree_warrior'] = tree;
  };

  Academy.prototype.createSkillTree = function (name, playerClass) {
    var treeId = 'tree_' + (++this._treeIdCounter);
    this._trees[treeId] = new SkillTree(treeId, name, playerClass);
    this._save();
    return { success: true, treeId: treeId };
  };

  Academy.prototype.getSkillTree = function (treeId) {
    return this._trees[treeId] || null;
  };

  Academy.prototype.getAllTrees = function () {
    return Object.keys(this._trees).map(function (k) { return this._trees[k]; }.bind(this));
  };

  Academy.prototype.addInstructor = function (instructorId, name, expertise, discount) {
    this._instructors[instructorId] = new Instructor(instructorId, name, expertise, discount);
    return { success: true };
  };

  Academy.prototype.getInstructor = function (instructorId) {
    return this._instructors[instructorId] || null;
  };

  Academy.prototype.getInstructorsByExpertise = function (expertise) {
    var result = [];
    for (var i in this._instructors) {
      if (this._instructors[i].expertise === expertise) result.push(this._instructors[i]);
    }
    return result;
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.SkillNode = SkillNode;
  window.SkillTree = SkillTree;
  window.Instructor = Instructor;
  window.Academy = Academy;
})();