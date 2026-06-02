// ============================================================================
// Card Intelligence Network — V4: DeckCorrelationMatrix
// ruflo hierarchical decomposition + nanobot distributed mesh
// ============================================================================
'use strict';

var DeckCorrelationMatrix = function() {
  this.matrix = {};
  this.deckSignatures = {};
};

DeckCorrelationMatrix.prototype.buildSignature = function(deckCards) {
  var freq = {};
  for (var i = 0; i < deckCards.length; i++) {
    var c = deckCards[i];
    freq[c] = (freq[c] || 0) + 1;
  }
  var keys = Object.keys(freq).sort();
  return keys.map(function(k) { return k + ':' + freq[k]; }).join('|');
};

DeckCorrelationMatrix.prototype.recordDeckPerformance = function(deckCards, result, winRate) {
  var sig = this.buildSignature(deckCards);
  if (!this.matrix[sig]) {
    this.matrix[sig] = { deck: deckCards, wins: 0, losses: 0, games: 0 };
  }
  var entry = this.matrix[sig];
  entry.games++;
  if (result === 'win') entry.wins++;
  else if (result === 'loss') entry.losses++;
  if (winRate !== undefined) entry.winRate = winRate;
  return { success: true, entry: entry };
};

DeckCorrelationMatrix.prototype.getWinRate = function(deckCards) {
  var sig = this.buildSignature(deckCards);
  var entry = this.matrix[sig];
  if (!entry || entry.games === 0) return null;
  return entry.wins / entry.games;
};

DeckCorrelationMatrix.prototype.findSimilarDecks = function(deckCards, limit) {
  var sig = this.buildSignature(deckCards);
  var deckSet = new Set(deckCards);
  var results = [];
  var signatures = Object.keys(this.matrix);
  for (var i = 0; i < signatures.length; i++) {
    var otherSig = signatures[i];
    if (otherSig === sig) continue;
    var otherEntry = this.matrix[otherSig];
    var otherCards = new Set(otherEntry.deck);
    var intersection = 0;
    deckSet.forEach(function(c) { if (otherCards.has(c)) intersection++; });
    var union = new Set([...deckSet, ...otherCards]).size;
    var jaccard = union > 0 ? intersection / union : 0;
    if (jaccard > 0.3) {
      results.push({
        signature: otherSig,
        jaccard: jaccard,
        winRate: otherEntry.games > 0 ? otherEntry.wins / otherEntry.games : 0,
        games: otherEntry.games
      });
    }
  }
  results.sort(function(a, b) { return b.jaccard - a.jaccard; });
  return results.slice(0, limit || 5);
};

DeckCorrelationMatrix.prototype.getTopCards = function(deckCards, limit) {
  limit = limit || 5;
  var cardWins = {};
  var cardGames = {};
  var sig = this.buildSignature(deckCards);
  for (var i = 0; i < Object.keys(this.matrix).length; i++) {
    var entry = this.matrix[Object.keys(this.matrix)[i]];
    if (!entry.deck) continue;
    for (var j = 0; j < entry.deck.length; j++) {
      var c = entry.deck[j];
      if (deckCards.indexOf(c) !== -1) {
        cardGames[c] = (cardGames[c] || 0) + entry.games;
        cardWins[c] = (cardWins[c] || 0) + entry.wins;
      }
    }
  }
  var scored = [];
  for (var card in cardWins) {
    if (cardGames[card] > 0) {
      scored.push({ card: card, winRate: cardWins[card] / cardGames[card] });
    }
  }
  scored.sort(function(a, b) { return b.winRate - a.winRate; });
  return scored.slice(0, limit);
};

DeckCorrelationMatrix.prototype.getStats = function() {
  var totalGames = 0;
  var totalWins = 0;
  var entries = Object.keys(this.matrix).length;
  for (var i = 0; i < entries; i++) {
    var entry = this.matrix[Object.keys(this.matrix)[i]];
    totalGames += entry.games;
    totalWins += entry.wins;
  }
  return {
    deckCount: entries,
    totalGames: totalGames,
    overallWinRate: totalGames > 0 ? totalWins / totalGames : 0
  };
};

window.DeckCorrelationMatrix = DeckCorrelationMatrix;
