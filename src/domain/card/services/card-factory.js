// ============================================================================
// Card Card Lab — V175 Direction E
// Card laboratory for experimenting with card crafting and fusion
// ruflo hierarchical decomposition + nanobot distributed mesh
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // Recipe: A card crafting recipe
  // ========================================================================
  function Recipe(recipeId, name, inputCards, outputCard, experimentPoints) {
    this.recipeId = recipeId;
    this.name = name || recipeId;
    this.inputCards = inputCards || []; // array of { cardId, element, rarity }
    this.outputCard = outputCard || null; // { cardId, element, rarity }
    this.experimentPoints = experimentPoints || 10;
    this.timesUsed = 0;
    this.successRate = 0.8; // 80% base
  }

  Recipe.prototype.getInputCount = function () {
    return this.inputCards.length;
  };

  Recipe.prototype.getTotalInputValue = function () {
    var total = 0;
    for (var i = 0; i < this.inputCards.length; i++) {
      var c = this.inputCards[i];
      var val = c.rarity === 'legendary' ? 50 : c.rarity === 'epic' ? 30 : c.rarity === 'rare' ? 10 : 5;
      total += val;
    }
    return total;
  };

  Recipe.prototype.recordUse = function (success) {
    this.timesUsed++;
    return { success: true, timesUsed: this.timesUsed };
  };

  // ----------------------------------------------------------------=======
  // CardFusion: Card fusion chamber
  // ========================================================================
  function CardFusion(fusionId, name, capacity) {
    this.fusionId = fusionId;
    this.name = name || fusionId;
    this.capacity = capacity || 3;
    this.currentIngredients = [];
    this.isActive = false;
    this.fusionResult = null;
  }

  CardFusion.prototype.addIngredient = function (card) {
    if (this.currentIngredients.length >= this.capacity) {
      return { error: 'capacity_full' };
    }
    this.currentIngredients.push(card);
    if (this.currentIngredients.length >= 2) this.isActive = true;
    return { success: true, ingredientCount: this.currentIngredients.length };
  };

  CardFusion.prototype.removeIngredient = function (cardId) {
    for (var i = 0; i < this.currentIngredients.length; i++) {
      if (this.currentIngredients[i].cardId === cardId) {
        this.currentIngredients.splice(i, 1);
        if (this.currentIngredients.length < 2) this.isActive = false;
        return { success: true };
      }
    }
    return { error: 'card_not_found' };
  };

  CardFusion.prototype.startFusion = function () {
    if (!this.isActive) {
      return { error: 'not_enough_ingredients' };
    }
    var totalValue = 0;
    var dominantElement = null;
    var elementCounts = {};
    for (var i = 0; i < this.currentIngredients.length; i++) {
      var c = this.currentIngredients[i];
      var val = c.rarity === 'legendary' ? 50 : c.rarity === 'epic' ? 30 : c.rarity === 'rare' ? 10 : 5;
      totalValue += val;
      if (c.element) {
        elementCounts[c.element] = (elementCounts[c.element] || 0) + 1;
      }
    }
    var maxCount = 0;
    for (var e in elementCounts) {
      if (elementCounts[e] > maxCount) {
        maxCount = elementCounts[e];
        dominantElement = e;
      }
    }
    var fusionSuccess = Math.random() < 0.75; // 75% success
    this.fusionResult = {
      success: fusionSuccess,
      totalValue: totalValue,
      dominantElement: dominantElement,
      ingredients: this.currentIngredients.slice()
    };
    return { success: true, fusionSuccess: fusionSuccess };
  };

  CardFusion.prototype.clear = function () {
    this.currentIngredients = [];
    this.isActive = false;
    this.fusionResult = null;
    return { success: true };
  };

  CardFusion.prototype.getIngredients = function () {
    return this.currentIngredients.slice();
  };

  CardFusion.prototype.getResult = function () {
    return this.fusionResult;
  };

  // ----------------------------------------------------------------=======
  // CardLab: Manages the card laboratory
  // ========================================================================
  function CardLab(storageKey) {
    this.storageKey = storageKey || 'card_lab';
    this._fusions = {};
    this._recipes = {};
    this._recipeIdCounter = 0;
    this._fusionIdCounter = 0;
    this._experimentPoints = {}; // playerId -> points
    this._init();
  }

  CardLab.prototype._init = function () {
    this._load();
    if (Object.keys(this._recipes).length === 0) {
      this._createDefaultRecipes();
    }
  };

  CardLab.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._experimentPoints = data.experimentPoints || {};
        }
      }
    } catch (e) {}
  };

  CardLab.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          experimentPoints: this._experimentPoints
        }));
      }
    } catch (e) {}
  };

  CardLab.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[CardLab] ' + msg);
    }
  };

  CardLab.prototype._createDefaultRecipes = function () {
    var def = [
      new Recipe('r1', 'Fire Fusion', [
        { cardId: 'c1', element: 'fire', rarity: 'rare' },
        { cardId: 'c2', element: 'fire', rarity: 'rare' }
      ], { cardId: 'c_new', element: 'fire', rarity: 'epic' }, 20),
      new Recipe('r2', 'Earth Fusion', [
        { cardId: 'c1', element: 'earth', rarity: 'common' },
        { cardId: 'c2', element: 'earth', rarity: 'common' }
      ], { cardId: 'c_new', element: 'earth', rarity: 'rare' }, 15),
      new Recipe('r3', 'Legendary Fusion', [
        { cardId: 'c1', element: 'light', rarity: 'legendary' },
        { cardId: 'c2', element: 'shadow', rarity: 'legendary' }
      ], { cardId: 'c_new', element: 'neutral', rarity: 'legendary' }, 100)
    ];
    for (var i = 0; i < def.length; i++) {
      this._recipes[def[i].recipeId] = def[i];
    }
  };

  CardLab.prototype.createFusionChamber = function (capacity) {
    var fusionId = 'fusion_' + (++this._fusionIdCounter);
    this._fusions[fusionId] = new CardFusion(fusionId, 'Chamber ' + this._fusionIdCounter, capacity);
    return { success: true, fusionId: fusionId };
  };

  CardLab.prototype.getFusion = function (fusionId) {
    return this._fusions[fusionId] || null;
  };

  CardLab.prototype.getAllFusions = function () {
    return Object.keys(this._fusions).map(function (k) { return this._fusions[k]; }.bind(this));
  };

  CardLab.prototype.getRecipe = function (recipeId) {
    return this._recipes[recipeId] || null;
  };

  CardLab.prototype.getAllRecipes = function () {
    return Object.keys(this._recipes).map(function (k) { return this._recipes[k]; }.bind(this));
  };

  CardLab.prototype.getExperimentPoints = function (playerId) {
    return this._experimentPoints[playerId] || 0;
  };

  CardLab.prototype.addExperimentPoints = function (playerId, points) {
    if (!this._experimentPoints[playerId]) this._experimentPoints[playerId] = 0;
    this._experimentPoints[playerId] += points;
    this._save();
    return { success: true, points: this._experimentPoints[playerId] };
  };

  CardLab.prototype.spendExperimentPoints = function (playerId, points) {
    if (!this._experimentPoints[playerId]) this._experimentPoints[playerId] = 0;
    if (this._experimentPoints[playerId] < points) return { error: 'insufficient_points' };
    this._experimentPoints[playerId] -= points;
    this._save();
    return { success: true, points: this._experimentPoints[playerId] };
  };

  CardLab.prototype.applyRecipe = function (playerId, recipeId, cards) {
    var recipe = this._recipes[recipeId];
    if (!recipe) return { error: 'recipe_not_found' };
    var epCost = recipe.experimentPoints;
    var sp = this.spendExperimentPoints(playerId, epCost);
    if (sp.error) return sp;
    var success = Math.random() < recipe.successRate;
    recipe.recordUse(success);
    if (success) {
      this.addExperimentPoints(playerId, recipe.experimentPoints * 2);
    }
    return { success: true, recipeUsed: recipeId, experimentPointsSpent: epCost, recipeSuccess: success };
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.Recipe = Recipe;
  window.CardFusion = CardFusion;
  window.CardLab = CardLab;
})();