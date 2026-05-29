// ============================================================================
// Card Arcane Library — V213 Direction B
// Arcane library with spell research, grimoires, and knowledge nodes
// chatdev role specialization + generic-agent autonomous goal pursuit
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Spell Tome: A spell book
  // -----------------------------------------------------------------------
  function SpellTome(tomeId, name, school, power, pages) {
    this.tomeId = tomeId;
    this.name = name || tomeId;
    this.school = school || 'arcane'; // arcane, fire, water, earth, air, spirit
    this.power = power || 10;
    this.pages = pages || 10;
    this.inscribed = false;
    this.copiedFrom = null;
  }

  SpellTome.prototype.inscribe = function (spellId) {
    if (this.inscribed) return { error: 'already_inscribed' };
    this.inscribed = true;
    return { success: true, spellId: spellId };
  };

  SpellTome.prototype.getPower = function () {
    return this.inscribed ? this.power * 2 : this.power;
  };

  SpellTome.prototype.copy = function () {
    var copy = new SpellTome(this.tomeId + '_copy', this.name + ' (Copy)', this.school, this.power, this.pages);
    copy.copiedFrom = this.tomeId;
    return copy;
  };

  // -----------------------------------------------------------------------
  // KnowledgeNode: A node in the knowledge tree
  // -----------------------------------------------------------------------
  function KnowledgeNode(nodeId, name, tier, unlocked) {
    this.nodeId = nodeId;
    this.name = name || nodeId;
    this.tier = tier || 1; // 1-5
    this.unlocked = unlocked || false;
    this.research = 0; // research points invested
    this.connections = []; // connected nodeIds
    this.discoveredBy = [];
  }

  KnowledgeNode.prototype.unlock = function (researcherId) {
    if (this.unlocked) return { error: 'already_unlocked' };
    this.unlocked = true;
    this.discoveredBy.push(researcherId);
    return { success: true };
  };

  KnowledgeNode.prototype.addResearch = function (amount) {
    this.research += amount;
    return { research: this.research };
  };

  KnowledgeNode.prototype.connect = function (otherNodeId) {
    if (this.connections.indexOf(otherNodeId) === -1) {
      this.connections.push(otherNodeId);
    }
    return { success: true, connections: this.connections.length };
  };

  KnowledgeNode.prototype.getInfluence = function () {
    return this.unlocked ? this.tier * 10 + this.research * 0.5 : 0;
  };

  // --------------------------------------------------------------------===
  // Grimoire: A collection of spell tomes
  // ----------------------------------------------------------------=======
  function Grimoire(grimoireId, name, maxTomes) {
    this.grimoireId = grimoireId;
    this.name = name || grimoireId;
    this.maxTomes = maxTomes || 10;
    this.tomes = {}; // tomeId -> SpellTome
    this.knowledgeLevel = 1;
    this.spellsResearched = 0;
  }

  Grimoire.prototype.addTome = function (tome) {
    if (Object.keys(this.tomes).length >= this.maxTomes) return { error: 'max_tomes' };
    this.tomes[tome.tomeId] = tome;
    return { success: true, count: Object.keys(this.tomes).length };
  };

  Grimoire.prototype.getTome = function (id) { return this.tomes[id] || null; };
  Grimoire.prototype.getTomeCount = function () { return Object.keys(this.tomes).length; };

  Grimoire.prototype.researchSpell = function (tomeId) {
    var tome = this.tomes[tomeId];
    if (!tome) return { error: 'tome_not_found' };
    if (tome.inscribed) return { error: 'already_researched' };
    tome.inscribe('spell_' + Date.now());
    this.spellsResearched++;
    return { success: true, spellId: tome.inscribed };
  };

  // --------------------------------------------------------------------===
  // ArcaneLibrary: Main library manager
  // ----------------------------------------------------------------=======
  function ArcaneLibrary(libId, name, maxNodes) {
    this.libId = libId || ('lib_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Arcane Library';
    this.grimoires = {};
    this.nodes = {};
    this.maxNodes = maxNodes || 30;
    this.researchers = {}; // researcherId -> {name, xp, rank}
  }

  ArcaneLibrary.prototype.createGrimoire = function (grimoire) {
    this.grimoires[grimoire.grimoireId] = grimoire;
    return { success: true, count: Object.keys(this.grimoires).length };
  };

  ArcaneLibrary.prototype.registerResearcher = function (researcherId, name) {
    this.researchers[researcherId] = { name: name || researcherId, xp: 0, rank: 'apprentice' };
    return { success: true };
  };

  ArcaneLibrary.prototype.addXP = function (researcherId, amount) {
    var r = this.researchers[researcherId];
    if (!r) return { error: 'researcher_not_found' };
    r.xp += amount;
    var thresholds = [0, 100, 300, 600, 1000];
    var ranks = ['apprentice', 'scholar', 'sage', 'archmage', 'legend'];
    for (var i = ranks.length - 1; i >= 0; i--) {
      if (r.xp >= thresholds[i]) { r.rank = ranks[i]; break; }
    }
    return { success: true, rank: r.rank, xp: r.xp };
  };

  ArcaneLibrary.prototype.createNode = function (node) {
    this.nodes[node.nodeId] = node;
    return { success: true, count: Object.keys(this.nodes).length };
  };

  ArcaneLibrary.prototype.getGrimoire = function (id) { return this.grimoires[id] || null; };
  ArcaneLibrary.prototype.getNode = function (id) { return this.nodes[id] || null; };
  ArcaneLibrary.prototype.getResearcher = function (id) { return this.researchers[id] || null; };
  ArcaneLibrary.prototype.getNodeCount = function () { return Object.keys(this.nodes).length; };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.SpellTome = SpellTome;
  window.KnowledgeNode = KnowledgeNode;
  window.Grimoire = Grimoire;
  window.ArcaneLibrary = ArcaneLibrary;
})();