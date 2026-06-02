// ============================================================================
// Card AI Coach — V149 Direction A
// AI-powered deck advisor with real-time suggestions and matchup analysis
// nanobot tool registry + ruflo hooks + generic-agent L0-L4
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // CardDatabase: Card info lookup
  // -----------------------------------------------------------------------
  function CardDatabase() {
    this._cards = {};
    this._init();
  }

  CardDatabase.prototype._init = function () {
    var commons = [
      { id: 'c001', name: 'Soldier', power: 3, rarity: 'common', cost: 2, type: 'unit' },
      { id: 'c002', name: 'Archer', power: 4, rarity: 'common', cost: 3, type: 'unit' },
      { id: 'c003', name: 'Shield', power: 2, rarity: 'common', cost: 1, type: 'spell' }
    ];
    for (var i = 0; i < commons.length; i++) {
      this._cards[commons[i].id] = commons[i];
    }
  };

  CardDatabase.prototype.get = function (id) {
    return this._cards[id] || null;
  };

  CardDatabase.prototype.query = function (filters) {
    var result = [];
    for (var id in this._cards) {
      var c = this._cards[id];
      var match = true;
      if (filters.rarity && c.rarity !== filters.rarity) match = false;
      if (filters.type && c.type !== filters.type) match = false;
      if (filters.maxCost !== undefined && c.cost > filters.maxCost) match = false;
      if (filters.minPower !== undefined && c.power < filters.minPower) match = false;
      if (match) result.push(c);
    }
    return result;
  };

  // -----------------------------------------------------------------------
  // DeckAnalyzer: Analyzes deck strength and synergy
  // -----------------------------------------------------------------------
  function DeckAnalyzer(db) {
    this.db = db;
  }

  DeckAnalyzer.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[DeckAnalyzer] ' + msg);
  };

  DeckAnalyzer.prototype.analyzeDeck = function (cardIds) {
    var cards = cardIds.map(this.db.get.bind(this.db)).filter(function (c) { return c !== null; });
    if (cards.length === 0) return { error: 'no_cards' };

    var totalCost = cards.reduce(function (s, c) { return s + c.cost; }, 0);
    var avgCost = totalCost / cards.length;
    var costCurve = this._calcCostCurve(cards);
    var synergy = this._calcSynergy(cards);
    var strength = this._calcStrength(cards);

    return {
      cardCount: cards.length,
      avgCost: avgCost,
      costCurve: costCurve,
      synergy: synergy,
      strength: strength,
      curveScore: this._scoreCurve(costCurve)
    };
  };

  DeckAnalyzer.prototype._calcCostCurve = function (cards) {
    var curve = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, '5+': 0 };
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i].cost;
      if (c <= 4) curve[c]++;
      else curve['5+']++;
    }
    return curve;
  };

  DeckAnalyzer.prototype._calcSynergy = function (cards) {
    var synergy = 0;
    var typeCount = {};
    for (var i = 0; i < cards.length; i++) {
      var t = cards[i].type;
      typeCount[t] = (typeCount[t] || 0) + 1;
    }
    for (var t in typeCount) {
      if (typeCount[t] >= 3) synergy += typeCount[t] * 0.1;
    }
    return Math.min(synergy, 1.0);
  };

  DeckAnalyzer.prototype._calcStrength = function (cards) {
    var totalPower = cards.reduce(function (s, c) { return s + c.power; }, 0);
    return totalPower / cards.length;
  };

  DeckAnalyzer.prototype._scoreCurve = function (curve) {
    // Ideal: 1-2 @ 1cost, 2-3 @ 2cost, 2-3 @ 3cost, 1-2 @ 4cost, 0-1 @ 5+
    var score = 1.0;
    if (curve[1] < 1 || curve[1] > 3) score -= 0.2;
    if (curve[2] < 2 || curve[2] > 4) score -= 0.15;
    if (curve[3] < 2 || curve[3] > 4) score -= 0.15;
    return Math.max(score, 0.0);
  };

  DeckAnalyzer.prototype.suggestCards = function (currentDeck, role) {
    var roleSuggestions = {
      aggro: { maxCost: 2, type: 'unit', minPower: 3 },
      control: { maxCost: 4, type: 'spell', minPower: 2 },
      midrange: { maxCost: 3, type: 'unit', minPower: 3 }
    };
    var filter = roleSuggestions[role] || roleSuggestions.midrange;
    var suggestions = this.db.query(filter);
    return suggestions.slice(0, 5);
  };

  // -----------------------------------------------------------------------
  // MatchupAnalyzer: Analyzes win probability against opponent deck
  // -----------------------------------------------------------------------
  function MatchupAnalyzer(db) {
    this.db = db;
  }

  MatchupAnalyzer.prototype.analyze = function (myDeck, oppDeck) {
    var myAnalysis = new DeckAnalyzer(this.db).analyzeDeck(myDeck);
    var oppAnalysis = new DeckAnalyzer(this.db).analyzeDeck(oppDeck);

    var winProb = 0.5;
    if (myAnalysis.strength > oppAnalysis.strength) {
      winProb += (myAnalysis.strength - oppAnalysis.strength) * 0.05;
    }
    if (myAnalysis.curveScore > oppAnalysis.curveScore) {
      winProb += 0.1;
    }
    if (myAnalysis.synergy > oppAnalysis.synergy) {
      winProb += myAnalysis.synergy * 0.1;
    }

    return {
      winProbability: Math.min(Math.max(winProb, 0.1), 0.9),
      myStrength: myAnalysis.strength,
      oppStrength: oppAnalysis.strength,
      recommendation: winProb > 0.6 ? 'favorable' : winProb < 0.4 ? ' unfavorable' : 'even'
    };
  };

  // --------------------------------------------------------------------===
  // AICoach: Main coach interface with strategy engine
  // ========================================================================
  function AICoach(storageKey) {
    this.storageKey = storageKey || 'ai_coach';
    this.db = new CardDatabase();
    this.deckAnalyzer = new DeckAnalyzer(this.db);
    this.matchupAnalyzer = new MatchupAnalyzer(this.db);
    this._adviceHistory = [];
    this._init();
  }

  AICoach.prototype._init = function () {
    this._load();
  };

  AICoach.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._adviceHistory = data.history || [];
        }
      }
    } catch (e) {}
  };

  AICoach.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({ history: this._adviceHistory }));
      }
    } catch (e) {}
  };

  AICoach.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[AICoach] ' + msg);
  };

  AICoach.prototype.analyzeDeck = function (cardIds) {
    var result = this.deckAnalyzer.analyzeDeck(cardIds);
    var advice = this._generateAdvice(result);
    this._adviceHistory.push({ deck: cardIds.slice(), advice: advice, at: Date.now() });
    if (this._adviceHistory.length > 50) this._adviceHistory.shift();
    this._save();
    return { analysis: result, advice: advice };
  };

  AICoach.prototype._generateAdvice = function (analysis) {
    var advice = [];
    if (analysis.curveScore < 0.6) advice.push({ type: 'curve', message: 'Improve your mana curve' });
    if (analysis.synergy < 0.3) advice.push({ type: 'synergy', message: 'Add more synergy cards' });
    if (analysis.cardCount < 20) advice.push({ type: 'count', message: 'Deck needs at least 20 cards' });
    if (analysis.avgCost > 4) advice.push({ type: 'curve', message: 'Too expensive — add early game' });
    if (advice.length === 0) advice.push({ type: 'good', message: 'Deck looks solid' });
    return advice;
  };

  AICoach.prototype.getMatchupAdvice = function (myDeck, oppDeck) {
    return this.matchupAnalyzer.analyze(myDeck, oppDeck);
  };

  AICoach.prototype.getSuggestions = function (currentDeck, role) {
    return this.deckAnalyzer.suggestCards(currentDeck, role);
  };

  AICoach.prototype.getHistory = function () {
    return this._adviceHistory.slice();
  };

  AICoach.prototype.clearHistory = function () {
    this._adviceHistory = [];
    this._save();
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // Exports
  // -----------------------------------------------------------------------
  window.CardDatabase = CardDatabase;
  window.DeckAnalyzer = DeckAnalyzer;
  window.MatchupAnalyzer = MatchupAnalyzer;
  window.AICoach = AICoach;
})();