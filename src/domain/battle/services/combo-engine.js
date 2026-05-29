// ============================================================================
// Card Combo Engine — V169 Direction D
// Card combo system with chain detection and synergy scoring
// nanobot distributed mesh + chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // ComboEffect: Defines a combo effect
  // ========================================================================
  function ComboEffect(id, name, requiredCards, effectValue, effectDescription) {
    this.id = id;
    this.name = name || id;
    this.requiredCards = requiredCards || []; // array of card IDs or categories
    this.effectValue = effectValue || 0;
    this.effectDescription = effectDescription || '';
  }

  ComboEffect.prototype.matchesCard = function (card) {
    return this.requiredCards.indexOf(card.id) >= 0 || this.requiredCards.indexOf(card.category) >= 0;
  };

  ComboEffect.prototype.isActivated = function (playedCards) {
    var matchCount = 0;
    for (var i = 0; i < playedCards.length; i++) {
      if (this.matchesCard(playedCards[i])) matchCount++;
    }
    return matchCount >= this.requiredCards.length;
  };

  // --------------------------------------------------------------------===
  // ComboChain: Tracks a chain of played cards
  // ========================================================================
  function ComboChain(maxLength) {
    this.maxLength = maxLength || 10;
    this.cards = []; // array of played cards
  }

  ComboChain.prototype.addCard = function (card) {
    this.cards.push(card);
    if (this.cards.length > this.maxLength) {
      this.cards.shift();
    }
    return { success: true, chainLength: this.cards.length };
  };

  ComboChain.prototype.clear = function () {
    this.cards = [];
    return { success: true };
  };

  ComboChain.prototype.getCards = function () {
    return this.cards.slice();
  };

  ComboChain.prototype.getLength = function () {
    return this.cards.length;
  };

  ComboChain.prototype.getRecentCards = function (count) {
    return this.cards.slice(-count);
  };

  // --------------------------------------------------------------------===
  // ComboDetector: Detects combos from combo effects
  // ========================================================================
  function ComboDetector(effects) {
    this.effects = effects || [];
    this._effectMap = {};
    for (var i = 0; i < this.effects.length; i++) {
      this._effectMap[this.effects[i].id] = this.effects[i];
    }
  }

  ComboDetector.prototype.addEffect = function (effect) {
    this.effects.push(effect);
    this._effectMap[effect.id] = effect;
  };

  ComboDetector.prototype.detectCombos = function (playedCards) {
    var activated = [];
    for (var i = 0; i < this.effects.length; i++) {
      if (this.effects[i].isActivated(playedCards)) {
        activated.push(this.effects[i]);
      }
    }
    return activated;
  };

  ComboDetector.prototype.getComboById = function (id) {
    return this._effectMap[id] || null;
  };

  // --------------------------------------------------------------------===
  // ComboScoreCalculator: Calculates synergy scores
  // ========================================================================
  function ComboScoreCalculator(baseMultiplier) {
    this.baseMultiplier = baseMultiplier || 1.0;
  }

  ComboScoreCalculator.prototype.calculateScore = function (activatedCombos, playedCards) {
    var baseScore = playedCards.length * 10;
    var comboBonus = 0;
    for (var i = 0; i < activatedCombos.length; i++) {
      comboBonus += activatedCombos[i].effectValue;
    }
    var totalScore = Math.round((baseScore + comboBonus) * this.baseMultiplier);
    return { baseScore: baseScore, comboBonus: comboBonus, totalScore: totalScore };
  };

  // --------------------------------------------------------------------===
  // ComboManager: Manages combo chains, detection, and scoring
  // ========================================================================
  function ComboManager(storageKey) {
    this.storageKey = storageKey || 'combo_manager';
    this._chain = new ComboChain();
    this._effects = [];
    this._detector = new ComboDetector();
    this._scoreCalc = new ComboScoreCalculator();
    this._history = []; // array of { cards, activatedCombos, score, timestamp }
    this._init();
  }

  ComboManager.prototype._init = function () {
    this._load();
  };

  ComboManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._scoreCalc = new ComboScoreCalculator(data.baseMultiplier || 1.0);
        }
      }
    } catch (e) {}
  };

  ComboManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          baseMultiplier: this._scoreCalc.baseMultiplier
        }));
      }
    } catch (e) {}
  };

  ComboManager.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[ComboManager] ' + msg);
    }
  };

  ComboManager.prototype.addEffect = function (effect) {
    this._effects.push(effect);
    this._detector.addEffect(effect);
    return { success: true, effectCount: this._effects.length };
  };

  ComboManager.prototype.playCard = function (card) {
    this._chain.addCard(card);
    var activated = this._detector.detectCombos(this._chain.getCards());
    var score = this._scoreCalc.calculateScore(activated, this._chain.getCards());
    if (activated.length > 0) {
      this._history.push({
        cards: this._chain.getCards().slice(),
        activatedCombos: activated.map(function (c) { return c.id; }),
        score: score.totalScore,
        timestamp: Date.now()
      });
    }
    return {
      success: true,
      chainLength: this._chain.getLength(),
      activatedCombos: activated,
      score: score
    };
  };

  ComboManager.prototype.getChain = function () {
    return this._chain.getCards();
  };

  ComboManager.prototype.getActiveCombos = function () {
    return this._detector.detectCombos(this._chain.getCards());
  };

  ComboManager.prototype.getComboHistory = function (limit) {
    var history = this._history.slice();
    history.reverse();
    if (limit) history = history.slice(0, limit);
    return history;
  };

  ComboManager.prototype.clearChain = function () {
    this._chain.clear();
    return { success: true };
  };

  ComboManager.prototype.setBaseMultiplier = function (m) {
    this._scoreCalc = new ComboScoreCalculator(m);
    this._save();
    return { success: true, baseMultiplier: m };
  };

  ComboManager.prototype.getAvailableEffects = function () {
    return this._effects.slice();
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.ComboEffect = ComboEffect;
  window.ComboChain = ComboChain;
  window.ComboDetector = ComboDetector;
  window.ComboScoreCalculator = ComboScoreCalculator;
  window.ComboManager = ComboManager;
})();