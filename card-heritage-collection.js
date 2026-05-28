// ============================================================================
// Card Heritage Collection — V143 Direction E
// Collectible card heritage system with family trees and legacy bonuses
// thunderbolt offline-first + ruflo state hooks + generic-agent L0-L4
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // HeritageCard: Card with heritage data
  // -----------------------------------------------------------------------
  function HeritageCard(card, heritage) {
    this.id = card.id || ('hc_' + Date.now());
    this.name = card.name || 'Unknown Card';
    this.power = card.power || 0;
    this.toughness = card.toughness || 0;
    this.cost = card.cost || 0;
    this.rarity = card.rarity || 'common';
    this.tags = card.tags || [];
    this.heritage = heritage || null; // { familyId, generation, lineage: [], bonuses: {} }
  }

  // -----------------------------------------------------------------------
  // HeritageFamily: Card family tree
  // -----------------------------------------------------------------------
  function HeritageFamily(id, name, founderId) {
    this.id = id;
    this.name = name;
    this.founderId = founderId;
    this.generations = 1;
    this.members = {}; // cardId -> generation
    this.legacyBonuses = {}; // bonusType -> value
  }

  HeritageFamily.prototype.addMember = function (cardId, generation) {
    this.members[cardId] = generation;
    if (generation > this.generations) this.generations = generation;
  };

  HeritageFamily.prototype.getLegacyBonus = function (bonusType) {
    return this.legacyBonuses[bonusType] || 0;
  };

  HeritageFamily.prototype.addLegacyBonus = function (type, value) {
    this.legacyBonuses[type] = (this.legacyBonuses[type] || 0) + value;
  };

  HeritageFamily.prototype.getDescendants = function (cardId) {
    var result = [];
    for (var id in this.members) {
      if (id !== cardId) result.push(id);
    }
    return result;
  };

  HeritageFamily.prototype.getGeneration = function (cardId) {
    return this.members[cardId] || 0;
  };

  // -----------------------------------------------------------------------
  // HeritageCollection: Player's card heritage system
  // -----------------------------------------------------------------------
  function HeritageCollection(storageKey) {
    this.storageKey = storageKey || 'heritage_collection';
    this._families = {};
    this._cards = {};
    this._lineageCache = {};
    this._init();
  }

  HeritageCollection.prototype._init = function () {
    this._load();
    // Initialize with empty state if not loaded
    if (typeof this._families === 'undefined') this._families = {};
    if (typeof this._cards === 'undefined') this._cards = {};
  };

  HeritageCollection.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._families = data.families || {};
          this._cards = data.cards || {};
        }
      }
    } catch (e) {}
  };

  HeritageCollection.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          families: this._families,
          cards: this._cards
        }));
      }
    } catch (e) {}
  };

  HeritageCollection.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[HeritageCollection] ' + msg);
    }
  };

  // Create a new heritage family (founder card)
  HeritageCollection.prototype.createFamily = function (playerId, card, familyName) {
    if (!card || !card.id) return { error: 'invalid_card' };
    if (!familyName) return { error: 'family_name_required' };

    var familyId = 'family_' + (Object.keys(this._families).length + 1);
    var founderGen = 1;

    var family = new HeritageFamily(familyId, familyName, card.id);
    family.addMember(card.id, founderGen);

    // Create heritage card
    var hc = new HeritageCard(card, {
      familyId: familyId,
      generation: founderGen,
      lineage: [],
      bonuses: {}
    });

    this._families[familyId] = family;
    this._cards[card.id] = hc;
    this._save();

    this._log('Family ' + familyName + ' created by ' + playerId);
    return { success: true, familyId: familyId, generation: founderGen };
  };

  // Add descendant card to family (evolve/breed from parent)
  HeritageCollection.prototype.addDescendant = function (playerId, parentCardId, childCard, generation) {
    var parent = this._cards[parentCardId];
    if (!parent) return { error: 'parent_not_found' };
    if (!parent.heritage) return { error: 'parent_not_in_family' };

    if (!childCard || !childCard.id) return { error: 'invalid_child_card' };
    var gen = generation || (parent.heritage.generation + 1);

    var familyId = parent.heritage.familyId;
    var family = this._families[familyId];
    if (!family) return { error: 'family_not_found' };

    // Add child to family
    family.addMember(childCard.id, gen);

    // Create heritage card with lineage
    var lineage = parent.heritage.lineage.slice();
    lineage.push(parentCardId);

    var hc = new HeritageCard(childCard, {
      familyId: familyId,
      generation: gen,
      lineage: lineage,
      bonuses: {}
    });

    this._cards[childCard.id] = hc;
    this._save();

    this._log('Descendant ' + childCard.id + ' added to family ' + familyId + ' (gen ' + gen + ')');
    return { success: true, familyId: familyId, generation: gen };
  };

  // Get heritage info for a card
  HeritageCollection.prototype.getHeritage = function (cardId) {
    var card = this._cards[cardId];
    if (!card) return null;
    return {
      familyId: card.heritage ? card.heritage.familyId : null,
      generation: card.heritage ? card.heritage.generation : 0,
      lineage: card.heritage ? card.heritage.lineage : [],
      bonuses: card.heritage ? card.heritage.bonuses : {}
    };
  };

  // Get all cards in a family
  HeritageCollection.prototype.getFamilyCards = function (familyId) {
    var family = this._families[familyId];
    if (!family) return [];
    var result = [];
    for (var cardId in family.members) {
      var card = this._cards[cardId];
      if (card) result.push(card);
    }
    return result;
  };

  // Get family info
  HeritageCollection.prototype.getFamily = function (familyId) {
    return this._families[familyId] || null;
  };

  // Calculate legacy bonus for a card
  HeritageCollection.prototype.calculateLegacyBonus = function (cardId) {
    var card = this._cards[cardId];
    if (!card || !card.heritage) return 0;

    var family = this._families[card.heritage.familyId];
    if (!family) return 0;

    var gen = card.heritage.generation;
    var memberCount = Object.keys(family.members).length;

    // Bonus increases with generation and family size
    var genBonus = gen * 0.05;
    var familyBonus = Math.min(memberCount * 0.02, 0.2);

    return Math.min(genBonus + familyBonus, 0.5); // Cap at 50%
  };

  // Get lineage (ancestors) for a card
  HeritageCollection.prototype.getLineage = function (cardId) {
    var card = this._cards[cardId];
    if (!card || !card.heritage) return [];

    var lineage = [];
    var current = card;

    while (current && current.heritage && current.heritage.lineage.length > 0) {
      var parentId = current.heritage.lineage[current.heritage.lineage.length - 1];
      var parent = this._cards[parentId];
      if (parent) {
        lineage.unshift(parentId);
        current = parent;
      } else {
        break;
      }
    }

    return lineage;
  };

  // Get descendants of a card
  HeritageCollection.prototype.getDescendants = function (cardId) {
    var card = this._cards[cardId];
    if (!card || !card.heritage) return [];

    var familyId = card.heritage.familyId;
    var family = this._families[familyId];
    if (!family) return [];

    return family.getDescendants(cardId);
  };

  // Apply legacy bonus to card stats
  HeritageCollection.prototype.applyLegacyBonus = function (cardId) {
    var card = this._cards[cardId];
    if (!card) return null;

    var bonus = this.calculateLegacyBonus(cardId);
    var powerBoost = Math.floor(card.power * bonus);
    var toughnessBoost = Math.floor(card.toughness * bonus);

    var enhanced = {
      id: card.id,
      name: card.name,
      power: card.power + powerBoost,
      toughness: card.toughness + toughnessBoost,
      cost: card.cost,
      rarity: card.rarity,
      tags: card.tags.slice(),
      heritage: card.heritage,
      legacyBonus: bonus,
      powerBoost: powerBoost,
      toughnessBoost: toughnessBoost
    };

    return enhanced;
  };

  // List all families
  HeritageCollection.prototype.listFamilies = function () {
    var result = [];
    for (var id in this._families) {
      var f = this._families[id];
      result.push({
        id: f.id,
        name: f.name,
        generations: f.generations,
        memberCount: Object.keys(f.members).length,
        founderId: f.founderId
      });
    }
    return result;
  };

  // Merge families (when two heritage cards combine)
  HeritageCollection.prototype.mergeFamilies = function (playerId, cardId1, cardId2) {
    var c1 = this._cards[cardId1];
    var c2 = this._cards[cardId2];
    if (!c1 || !c2) return { error: 'card_not_found' };
    if (!c1.heritage || !c2.heritage) return { error: 'cards_not_in_family' };
    if (c1.heritage.familyId === c2.heritage.familyId) return { error: 'same_family' };

    var f1 = this._families[c1.heritage.familyId];
    var f2 = this._families[c2.heritage.familyId];
    if (!f1 || !f2) return { error: 'family_not_found' };

    // Merge f2 into f1
    for (var cardId in f2.members) {
      var gen = f2.members[cardId];
      f1.addMember(cardId, gen + 10); // Offset generation
      // Update card's family reference
      if (this._cards[cardId] && this._cards[cardId].heritage) {
        this._cards[cardId].heritage.familyId = f1.id;
      }
    }

    // Copy legacy bonuses
    for (var bonusType in f2.legacyBonuses) {
      f1.addLegacyBonus(bonusType, f2.legacyBonuses[bonusType]);
    }

    delete this._families[f2.id];
    this._save();

    this._log('Families merged into ' + f1.id);
    return { success: true, newFamilyId: f1.id };
  };

  // Get collection stats
  HeritageCollection.prototype.getStats = function (playerId) {
    var familyCount = Object.keys(this._families).length;
    var cardCount = Object.keys(this._cards).length;
    var totalGenerations = 0;

    for (var fid in this._families) {
      totalGenerations += this._families[fid].generations;
    }

    return {
      families: familyCount,
      cards: cardCount,
      avgGenerations: familyCount > 0 ? (totalGenerations / familyCount).toFixed(1) : 0
    };
  };

  // -----------------------------------------------------------------------
  // HeritageDisplay: UI rendering helper
  // -----------------------------------------------------------------------
  function HeritageDisplay() {}

  HeritageDisplay.prototype.renderHeritageBadge = function (card) {
    if (!card.heritage) return '';
    return '⚜️ Gen ' + card.heritage.generation;
  };

  HeritageDisplay.prototype.renderLineageTree = function (card, collection) {
    var lineage = collection.getLineage(card.id);
    if (lineage.length === 0) return card.name + ' (Founder)';
    var names = [];
    for (var i = 0; i < lineage.length; i++) {
      var anc = collection._cards[lineage[i]];
      if (anc) names.push(anc.name);
    }
    names.push(card.name + ' ⚜️');
    return names.join(' → ');
  };

  HeritageDisplay.prototype.renderFamilyTree = function (familyId, collection) {
    var cards = collection.getFamilyCards(familyId);
    var byGen = {};
    for (var i = 0; i < cards.length; i++) {
      var gen = cards[i].heritage ? cards[i].heritage.generation : 1;
      if (!byGen[gen]) byGen[gen] = [];
      byGen[gen].push(cards[i].name);
    }
    var lines = [];
    var gens = Object.keys(byGen).sort(function (a, b) { return parseInt(a) - parseInt(b); });
    for (var j = 0; j < gens.length; j++) {
      lines.push('Gen ' + gens[j] + ': ' + byGen[gens[j]].join(', '));
    }
    return lines.join('\n');
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.HeritageCard = HeritageCard;
  window.HeritageFamily = HeritageFamily;
  window.HeritageCollection = HeritageCollection;
  window.HeritageDisplay = HeritageDisplay;
})();