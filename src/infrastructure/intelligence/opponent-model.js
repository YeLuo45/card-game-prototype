// ============================================================================
// Card Intelligence Network — V2: OpponentModel + PlayHistoryTracker
// generic-agent L0-L4 five-layer memory + nanobot distributed mesh
// ============================================================================
'use strict';

var OpponentModel = function(opponentId) {
  this.opponentId = opponentId || 'unknown';
  this.profile = {
    aggression: 0.5,
    tempo: 0.5,
    comboAffinity: 0.5,
    responseTime: 0.5,
    predictability: 0.5
  };
  this.observedPlays = [];
  this.deckArchetype = null;
  this.strengthEstimate = 0.5;
  this.adaptiveHistory = [];
};

OpponentModel.prototype.recordPlay = function(cardId, turn, context) {
  this.observedPlays.push({
    cardId: cardId,
    turn: turn,
    context: context || {},
    timestamp: Date.now()
  });
  return { success: true, totalPlays: this.observedPlays.length };
};

OpponentModel.prototype.inferArchetype = function() {
  var playCounts = {};
  for (var i = 0; i < this.observedPlays.length; i++) {
    var cid = this.observedPlays[i].cardId;
    playCounts[cid] = (playCounts[cid] || 0) + 1;
  }
  var sorted = Object.keys(playCounts).sort(function(a, b) {
    return playCounts[b] - playCounts[a];
  });
  if (sorted.length === 0) return 'unknown';
  var topCard = sorted[0];
  if (topCard.indexOf('fire') !== -1 || topCard.indexOf('burn') !== -1) return 'aggro';
  if (topCard.indexOf('shield') !== -1 || topCard.indexOf('defend') !== -1) return 'control';
  if (topCard.indexOf('combo') !== -1 || topCard.indexOf('chain') !== -1) return 'combo';
  return 'midrange';
};

OpponentModel.prototype.updateProfile = function() {
  if (this.observedPlays.length < 3) return this.profile;
  var earlyPlays = this.observedPlays.filter(function(p) { return p.turn <= 3; });
  var latePlays = this.observedPlays.filter(function(p) { return p.turn > 5; });
  this.profile.aggression = earlyPlays.length / Math.max(this.observedPlays.length, 1);
  this.profile.tempo = latePlays.length > earlyPlays.length ? 0.7 : 0.3;
  this.profile.comboAffinity = this.observedPlays.filter(function(p) {
    return p.context && p.context.isCombo;
  }).length / this.observedPlays.length;
  this.adaptiveHistory.push({
    profile: JSON.parse(JSON.stringify(this.profile)),
    timestamp: Date.now()
  });
  return this.profile;
};

OpponentModel.prototype.predictPlay = function(currentTurn, hand) {
  var likelyCards = [];
  var cardFreq = {};
  for (var i = 0; i < this.observedPlays.length; i++) {
    var p = this.observedPlays[i];
    if (Math.abs(p.turn - currentTurn) <= 2) {
      cardFreq[p.cardId] = (cardFreq[p.cardId] || 0) + 1;
    }
  }
  var sorted = Object.keys(cardFreq).sort(function(a, b) {
    return cardFreq[b] - cardFreq[a];
  });
  for (var j = 0; j < Math.min(3, sorted.length); j++) {
    likelyCards.push({ cardId: sorted[j], probability: (cardFreq[sorted[j]] / this.observedPlays.length) });
  }
  return likelyCards;
};

OpponentModel.prototype.getStrengthEstimate = function() {
  return this.strengthEstimate;
};

OpponentModel.prototype.setStrengthEstimate = function(estimate) {
  this.strengthEstimate = Math.max(0, Math.min(1, estimate));
  return this.strengthEstimate;
};

var PlayHistoryTracker = function() {
  this.histories = {};
  this.matchRecords = [];
};

PlayHistoryTracker.prototype.getOrCreateModel = function(opponentId) {
  if (!this.histories[opponentId]) {
    this.histories[opponentId] = new OpponentModel(opponentId);
  }
  return this.histories[opponentId];
};

PlayHistoryTracker.prototype.recordMatch = function(opponentId, myDeck, opponentDeck, result, turns) {
  var model = this.getOrCreateModel(opponentId);
  model.deckArchetype = opponentDeck;
  this.matchRecords.push({
    opponentId: opponentId,
    myDeck: myDeck,
    opponentDeck: opponentDeck,
    result: result,
    turns: turns,
    timestamp: Date.now()
  });
  if (result === 'win') {
    model.setStrengthEstimate(model.getStrengthEstimate() - 0.05);
  } else if (result === 'loss') {
    model.setStrengthEstimate(model.getStrengthEstimate() + 0.05);
  }
  return { success: true, totalMatches: this.matchRecords.length };
};

PlayHistoryTracker.prototype.getOpponentSummary = function(opponentId) {
  var model = this.histories[opponentId];
  if (!model) return null;
  return {
    opponentId: opponentId,
    archetype: model.inferArchetype(),
    profile: model.updateProfile(),
    totalPlays: model.observedPlays.length,
    totalMatches: this.matchRecords.filter(function(m) { return m.opponentId === opponentId; }).length,
    strengthEstimate: model.getStrengthEstimate()
  };
};

PlayHistoryTracker.prototype.getRecentMatches = function(opponentId, limit) {
  limit = limit || 10;
  return this.matchRecords
    .filter(function(m) { return !opponentId || m.opponentId === opponentId; })
    .slice(-limit)
    .reverse();
};

PlayHistoryTracker.prototype.getAllOpponents = function() {
  return Object.keys(this.histories);
};

window.OpponentModel = OpponentModel;
window.PlayHistoryTracker = PlayHistoryTracker;