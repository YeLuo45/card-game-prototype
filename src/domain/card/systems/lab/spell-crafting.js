// ============================================================================
// Card Spell Crafting — V188 Direction D
// Spell crafting with elemental combinations, mana costs, and spell scrolls
// generic-agent + nanobot distributed mesh
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Ingredient: An ingredient for spell crafting
  // -----------------------------------------------------------------------
  function Ingredient(ingredientId, name, element, potency) {
    this.ingredientId = ingredientId;
    this.name = name || ingredientId;
    this.element = element || 'neutral'; // fire, water, earth, wind, lightning, shadow, light, neutral
    this.potency = potency || 1;
  }

  Ingredient.prototype.getEffectivePotency = function (spellElement) {
    if (this.element === spellElement) return this.potency * 2;
    if (this._getOpponent(spellElement) === this.element) return this.potency * 0.5;
    return this.potency;
  };

  Ingredient.prototype._getOpponent = function (element) {
    var opposites = { fire: 'water', water: 'fire', earth: 'wind', wind: 'earth', lightning: 'shadow', shadow: 'lightning', light: 'shadow', shadow: 'light' };
    return opposites[element] || null;
  };

  // -----------------------------------------------------------------------
  // SpellRecipe: A recipe for crafting a spell
  // -----------------------------------------------------------------------
  function SpellRecipe(recipeId, name, ingredients, resultElement, manaCost, power) {
    this.recipeId = recipeId;
    this.name = name || 'Spell ' + recipeId;
    this.ingredients = ingredients || []; // array of { ingredientId, count }
    this.resultElement = resultElement || 'neutral';
    this.manaCost = manaCost || 10;
    this.power = power || 1;
  }

  SpellRecipe.prototype.canCraft = function (availableIngredients) {
    for (var i = 0; i < this.ingredients.length; i++) {
      var needed = this.ingredients[i].count;
      var found = 0;
      for (var j = 0; j < availableIngredients.length; j++) {
        if (availableIngredients[j].ingredientId === this.ingredients[i].ingredientId) found += availableIngredients[j].count || 1;
      }
      if (found < needed) return false;
    }
    return true;
  };

  SpellRecipe.prototype.getTotalPotency = function (ingredients) {
    var total = 0;
    for (var i = 0; i < this.ingredients.length; i++) {
      for (var j = 0; j < ingredients.length; j++) {
        if (ingredients[j].ingredientId === this.ingredients[i].ingredientId) {
          total += ingredients[j].potency;
        }
      }
    }
    return total;
  };

  // -----------------------------------------------------------------------
  // SpellScroll: A crafted spell scroll
  // -----------------------------------------------------------------------
  function SpellScroll(scrollId, spellName, element, manaCost, power, quality) {
    this.scrollId = scrollId;
    this.spellName = spellName;
    this.element = element;
    this.manaCost = manaCost || 10;
    this.power = power || 1;
    this.quality = quality || 'common'; // common, enhanced, legendary
    this.used = false;
    this.createdAt = Date.now();
  }

  SpellScroll.prototype.use = function (casterMana) {
    if (this.used) return { error: 'already_used' };
    if (casterMana < this.manaCost) return { error: 'insufficient_mana' };
    this.used = true;
    return { success: true, power: this.power * this.qualityMultiplier() };
  };

  SpellScroll.prototype.qualityMultiplier = function () {
    return { common: 1, enhanced: 2, legendary: 5 }[this.quality] || 1;
  };

  // -----------------------------------------------------------------------
  // SpellCraftingBench: Workbench for crafting spells
  // -----------------------------------------------------------------------
  function SpellCraftingBench(benchId, name) {
    this.benchId = benchId || ('bench_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Spell Crafting Bench';
    this.recipes = {}; // recipeId -> SpellRecipe
    this.scrollIdCounter = 0;
    this.craftedScrolls = [];
  }

  SpellCraftingBench.prototype.addRecipe = function (recipe) {
    this.recipes[recipe.recipeId] = recipe;
    return { success: true, recipeCount: Object.keys(this.recipes).length };
  };

  SpellCraftingBench.prototype.getRecipe = function (recipeId) {
    return this.recipes[recipeId] || null;
  };

  SpellCraftingBench.prototype.craft = function (recipeId, ingredients) {
    var recipe = this.recipes[recipeId];
    if (!recipe) return { error: 'recipe_not_found' };
    if (!recipe.canCraft(ingredients)) return { error: 'missing_ingredients' };
    var quality = this._determineQuality(ingredients, recipe);
    this.scrollIdCounter++;
    var scrollId = 'scroll_' + this.scrollIdCounter;
    var scroll = new SpellScroll(scrollId, recipe.name, recipe.resultElement, recipe.manaCost, recipe.power, quality);
    this.craftedScrolls.push(scroll);
    return { success: true, scroll: scroll };
  };

  SpellCraftingBench.prototype._determineQuality = function (ingredients, recipe) {
    var totalPotency = recipe.getTotalPotency(ingredients);
    if (totalPotency >= 20) return 'legendary';
    if (totalPotency >= 10) return 'enhanced';
    return 'common';
  };

  SpellCraftingBench.prototype.getCraftedScrolls = function () {
    return this.craftedScrolls.slice();
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.Ingredient = Ingredient;
  window.SpellRecipe = SpellRecipe;
  window.SpellScroll = SpellScroll;
  window.SpellCraftingBench = SpellCraftingBench;
})();