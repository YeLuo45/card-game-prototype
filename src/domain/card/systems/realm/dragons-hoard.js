// ============================================================================
// Card Dragon's Hoard — V195 Direction E
// Dragon treasure hoarding with gold, gems, artifacts and dragon moods
// ruflo hierarchical decomposition + chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // TreasureItem: A treasure item
  // -----------------------------------------------------------------------
  function TreasureItem(itemId, name, type, value, rarity) {
    this.itemId = itemId;
    this.name = name || itemId;
    this.type = type || 'gold'; // gold, gem, artifact, relic
    this.value = value || 1;
    this.rarity = rarity || 'common'; // common, uncommon, rare, epic, legendary
    this.hoarded = false;
    this.acquisitionDate = null;
  }

  TreasureItem.prototype.hoard = function () {
    this.hoarded = true;
    this.acquisitionDate = Date.now();
    return { success: true, totalValue: this.value };
  };

  TreasureItem.prototype.getValueMultiplier = function () {
    var mult = { common: 1, uncommon: 2, rare: 5, epic: 10, legendary: 25 };
    return mult[this.rarity] || 1;
  };

  // -----------------------------------------------------------------------
  // DragonMood: The mood of a dragon
  // -----------------------------------------------------------------------
  function DragonMood(moodId, moodState, influence, trigger) {
    this.moodId = moodId;
    this.moodState = moodState || 'neutral'; // angry, content, generous, greedy, territorial
    this.influence = influence || 1;
    this.trigger = trigger || null;
    this.turnsInMood = 0;
  }

  DragonMood.prototype.shift = function (newState) {
    this.moodState = newState;
    this.turnsInMood = 0;
    return { success: true, mood: this.moodState };
  };

  DragonMood.prototype.tick = function () {
    this.turnsInMood++;
    var threshold = Math.max(5, 20 - this.influence);
    if (this.turnsInMood >= threshold) {
      this.shift('neutral');
      return { shifted: true, newMood: 'neutral' };
    }
    return { shifted: false, turns: this.turnsInMood };
  };

  DragonMood.prototype.getMoodFactor = function () {
    var factors = { angry: 0.5, neutral: 1, content: 1.5, generous: 2, greedy: 1.2, territorial: 0.8 };
    return factors[this.moodState] || 1;
  };

  // -----------------------------------------------------------------------
  // DragonHoard: A dragon's hoard
  // --------------------------------------------------------------------===
  function DragonHoard(hoardId, dragonName, capacity) {
    this.hoardId = hoardId;
    this.dragonName = dragonName || 'Dragon';
    this.capacity = capacity || 100;
    this.items = [];
    this.mood = new DragonMood('mood_' + hoardId, 'neutral', 3);
    this.goldCount = 0;
    this.gemCount = 0;
    this.artifactCount = 0;
  }

  DragonHoard.prototype.addItem = function (item) {
    if (this.items.length >= this.capacity) return { error: 'hoard_full' };
    this.items.push(item);
    item.hoard();
    if (item.type === 'gold') this.goldCount++;
    else if (item.type === 'gem') this.gemCount++;
    else if (item.type === 'artifact') this.artifactCount++;
    return { success: true, itemCount: this.items.length };
  };

  DragonHoard.prototype.getTotalValue = function () {
    var total = 0;
    for (var i = 0; i < this.items.length; i++) {
      total += this.items[i].value * this.items[i].getValueMultiplier();
    }
    return Math.floor(total * this.mood.getMoodFactor());
  };

  DragonHoard.prototype.getItemCount = function () { return this.items.length; };
  DragonHoard.prototype.getGoldCount = function () { return this.goldCount; };
  DragonHoard.prototype.getGemCount = function () { return this.gemCount; };
  DragonHoard.prototype.getArtifactCount = function () { return this.artifactCount; };

  DragonHoard.prototype.findItemByName = function (name) {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].name.toLowerCase().indexOf(name.toLowerCase()) !== -1) return this.items[i];
    }
    return null;
  };

  // -----------------------------------------------------------------------
  // DragonHoardManager: Manages multiple dragon hoards
  // -----------------------------------------------------------------------
  function DragonHoardManager(managerId, name) {
    this.managerId = managerId || 'manager1';
    this.name = name || 'Dragon Hoard Manager';
    this.hoards = {};
    this.hoardCounter = 0;
    this.totalItemsHoarded = 0;
    this._seedDefault();
  }

  DragonHoardManager.prototype._seedDefault = function () {
    this.hoards['hoard_default'] = new DragonHoard('hoard_default', 'Ancient Dragon', 50);
  };

  DragonHoardManager.prototype.createHoard = function (dragonName, capacity) {
    var id = 'hoard_' + (++this.hoardCounter);
    this.hoards[id] = new DragonHoard(id, dragonName, capacity);
    return { success: true, hoardId: id };
  };

  DragonHoardManager.prototype.getHoard = function (id) { return this.hoards[id] || null; };

  DragonHoardManager.prototype.getAllHoards = function () {
    return Object.keys(this.hoards).map(function (k) { return this.hoards[k]; }.bind(this));
  };

  DragonHoardManager.prototype.getTotalValueAcrossAll = function () {
    var total = 0;
    for (var hid in this.hoards) total += this.hoards[hid].getTotalValue();
    return total;
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.TreasureItem = TreasureItem;
  window.DragonMood = DragonMood;
  window.DragonHoard = DragonHoard;
  window.DragonHoardManager = DragonHoardManager;
})();