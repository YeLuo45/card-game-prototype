// ============================================================================
// Card Mystic Forge — V211 Direction E
// Mystic forge with artifact crafting, enchanting, and forge rituals
// ruflo hierarchical decomposition + chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // ForgeMaterial: A material for forging
  // -----------------------------------------------------------------------
  function ForgeMaterial(matId, name, rarity, value, elemental) {
    this.matId = matId;
    this.name = name || matId;
    this.rarity = rarity || 'common'; // common, uncommon, rare, epic, legendary
    this.value = value || 10;
    this.elemental = elemental || 'neutral';
    this.used = false;
  }

  ForgeMaterial.prototype.consume = function () {
    if (this.used) return { error: 'already_used' };
    this.used = true;
    return { success: true };
  };

  ForgeMaterial.prototype.getValue = function () {
    var multipliers = { common: 1, uncommon: 2, rare: 5, epic: 10, legendary: 25 };
    return this.value * (multipliers[this.rarity] || 1);
  };

  // -----------------------------------------------------------------------
  // ForgeRecipe: A crafting recipe
  // -----------------------------------------------------------------------
  function ForgeRecipe(recipeId, name, materials, resultName, resultPower, difficulty) {
    this.recipeId = recipeId;
    this.name = name || recipeId;
    this.materials = materials || []; // [{matId, count}]
    this.resultName = resultName || 'Artifact';
    this.resultPower = resultPower || 10;
    this.difficulty = difficulty || 1; // 1-5
    this.uses = 0;
  }

  ForgeRecipe.prototype.match = function (inventory) {
    // inventory: array of ForgeMaterial
    var matched = [];
    var unmatched = [];
    for (var i = 0; i < this.materials.length; i++) {
      var required = this.materials[i];
      var found = 0;
      for (var j = 0; j < inventory.length; j++) {
        if (inventory[j].matId === required.matId && !inventory[j].used) found++;
      }
      if (found >= required.count) {
        matched.push(required.matId);
      } else {
        unmatched.push(required.matId);
      }
    }
    return { matched: matched.length === this.materials.length, matchedCount: matched.length, totalRequired: this.materials.length, unmatched: unmatched };
  };

  // -----------------------------------------------------------------------
  // Artifact: A crafted artifact
  // -----------------------------------------------------------------------
  function Artifact(artifactId, name, power, tier, enchantments) {
    this.artifactId = artifactId;
    this.name = name || artifactId;
    this.power = power || 10;
    this.tier = tier || 1; // 1-5
    this.enchantments = enchantments || []; // array of enchantment strings
    this.forgedBy = null;
    this.inscribed = false;
  }

  Artifact.prototype.enchant = function (enchantment) {
    if (this.enchantments.indexOf(enchantment) !== -1) return { error: 'already_enchanted' };
    this.enchantments.push(enchantment);
    this.power += 5;
    return { success: true, enchantments: this.enchantments.length, power: this.power };
  };

  Artifact.prototype.inscribe = function (rune) {
    if (this.inscribed) return { error: 'already_inscribed' };
    this.inscribed = true;
    return { success: true };
  };

  Artifact.prototype.getPower = function () {
    var base = this.power * this.tier;
    return base;
  };

  Artifact.prototype.getEnchantmentCount = function () { return this.enchantments.length; };

  // --------------------------------------------------------------------===
  // MysticForge: Main forge manager
  // ----------------------------------------------------------------=======
  function MysticForge(forgeId, name, rank) {
    this.forgeId = forgeId || ('forge_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Mystic Forge';
    this.rank = rank || 'apprentice'; // apprentice, journeyman, expert, master, grandmaster
    this.recipes = {};
    this.artifacts = {};
    this.forgeXP = 0;
    this.forgeLevel = 1;
  }

  MysticForge.prototype.registerRecipe = function (recipe) {
    this.recipes[recipe.recipeId] = recipe;
    return { success: true, count: Object.keys(this.recipes).length };
  };

  MysticForge.prototype.forge = function (recipeId, inventory) {
    var recipe = this.recipes[recipeId];
    if (!recipe) return { error: 'recipe_not_found' };
    var match = recipe.match(inventory);
    if (!match.matched) return { error: 'insufficient_materials', missing: match.unmatched };
    // Consume materials
    for (var i = 0; i < recipe.materials.length; i++) {
      var required = recipe.materials[i];
      var consumed = 0;
      for (var j = 0; j < inventory.length; j++) {
        if (consumed >= required.count) break;
        if (inventory[j].matId === required.matId && !inventory[j].used) {
          inventory[j].used = true;
          consumed++;
        }
      }
    }
    recipe.uses++;
    var artifact = new Artifact('a_' + Date.now(), recipe.resultName, recipe.resultPower, recipe.difficulty, []);
    artifact.forgedBy = this.forgeId;
    this.artifacts[artifact.artifactId] = artifact;
    return { success: true, artifact: artifact, power: artifact.getPower() };
  };

  MysticForge.prototype.getRecipe = function (id) { return this.recipes[id] || null; };
  MysticForge.prototype.getArtifact = function (id) { return this.artifacts[id] || null; };
  MysticForge.prototype.getRecipeCount = function () { return Object.keys(this.recipes).length; };
  MysticForge.prototype.getArtifactCount = function () { return Object.keys(this.artifacts).length; };

  MysticForge.prototype.addXP = function (amount) {
    this.forgeXP += amount;
    var thresholds = [0, 150, 400, 800, 1500];
    var levels = [1, 2, 3, 4, 5];
    for (var i = levels.length - 1; i >= 0; i--) {
      if (this.forgeXP >= thresholds[i]) { this.forgeLevel = levels[i]; break; }
    }
    return { success: true, forgeXP: this.forgeXP, forgeLevel: this.forgeLevel };
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.ForgeMaterial = ForgeMaterial;
  window.ForgeRecipe = ForgeRecipe;
  window.Artifact = Artifact;
  window.MysticForge = MysticForge;
})();