// ============================================================================
// Card Game Memory Theater — V249 Direction B
// Memory Theater: generic-agent L0-L4 memory + ruflo hierarchical decomposition + chatdev multi-agent roles
// Role-playing narratives, memory chapters, and hierarchical scene management
// ============================================================================
'use strict';

(function () {
  // ------ Models ------
  var MemoryScene = function(sceneId, title, sceneType, depth) {
    this.sceneId = sceneId;
    this.title = title || 'Untitled Scene';
    this.sceneType = sceneType || 'memory'; // memory, dream, flashback, prophecy
    this.depth = depth || 0;  // ruflo hierarchical depth
    this.actors = [];  // characterIds involved
    this.content = [];
    this.narrative = '';
    this.emotionalTone = 'neutral';
    this.outcome = null;
    this.connections = [];  // linked sceneIds
    this.hooks = {};   // event hooks
    this.archived = false;
    this.createdAt = Date.now();
    this.endedAt = null;
    this.layer = 0;  // L0-L4 memory layer
  };

  var Character = function(charId, name, role, personality) {
    this.charId = charId;
    this.name = name || 'Unknown';
    this.role = role || 'narrator';  // narrator, protagonist, antagonist, witness
    this.personality = personality || {};
    this.memoryFragments = [];  // linked sceneIds
    this.relationships = {};    // charId -> relationship strength
    this.layerAccess = [0,1,2,3,4]; // which memory layers they can access
  };

  var NarrativeChapter = function(chapterId, title, sceneOrder) {
    this.chapterId = chapterId;
    this.title = title || 'Chapter';
    this.sceneOrder = sceneOrder || [];  // ordered sceneIds
    this.themes = [];
    this.resolution = null;
    this.layer = 0;
  };

  // ------ Memory Theater Core ------
  var MemoryTheater = function(theaterId) {
    this.theaterId = theaterId;
    this.scenes = {};    // sceneId -> MemoryScene
    this.characters = {}; // charId -> Character
    this.chapters = {};  // chapterId -> NarrativeChapter
    this.activeSceneId = null;
    this.currentLayer = 0;  // L0-L4 current active layer
    this.hookRegistry = {};
    this.stats = { totalScenes: 0, totalCharacters: 0, totalChapters: 0 };
  };

  // Scene Management
  MemoryTheater.prototype.createScene = function(title, sceneType, depth, layer) {
    var sceneId = 'scene_' + Date.now();
    var scene = new MemoryScene(sceneId, title, sceneType, depth);
    scene.layer = layer !== undefined ? layer : this.currentLayer;
    this.scenes[sceneId] = scene;
    this.stats.totalScenes++;
    this._triggerHook('onSceneCreate', scene);
    return { success: true, sceneId: sceneId, scene: scene };
  };

  MemoryTheater.prototype.activateScene = function(sceneId) {
    if (!this.scenes[sceneId]) return { error: 'scene_not_found' };
    if (this.scenes[sceneId].archived) return { error: 'scene_archived' };
    this.activeSceneId = sceneId;
    this._triggerHook('onSceneActivate', this.scenes[sceneId]);
    return { success: true, scene: this.scenes[sceneId] };
  };

  MemoryTheater.prototype.endScene = function(sceneId, outcome) {
    var scene = this.scenes[sceneId];
    if (!scene) return { error: 'scene_not_found' };
    if (scene.endedAt) return { error: 'scene_already_ended' };
    scene.endedAt = Date.now();
    scene.outcome = outcome || null;
    scene.archived = true;
    this._triggerHook('onSceneEnd', scene);
    if (this.activeSceneId === sceneId) this.activeSceneId = null;
    return { success: true, scene: scene };
  };

  MemoryTheater.prototype.addNarrative = function(sceneId, narrative, emotionalTone) {
    var scene = this.scenes[sceneId];
    if (!scene) return { error: 'scene_not_found' };
    scene.content.push({ text: narrative, timestamp: Date.now(), tone: emotionalTone || scene.emotionalTone });
    scene.narrative = narrative;
    if (emotionalTone) scene.emotionalTone = emotionalTone;
    return { success: true, contentLength: scene.content.length };
  };

  MemoryTheater.prototype.getScene = function(sceneId) {
    return this.scenes[sceneId] || null;
  };

  MemoryTheater.prototype.getScenesByLayer = function(layer) {
    var result = [];
    for (var sid in this.scenes) {
      if (this.scenes[sid].layer === layer && !this.scenes[sid].archived) result.push(this.scenes[sid]);
    }
    return result;
  };

  MemoryTheater.prototype.getActiveScene = function() {
    return this.activeSceneId ? this.scenes[this.activeSceneId] : null;
  };

  // Character Management (chatdev multi-agent roles)
  MemoryTheater.prototype.createCharacter = function(name, role, personality) {
    var charId = 'char_' + Date.now();
    var char = new Character(charId, name, role, personality);
    this.characters[charId] = char;
    this.stats.totalCharacters++;
    this._triggerHook('onCharCreate', char);
    return { success: true, charId: charId, character: char };
  };

  MemoryTheater.prototype.assignCharacterToScene = function(charId, sceneId) {
    var char = this.characters[charId];
    var scene = this.scenes[sceneId];
    if (!char || !scene) return { error: 'not_found' };
    if (scene.actors.indexOf(charId) < 0) scene.actors.push(charId);
    if (char.memoryFragments.indexOf(sceneId) < 0) char.memoryFragments.push(sceneId);
    return { success: true };
  };

  MemoryTheater.prototype.setRelationship = function(charId1, charId2, strength) {
    var c1 = this.characters[charId1], c2 = this.characters[charId2];
    if (!c1 || !c2) return { error: 'not_found' };
    c1.relationships[charId2] = strength;
    c2.relationships[charId1] = strength;
    return { success: true, strength: strength };
  };

  MemoryTheater.prototype.getCharacterScenes = function(charId) {
    var char = this.characters[charId];
    if (!char) return [];
    return char.memoryFragments.map(function(sid) { return this.scenes[sid]; }, this).filter(Boolean);
  };

  // Chapter Management (ruflo hierarchical)
  MemoryTheater.prototype.createChapter = function(title, layer) {
    var chapterId = 'chapter_' + Date.now();
    var chapter = new NarrativeChapter(chapterId, title, []);
    chapter.layer = layer !== undefined ? layer : this.currentLayer;
    this.chapters[chapterId] = chapter;
    this.stats.totalChapters++;
    return { success: true, chapterId: chapterId, chapter: chapter };
  };

  MemoryTheater.prototype.addSceneToChapter = function(chapterId, sceneId, position) {
    var chapter = this.chapters[chapterId];
    var scene = this.scenes[sceneId];
    if (!chapter || !scene) return { error: 'not_found' };
    if (position !== undefined) {
      chapter.sceneOrder.splice(position, 0, sceneId);
    } else {
      chapter.sceneOrder.push(sceneId);
    }
    return { success: true, orderLength: chapter.sceneOrder.length };
  };

  MemoryTheater.prototype.getChapterScenes = function(chapterId) {
    var chapter = this.chapters[chapterId];
    if (!chapter) return [];
    return chapter.sceneOrder.map(function(sid) { return this.scenes[sid]; }, this).filter(Boolean);
  };

  // Layer Management (generic-agent L0-L4)
  MemoryTheater.prototype.setActiveLayer = function(layer) {
    if (layer < 0 || layer > 4) return { error: 'invalid_layer' };
    this.currentLayer = layer;
    this._triggerHook('onLayerChange', layer);
    return { success: true, currentLayer: layer };
  };

  MemoryTheater.prototype.getLayerScenes = function(layer) {
    return this.getScenesByLayer(layer);
  };

  // Hook System (ruflo lifecycle hooks)
  MemoryTheater.prototype.registerHook = function(eventName, callback) {
    if (!this.hookRegistry[eventName]) this.hookRegistry[eventName] = [];
    this.hookRegistry[eventName].push(callback);
    return { success: true, hookCount: this.hookRegistry[eventName].length };
  };

  MemoryTheater.prototype._triggerHook = function(eventName) {
    var hooks = this.hookRegistry[eventName] || [];
    var args = Array.prototype.slice.call(arguments, 1);
    hooks.forEach(function(h) { h.apply(null, args); });
  };

  // Connection Management
  MemoryTheater.prototype.connectScenes = function(sceneId1, sceneId2) {
    var s1 = this.scenes[sceneId1], s2 = this.scenes[sceneId2];
    if (!s1 || !s2) return { error: 'not_found' };
    if (s1.connections.indexOf(sceneId2) < 0) s1.connections.push(sceneId2);
    if (s2.connections.indexOf(sceneId1) < 0) s2.connections.push(sceneId1);
    return { success: true };
  };

  MemoryTheater.prototype.getConnectedScenes = function(sceneId) {
    var scene = this.scenes[sceneId];
    if (!scene) return [];
    return scene.connections.map(function(sid) { return this.scenes[sid]; }, this).filter(Boolean);
  };

  // Theater Stats
  MemoryTheater.prototype.getTheaterStats = function() {
    return {
      totalScenes: this.stats.totalScenes,
      totalCharacters: this.stats.totalCharacters,
      totalChapters: this.stats.totalChapters,
      currentLayer: this.currentLayer,
      activeScene: this.activeSceneId,
      layerCounts: [0,1,2,3,4].map(function(l) { return this.getScenesByLayer(l).length; }, this)
    };
  };

  // ------ Expose globally ------
  window.MemoryTheater = window.MemoryTheater || MemoryTheater;
  window.MemoryScene = window.MemoryScene || MemoryScene;
  window.Character = window.Character || Character;
  window.NarrativeChapter = window.NarrativeChapter || NarrativeChapter;

})();
