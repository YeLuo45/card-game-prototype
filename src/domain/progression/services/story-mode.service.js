// ============================================================================
// Card Story Mode — V158 Direction E
// Interactive narrative card game with branching choices and character arcs
// chatdev multi-agent + ruflo hierarchical decomposition + generic-agent
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // Character: NPC or player character with stats and dialogue
  // ========================================================================
  function Character(id, name, role, personality, health, dialogueTree) {
    this.id = id || '';
    this.name = name || '';
    this.role = role || 'ally'; // ally | enemy | neutral | mentor
    this.personality = personality || 'balanced';
    this.health = health || 100;
    this.maxHealth = health || 100;
    this.dialogueTree = dialogueTree || {}; // nodeId -> { text, choices, next }
    this.currentNodeId = null;
    this.relationship = 0; // -100 to 100
    this.flags = {};
    this.inventory = [];
  }

  Character.prototype.startDialogue = function (nodeId) {
    this.currentNodeId = nodeId;
  };

  Character.prototype.getCurrentNode = function () {
    return this.dialogueTree[this.currentNodeId] || null;
  };

  Character.prototype.setFlag = function (key, value) {
    this.flags[key] = value;
  };

  Character.prototype.getFlag = function (key) {
    return this.flags[key];
  };

  Character.prototype.addItem = function (item) {
    this.inventory.push(item);
  };

  Character.prototype.hasItem = function (itemId) {
    return this.inventory.indexOf(itemId) >= 0;
  };

  Character.prototype.modifyRelationship = function (delta) {
    this.relationship = Math.max(-100, Math.min(100, this.relationship + delta));
  };

  Character.prototype.isAlive = function () { return this.health > 0; };

  // --------------------------------------------------------------------===
  // StoryScene: A single scene in the story
  // ========================================================================
  function StoryScene(id, title, description, sceneType, characters, choices, nextScenes, difficulty) {
    this.id = id || '';
    this.title = title || '';
    this.description = description || '';
    this.sceneType = sceneType || 'exploration'; // exploration | combat | dialogue | puzzle
    this.characters = characters || []; // array of character IDs present
    this.choices = choices || []; // array of { id, text, outcome, requires }
    this.nextScenes = nextScenes || []; // array of scene IDs that can follow
    this.difficulty = difficulty || 1;
    this.visited = false;
    this.completed = false;
    this.visitedAt = null;
  }

  StoryScene.prototype.visit = function () {
    this.visited = true;
    this.visitedAt = Date.now();
  };

  StoryScene.prototype.complete = function () {
    this.completed = true;
  };

  StoryScene.prototype.isAccessible = function () {
    // A scene is accessible if at least one of its nextScenes has been visited
    // or if it's the first scene
    return true; // simplified for now
  };

  // --------------------------------------------------------------------===
  // StoryChapter: A chapter of the story
  // ========================================================================
  function StoryChapter(id, title, description, sceneIds, unlockRequirement) {
    this.id = id || '';
    this.title = title || '';
    this.description = description || '';
    this.sceneIds = sceneIds || [];
    this.unlockRequirement = unlockRequirement || 0;
    this.status = 'locked'; // locked | available | active | completed
    this.currentSceneId = null;
    this.completedScenes = [];
    this.unlockedAt = null;
  }

  StoryChapter.prototype.unlock = function () {
    this.status = 'available';
    this.unlockedAt = Date.now();
  };

  StoryChapter.prototype.getProgress = function () {
    return this.completedScenes.length;
  };

  // --------------------------------------------------------------------===
  // StoryMode: Main narrative story system
  // ========================================================================
  function StoryMode(storageKey) {
    this.storageKey = storageKey || 'story_mode';
    this._chapters = {};
    this._scenes = {};
    this._characters = {};
    this._currentChapterId = null;
    this._currentSceneId = null;
    this._storyFlags = {};
    this._choicesMade = [];
    this._stats = { scenesVisited: 0, choicesMade: 0, chaptersCompleted: 0 };
    this._init();
  }

  StoryMode.prototype._init = function () {
    this._load();
    if (Object.keys(this._scenes).length === 0) this._generateDefaultStory();
  };

  StoryMode.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._chapters = data.chapters || {};
          this._scenes = data.scenes || {};
          this._characters = data.characters || {};
          this._currentChapterId = data.currentChapterId || null;
          this._currentSceneId = data.currentSceneId || null;
          this._storyFlags = data.storyFlags || {};
          this._choicesMade = data.choicesMade || [];
          this._stats = data.stats || this._stats;
        }
      }
    } catch (e) {}
  };

  StoryMode.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          chapters: this._chapters,
          scenes: this._scenes,
          characters: this._characters,
          currentChapterId: this._currentChapterId,
          currentSceneId: this._currentSceneId,
          storyFlags: this._storyFlags,
          choicesMade: this._choicesMade,
          stats: this._stats
        }));
      }
    } catch (e) {}
  };

  StoryMode.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[StoryMode] ' + msg);
  };

  StoryMode.prototype._generateDefaultStory = function () {
    // Create a mentor character
    var elder = new Character('elder', 'Village Elder', 'mentor', 'wise', 100, {
      'n1': { text: 'Welcome, young traveler. Your journey begins here.', choices: [], next: null },
      'n2': { text: 'The forest holds many secrets. Proceed with caution.', choices: [], next: null }
    });
    elder.startDialogue('n1');
    this._characters['elder'] = elder;

    // Create first chapter
    var ch1 = new StoryChapter('ch1', 'The Beginning', 'Your journey starts', ['scene_1', 'scene_2'], 0);
    ch1.status = 'available';
    ch1.unlockedAt = Date.now();
    this._chapters['ch1'] = ch1;

    // Create scenes
    var s1 = new StoryScene('scene_1', 'Village Square', 'A bustling village square', 'exploration', ['elder'], [
      { id: 'c1', text: 'Speak with the elder', outcome: { scene: 'scene_2', flags: {} }, requires: null },
      { id: 'c2', text: 'Explore the market', outcome: { scene: null, flags: { market_visited: true } }, requires: null }
    ], ['scene_2'], 1);
    s1.visited = true; // first scene is visited
    s1.visit();
    this._scenes['scene_1'] = s1;

    var s2 = new StoryScene('scene_2', 'The Elder\'s Counsel', ' wisdom from the village elder', 'dialogue', ['elder'], [
      { id: 'c3', text: 'Ask about the ancient artifact', outcome: { scene: null, flags: { artifact_quest: true } }, requires: null }
    ], [], 1);
    this._scenes['scene_2'] = s2;

    this._currentChapterId = 'ch1';
    this._currentSceneId = 'scene_1';

    this._log('Generated default story');
  };

  // Get current chapter
  StoryMode.prototype.getCurrentChapter = function () {
    return this._chapters[this._currentChapterId] || null;
  };

  // Get current scene
  StoryMode.prototype.getCurrentScene = function () {
    return this._scenes[this._currentSceneId] || null;
  };

  // Navigate to a scene
  StoryMode.prototype.goToScene = function (sceneId) {
    var scene = this._scenes[sceneId];
    if (!scene) return { error: 'scene_not_found' };
    this._currentSceneId = sceneId;
    scene.visit();
    this._stats.scenesVisited++;
    this._save();
    return { success: true, scene: scene };
  };

  // Make a choice in current scene
  StoryMode.prototype.makeChoice = function (choiceId) {
    var scene = this._scenes[this._currentSceneId];
    if (!scene) return { error: 'no_current_scene' };

    var choice = null;
    for (var i = 0; i < scene.choices.length; i++) {
      if (scene.choices[i].id === choiceId) { choice = scene.choices[i]; break; }
    }
    if (!choice) return { error: 'choice_not_found' };

    // Record choice
    this._choicesMade.push({ sceneId: this._currentSceneId, choiceId: choiceId, madeAt: Date.now() });
    this._stats.choicesMade++;

    // Apply flags
    if (choice.outcome && choice.outcome.flags) {
      for (var key in choice.outcome.flags) this._storyFlags[key] = choice.outcome.flags[key];
    }

    // Navigate to next scene if specified
    if (choice.outcome && choice.outcome.scene) {
      this.goToScene(choice.outcome.scene);
    } else {
      scene.complete();
    }

    this._save();
    return { success: true, nextScene: this.getCurrentScene() };
  };

  // Set a story flag
  StoryMode.prototype.setFlag = function (key, value) {
    this._storyFlags[key] = value;
    this._save();
  };

  // Get a story flag
  StoryMode.prototype.getFlag = function (key) {
    return this._storyFlags[key];
  };

  // Get character
  StoryMode.prototype.getCharacter = function (charId) {
    return this._characters[charId] || null;
  };

  // Register a character
  StoryMode.prototype.registerCharacter = function (char) {
    this._characters[char.id] = char;
    this._save();
    return { success: true };
  };

  // Modify character relationship
  StoryMode.prototype.modifyRelationship = function (charId, delta) {
    var c = this._characters[charId];
    if (!c) return { error: 'character_not_found' };
    c.modifyRelationship(delta);
    this._save();
    return { success: true, relationship: c.relationship };
  };

  // List chapters
  StoryMode.prototype.listChapters = function () {
    var result = [];
    for (var id in this._chapters) result.push(this._chapters[id]);
    return result;
  };

  // List available scenes
  StoryMode.prototype.listAvailableScenes = function () {
    var result = [];
    for (var id in this._scenes) {
      if (this._scenes[id].visited) continue;
      result.push(this._scenes[id]);
    }
    return result;
  };

  // Get stats
  StoryMode.prototype.getStats = function () {
    return {
      scenesVisited: this._stats.scenesVisited,
      choicesMade: this._stats.choicesMade,
      chaptersCompleted: this._stats.chaptersCompleted
    };
  };

  // Add a chapter
  StoryMode.prototype.addChapter = function (id, title, description, sceneIds, unlockRequirement) {
    if (this._chapters[id]) return { error: 'chapter_exists' };
    this._chapters[id] = new StoryChapter(id, title, description, sceneIds, unlockRequirement);
    this._save();
    return { success: true };
  };

  // Add a scene
  StoryMode.prototype.addScene = function (id, title, description, sceneType, characters, choices, nextScenes, difficulty) {
    if (this._scenes[id]) return { error: 'scene_exists' };
    this._scenes[id] = new StoryScene(id, title, description, sceneType, characters, choices, nextScenes, difficulty);
    this._save();
    return { success: true };
  };

  // Get choices made count
  StoryMode.prototype.getChoicesMadeCount = function () {
    return this._choicesMade.length;
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.Character = Character;
  window.StoryScene = StoryScene;
  window.StoryChapter = StoryChapter;
  window.StoryMode = StoryMode;
})();