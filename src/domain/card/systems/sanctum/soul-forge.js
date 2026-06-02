// ============================================================================
// Card Soul Forge — V226 Direction E
// Soul forge with soul fusion, spirit crafting, and essence transmutation
// claude-code feedback + chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // SoulGem: A gem containing a fused soul
  // -----------------------------------------------------------------------
  function SoulGem(gemId, name, purity, essence) {
    this.gemId = gemId;
    this.name = name || gemId;
    this.purity = (purity !== undefined) ? purity : 70; // nullish coalescing
    this.essence = (essence !== undefined) ? essence : 0; // nullish coalescing
    this.fused = false;
    this.fusionCount = 0;
  }

  SoulGem.prototype.fuse = function (otherGem) {
    if (this.fused) return { error: 'already_fused' };
    if (!otherGem || !otherGem.gemId) return { error: 'invalid_gem' };
    this.essence += Math.floor((this.purity + otherGem.purity) / 2);
    this.fusionCount++;
    this.purity = Math.min(100, Math.floor((this.purity + otherGem.purity) / 2));
    this.fused = true;
    return { success: true, essence: this.essence, purity: this.purity };
  };

  SoulGem.prototype.extract = function () {
    if (!this.fused) return { error: 'not_fused' };
    this.essence = Math.max(0, this.essence - 20);
    return { success: true, essence: this.essence };
  };

  SoulGem.prototype.getGemPower = function () {
    return this.fused ? this.purity * 3 + this.essence : 0;
  };

  // -----------------------------------------------------------------------
  // SpiritCraft: Craft items from spirits
  // -----------------------------------------------------------------------
  function SpiritCraft(craftId, name, craftPower, recipes) {
    this.craftId = craftId;
    this.name = name || craftId;
    this.craftPower = (craftPower !== undefined) ? craftPower : 50; // nullish coalescing
    this.recipes = recipes || [];
    this.crafted = [];
  }

  SpiritCraft.prototype.addRecipe = function (name, cost) {
    for (var i = 0; i < this.recipes.length; i++) {
      if (this.recipes[i].name === name) return { error: 'recipe_exists' };
    }
    this.recipes.push({ name: name, cost: cost });
    return { success: true, count: this.recipes.length };
  };

  SpiritCraft.prototype.craft = function (recipeName) {
    for (var i = 0; i < this.recipes.length; i++) {
      if (this.recipes[i].name === recipeName) {
        var cost = this.recipes[i].cost;
        if (this.craftPower < cost) return { error: 'insufficient_power' };
        this.craftPower -= cost;
        this.crafted.push(recipeName);
        return { success: true, item: recipeName };
      }
    }
    return { error: 'unknown_recipe' };
  };

  SpiritCraft.prototype.getCraftPower = function () {
    return this.craftPower + this.crafted.length * 15;
  };

  // -----------------------------------------------------------------------
  // EssenceTransmuter: Transmute essence between forms
  // -----------------------------------------------------------------------
  function EssenceTransmuter(transId, name, transStrength,transmuteCount) {
    this.transId = transId;
    this.name = name || transId;
    this.transStrength = (transStrength !== undefined) ? transStrength : 40; // nullish coalescing
    this.transmuteCount = (transmuteCount !== undefined) ? transmuteCount : 0; // nullish coalescing
    this.totalTransmuted = 0;
  }

  EssenceTransmuter.prototype.transmute = function (inputEssence, outputEssence) {
    if (inputEssence < 10) return { error: 'insufficient_input' };
    var ratio = Math.floor(inputEssence / 10);
    var output = ratio * 8;
    this.totalTransmuted += output;
    this.transmuteCount++;
    return { success: true, input: inputEssence, output: output };
  };

  EssenceTransmuter.prototype.getTransmuterPower = function () {
    return this.transStrength * 2 + this.transmuteCount * 20 + Math.floor(this.totalTransmuted / 50);
  };

  // -----------------------------------------------------------------------
  // SoulForge: Main forge system
  // -----------------------------------------------------------------------
  function SoulForge(forgeId, name, forgeRank) {
    this.forgeId = forgeId;
    this.name = name || 'Soul Forge';
    this.forgeRank = forgeRank || 1;
    this.gems = {};
    this.crafts = {};
    this.transmuters = {};
  }

  SoulForge.prototype.addGem = function (g) {
    this.gems[g.gemId] = g;
    return { success: true, count: Object.keys(this.gems).length };
  };

  SoulForge.prototype.addCraft = function (c) {
    this.crafts[c.craftId] = c;
    return { success: true, count: Object.keys(this.crafts).length };
  };

  SoulForge.prototype.addTransmuter = function (t) {
    this.transmuters[t.transId] = t;
    return { success: true, count: Object.keys(this.transmuters).length };
  };

  SoulForge.prototype.getForgePower = function () {
    var total = 0;
    for (var id in this.gems) total += this.gems[id].getGemPower();
    for (var id in this.crafts) total += this.crafts[id].getCraftPower();
    for (var id in this.transmuters) total += this.transmuters[id].getTransmuterPower();
    total += this.forgeRank * 25;
    return total;
  };

  window.SoulGem = SoulGem;
  window.SpiritCraft = SpiritCraft;
  window.EssenceTransmuter = EssenceTransmuter;
  window.SoulForge = SoulForge;
})();