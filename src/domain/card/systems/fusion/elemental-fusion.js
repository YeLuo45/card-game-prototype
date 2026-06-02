// ============================================================================
// Card Elemental Fusion — V192 Direction B
// Elemental fusion with combination charts, resonance, and fusion mastery
// chatdev role specialization + thunderbolt feedback loops
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Element: An elemental type
  // -----------------------------------------------------------------------
  function Element(elementId, name, category, strength, weakness) {
    this.elementId = elementId;
    this.name = name || elementId;
    this.category = category || 'primary'; // primary, secondary, transcendent
    this.strength = strength || 1;
    this.weakness = weakness || 1;
  }

  Element.prototype.getPower = function (targetElement) {
    var mult = 1;
    if (this.category === 'transcendent') mult = 2;
    return Math.floor(this.strength * mult * (targetElement ? 1 : 1.5));
  };

  // -----------------------------------------------------------------------
  // FusionRecipe: A recipe for elemental fusion
  // -----------------------------------------------------------------------
  function FusionRecipe(recipeId, name, element1, element2, resultElement, power, resonance) {
    this.recipeId = recipeId;
    this.name = name || 'Fusion ' + recipeId;
    this.element1 = element1 || 'fire';
    this.element2 = element2 || 'water';
    this.resultElement = resultElement || 'steam';
    this.power = power || 10;
    this.resonance = resonance || 1; // 1-10
  }

  FusionRecipe.prototype.canFuse = function (e1, e2) {
    return (e1 === this.element1 && e2 === this.element2) ||
           (e1 === this.element2 && e2 === this.element1);
  };

  FusionRecipe.prototype.getResonanceBonus = function () {
    return Math.floor(this.power * this.resonance * 0.1);
  };

  // -----------------------------------------------------------------------
  // ElementalFusionChamber: A chamber for fusion experiments
  // -----------------------------------------------------------------------
  function ElementalFusionChamber(chamberId, name) {
    this.chamberId = chamberId || ('chamber_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Fusion Chamber';
    this.elements = {};
    this.recipes = {};
    this.fusionCount = 0;
    this.successfulFusions = 0;
    this.elementCounter = 0;
    this.recipeCounter = 0;
  }

  ElementalFusionChamber.prototype.addElement = function (element) {
    this.elements[element.elementId] = element;
    return { success: true, elementCount: Object.keys(this.elements).length };
  };

  ElementalFusionChamber.prototype.addRecipe = function (recipe) {
    this.recipes[recipe.recipeId] = recipe;
    return { success: true, recipeCount: Object.keys(this.recipes).length };
  };

  ElementalFusionChamber.prototype.fuse = function (elementId1, elementId2) {
    var e1 = this.elements[elementId1];
    var e2 = this.elements[elementId2];
    if (!e1 || !e2) return { error: 'element_not_found' };
    var matchedRecipe = null;
    for (var rid in this.recipes) {
      if (this.recipes[rid].canFuse(elementId1, elementId2)) {
        matchedRecipe = this.recipes[rid];
        break;
      }
    }
    this.fusionCount++;
    if (!matchedRecipe) return { success: false, reason: 'no_recipe', elements: [e1.name, e2.name] };
    this.successfulFusions++;
    var bonus = matchedRecipe.getResonanceBonus();
    return {
      success: true,
      resultElement: matchedRecipe.resultElement,
      power: matchedRecipe.power + bonus,
      resonance: matchedRecipe.resonance
    };
  };

  ElementalFusionChamber.prototype.getSuccessRate = function () {
    if (this.fusionCount === 0) return 0;
    return Math.floor((this.successfulFusions / this.fusionCount) * 100);
  };

  ElementalFusionChamber.prototype.getMasteryLevel = function () {
    var rate = this.getSuccessRate();
    if (rate >= 90) return 'master';
    if (rate >= 70) return 'expert';
    if (rate >= 50) return 'adept';
    return 'novice';
  };

  // -----------------------------------------------------------------------
  // ElementalFusionMaster: Overall manager
  // -----------------------------------------------------------------------
  function ElementalFusionMaster(masterId, name) {
    this.masterId = masterId || 'master1';
    this.name = name || 'Elemental Fusion Master';
    this.chambers = {};
    this.totalFusions = 0;
    this.chamberCounter = 0;
    this._seedDefault();
  }

  ElementalFusionMaster.prototype._seedDefault = function () {
    var chamber = new ElementalFusionChamber('chamber_default', 'Default Chamber');
    chamber.addElement(new Element('fire', 'Fire', 'primary', 10, 5));
    chamber.addElement(new Element('water', 'Water', 'primary', 8, 6));
    chamber.addElement(new Element('steam', 'Steam', 'secondary', 12, 3));
    this.chambers['chamber_default'] = chamber;
  };

  ElementalFusionMaster.prototype.createChamber = function (name) {
    var id = 'chamber_' + (++this.chamberCounter);
    this.chambers[id] = new ElementalFusionChamber(id, name);
    return { success: true, chamberId: id };
  };

  ElementalFusionMaster.prototype.getChamber = function (id) {
    return this.chambers[id] || null;
  };

  ElementalFusionMaster.prototype.getAllChambers = function () {
    return Object.keys(this.chambers).map(function (k) { return this.chambers[k]; }.bind(this));
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.Element = Element;
  window.FusionRecipe = FusionRecipe;
  window.ElementalFusionChamber = ElementalFusionChamber;
  window.ElementalFusionMaster = ElementalFusionMaster;
})();