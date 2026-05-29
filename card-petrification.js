// ============================================================================
// Card Petrification — V186 Direction B
// Card petrification, statue transformation and stone garden collection
// chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // PetrificationResult: Result of turning a card to stone
  // -----------------------------------------------------------------------
  function PetrificationResult(resultId, cardId, originalCard, statueType, beautyScore) {
    this.resultId = resultId;
    this.cardId = cardId;
    this.originalCard = originalCard || null;
    this.statueType = statueType || 'bust'; // bust, full, relief
    this.beautyScore = beautyScore || 0;
    this.createdAt = Date.now();
  }

  PetrificationResult.prototype.getDisplayName = function () {
    if (!this.originalCard) return 'Unknown Statue';
    return this.originalCard.name + ' (Stone)';
  };

  // -----------------------------------------------------------------------
  // StoneCard: A card that has been petrified into a statue
  // -----------------------------------------------------------------------
  function StoneCard(cardId, originalCard, quality) {
    this.cardId = cardId;
    this.originalCard = originalCard;
    this.quality = quality || 'common'; // common, fine, masterwork, masterpiece
    this.polished = false;
    this.inscriptions = [];
  }

  StoneCard.prototype.polish = function () {
    if (this.polished) return { error: 'already_polished' };
    this.polished = true;
    return { success: true, newQuality: this.quality };
  };

  StoneCard.prototype.addInscription = function (text) {
    this.inscriptions.push(text);
    return { success: true, inscriptionCount: this.inscriptions.length };
  };

  StoneCard.prototype.getValue = function () {
    var qualityMultiplier = { common: 1, fine: 3, masterwork: 10, masterpiece: 50 };
    var mult = qualityMultiplier[this.quality] || 1;
    var base = this.originalCard ? Math.max(1, this.originalCard.cost) : 1;
    return base * 10 * mult * (this.polished ? 2 : 1);
  };

  // -----------------------------------------------------------------------
  // StoneGarden: Collection of petrified statues
  // --------------------------------------------------------------------===
  function StoneGarden(gardenId, name) {
    this.gardenId = gardenId;
    this.name = name || 'Stone Garden ' + gardenId;
    this.statues = []; // array of StoneCard
    this.statueIdCounter = 0;
    this.capacity = 20;
  }

  StoneGarden.prototype.addStatue = function (stoneCard) {
    if (this.statues.length >= this.capacity) {
      return { error: 'garden_full' };
    }
    this.statueIdCounter++;
    var statueId = 'statue_' + this.statueIdCounter;
    stoneCard.statueId = statueId;
    this.statues.push(stoneCard);
    return { success: true, statueId: statueId, totalStatues: this.statues.length };
  };

  StoneGarden.prototype.removeStatue = function (statueId) {
    for (var i = 0; i < this.statues.length; i++) {
      if (this.statues[i].statueId === statueId) {
        this.statues.splice(i, 1);
        return { success: true };
      }
    }
    return { error: 'statue_not_found' };
  };

  StoneGarden.prototype.getStatue = function (statueId) {
    for (var i = 0; i < this.statues.length; i++) {
      if (this.statues[i].statueId === statueId) return this.statues[i];
    }
    return null;
  };

  StoneGarden.prototype.getStatuesByQuality = function (quality) {
    var result = [];
    for (var i = 0; i < this.statues.length; i++) {
      if (this.statues[i].quality === quality) result.push(this.statues[i]);
    }
    return result;
  };

  StoneGarden.prototype.getTotalValue = function () {
    var total = 0;
    for (var i = 0; i < this.statues.length; i++) {
      total += this.statues[i].getValue();
    }
    return total;
  };

  // -----------------------------------------------------------------------
  // PetrificationEngine: Turns regular cards into stone statues
  // -----------------------------------------------------------------------
  function PetrificationEngine(engineId, name) {
    this.engineId = engineId || ('pet_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Petrification Engine';
    this.processedCount = 0;
    this.results = [];
  }

  PetrificationEngine.prototype.petrify = function (card, quality, inscription) {
    this.processedCount++;
    var qualities = ['common', 'fine', 'masterwork', 'masterpiece'];
    var statueType = ['bust', 'full', 'relief'][Math.floor(Math.random() * 3)];
    var baseBeauty = Math.floor(Math.random() * 100);
    var beautyScore = baseBeauty + (qualities.indexOf(quality) * 20);
    var stoneCard = new StoneCard(card.cardId, card, quality);
    if (inscription) stoneCard.addInscription(inscription);
    var resultId = 'pr_' + this.processedCount;
    var result = new PetrificationResult(resultId, card.cardId, card, statueType, beautyScore);
    this.results.push(result);
    return { success: true, stoneCard: stoneCard, result: result };
  };

  PetrificationEngine.prototype.getResults = function () {
    return this.results.slice();
  };

  PetrificationEngine.prototype.getAverageBeauty = function () {
    if (this.results.length === 0) return 0;
    var total = 0;
    for (var i = 0; i < this.results.length; i++) {
      total += this.results[i].beautyScore;
    }
    return Math.floor(total / this.results.length);
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.PetrificationResult = PetrificationResult;
  window.StoneCard = StoneCard;
  window.StoneGarden = StoneGarden;
  window.PetrificationEngine = PetrificationEngine;
})();