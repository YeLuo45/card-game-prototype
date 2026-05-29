// ============================================================================
// Card Evolution — V159 Direction U
// Auto-evolving cards that gain strength through battle experience
// nanobot self-improving agent + generic-agent autonomous growth
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // EvolutionPath: Defines how a card can evolve
  // ========================================================================
  function EvolutionPath(id, fromCardId, toCardId, experienceRequired, statBoosts, newAbilities) {
    this.id = id || '';
    this.fromCardId = fromCardId || '';
    this.toCardId = toCardId || '';
    this.experienceRequired = experienceRequired || 0;
    this.statBoosts = statBoosts || {}; // e.g. { attack: 5, health: 10 }
    this.newAbilities = newAbilities || [];
  }

  EvolutionPath.prototype.canEvolve = function (card) {
    return card.experience >= this.experienceRequired;
  };

  // --------------------------------------------------------------------===
  // EvolvableCard: A card that can gain experience and evolve
  // ========================================================================
  function EvolvableCard(id, name, type, baseAttack, baseHealth, abilities, rarity) {
    this.id = id || '';
    this.name = name || '';
    this.type = type || 'creature';
    this.baseAttack = baseAttack || 0;
    this.baseHealth = baseHealth || 0;
    this.currentAttack = baseAttack || 0;
    this.currentHealth = baseHealth || 0;
    this.maxHealth = baseHealth || 0;
    this.abilities = abilities || [];
    this.rarity = rarity || 'common'; // common | uncommon | rare | epic | legendary
    this.experience = 0;
    this.level = 1;
    this.evolutionStage = 0; // 0 = base, 1 = stage 1, etc.
    this.evolvedFrom = null;
    this.isEvolved = false;
  }

  EvolvableCard.prototype.addExperience = function (amount) {
    this.experience += amount || 10;
    return this.experience;
  };

  EvolvableCard.prototype.resetToBase = function () {
    this.currentAttack = this.baseAttack;
    this.currentHealth = this.baseHealth;
    this.maxHealth = this.baseHealth;
  };

  EvolvableCard.prototype.getStats = function () {
    return {
      attack: this.currentAttack,
      health: this.currentHealth,
      maxHealth: this.maxHealth,
      level: this.level,
      experience: this.experience
    };
  };

  // --------------------------------------------------------------------===
  // CardEvolution: Main evolution system manager
  // ========================================================================
  function CardEvolution(storageKey) {
    this.storageKey = storageKey || 'card_evolution';
    this._cards = {}; // cardId -> EvolvableCard
    this._evolutionPaths = {}; // pathId -> EvolutionPath
    this._evolvedCards = []; // history of evolutions
    this._stats = { totalEvolutions: 0, totalExperienceGained: 0 };
    this._init();
  }

  CardEvolution.prototype._init = function () {
    this._load();
    if (Object.keys(this._cards).length === 0) this._generateDefaultEvolution();
  };

  CardEvolution.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._cards = data.cards || {};
          this._evolutionPaths = data.evolutionPaths || {};
          this._evolvedCards = data.evolvedCards || [];
          this._stats = data.stats || this._stats;
          // Reconstruct EvolvableCard instances
          for (var cid in this._cards) {
            var cardData = this._cards[cid];
            var card = new EvolvableCard(cardData.id, cardData.name, cardData.type,
              cardData.baseAttack, cardData.baseHealth, cardData.abilities, cardData.rarity);
            card.experience = cardData.experience || 0;
            card.level = cardData.level || 1;
            card.evolutionStage = cardData.evolutionStage || 0;
            card.currentAttack = cardData.currentAttack || cardData.baseAttack;
            card.currentHealth = cardData.currentHealth || cardData.baseHealth;
            card.maxHealth = cardData.maxHealth || cardData.baseHealth;
            card.evolvedFrom = cardData.evolvedFrom || null;
            card.isEvolved = cardData.isEvolved || false;
            this._cards[cid] = card;
          }
        }
      }
    } catch (e) {}
  };

  CardEvolution.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          cards: this._cards,
          evolutionPaths: this._evolutionPaths,
          evolvedCards: this._evolvedCards,
          stats: this._stats
        }));
      }
    } catch (e) {}
  };

  CardEvolution.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[CardEvolution] ' + msg);
  };

  CardEvolution.prototype._generateDefaultEvolution = function () {
    // Create base cards
    var sparky = new EvolvableCard('sparky', 'Sparky', 'creature', 3, 4, ['lightning'], 'common');
    sparky.experience = 0;
    this._cards['sparky'] = sparky;

    var flamey = new EvolvableCard('flamey', 'Flamey', 'creature', 4, 3, ['fire'], 'uncommon');
    this._cards['flamey'] = flamey;

    var icefy = new EvolvableCard('icefy', 'Icefy', 'creature', 2, 5, ['ice'], 'uncommon');
    this._cards['icefy'] = icefy;

    // Create evolution paths
    // Sparky -> Sparky+ (100 xp, +2 attack)
    this._evolutionPaths['sparky_evo'] = new EvolutionPath('sparky_evo', 'sparky', 'sparky_plus', 100, { attack: 2, health: 1 }, []);

    // Flamey -> Inferno (150 xp, +3 attack, +1 ability)
    this._evolutionPaths['flamey_evo'] = new EvolutionPath('flamey_evo', 'flamey', 'flamey_plus', 150, { attack: 3, health: 0 }, ['inferno']);

    // Icefy -> Glacier (120 xp, +0 attack, +3 health, new ability)
    this._evolutionPaths['icefy_evo'] = new EvolutionPath('icefy_evo', 'icefy', 'icefy_plus', 120, { attack: 0, health: 3 }, ['frost_armor']);

    // Store evolved forms (target cards)
    var sparkyPlus = new EvolvableCard('sparky_plus', 'Sparky+', 'creature', 5, 5, ['lightning', 'charge'], 'rare');
    sparkyPlus.evolutionStage = 1;
    sparkyPlus.evolvedFrom = 'sparky';
    sparkyPlus.isEvolved = true;
    this._cards['sparky_plus'] = sparkyPlus;

    var flameyPlus = new EvolvableCard('flamey_plus', 'Flamey+', 'creature', 7, 3, ['fire', 'inferno'], 'rare');
    flameyPlus.evolutionStage = 1;
    flameyPlus.evolvedFrom = 'flamey';
    flameyPlus.isEvolved = true;
    this._cards['flamey_plus'] = flameyPlus;

    var icefyPlus = new EvolvableCard('icefy_plus', 'Icefy+', 'creature', 2, 8, ['ice', 'frost_armor'], 'rare');
    icefyPlus.evolutionStage = 1;
    icefyPlus.evolvedFrom = 'icefy';
    icefyPlus.isEvolved = true;
    this._cards['icefy_plus'] = icefyPlus;

    this._log('Generated default evolution system');
  };

  // Register a card
  CardEvolution.prototype.registerCard = function (card) {
    this._cards[card.id] = card;
    this._save();
    return { success: true };
  };

  // Add evolution path
  CardEvolution.prototype.addEvolutionPath = function (id, fromCardId, toCardId, experienceRequired, statBoosts, newAbilities) {
    if (this._evolutionPaths[id]) return { error: 'path_exists' };
    this._evolutionPaths[id] = new EvolutionPath(id, fromCardId, toCardId, experienceRequired, statBoosts, newAbilities);
    this._save();
    return { success: true };
  };

  // Get card
  CardEvolution.prototype.getCard = function (cardId) {
    return this._cards[cardId] || null;
  };

  // Add experience to card
  CardEvolution.prototype.addExperience = function (cardId, amount) {
    var card = this._cards[cardId];
    if (!card) return { error: 'card_not_found' };
    card.addExperience(amount || 10);
    this._stats.totalExperienceGained += amount || 10;
    this._save();
    return { success: true, experience: card.experience, level: card.level };
  };

  // Check if card can evolve
  CardEvolution.prototype.canEvolve = function (cardId) {
    var card = this._cards[cardId];
    if (!card) return { error: 'card_not_found' };
    for (var pid in this._evolutionPaths) {
      var path = this._evolutionPaths[pid];
      if (path.fromCardId === cardId && path.canEvolve(card)) return { canEvolve: true, pathId: pid };
    }
    return { canEvolve: false };
  };

  // Evolve a card
  CardEvolution.prototype.evolve = function (cardId, pathId) {
    var card = this._cards[cardId];
    if (!card) return { error: 'card_not_found' };
    var path = this._evolutionPaths[pathId];
    if (!path) return { error: 'path_not_found' };
    if (path.fromCardId !== cardId) return { error: 'wrong_source_card' };
    if (!path.canEvolve(card)) return { error: 'insufficient_experience' };

    var targetCard = this._cards[path.toCardId];
    if (!targetCard) return { error: 'target_card_not_found' };

    // Perform evolution: apply stat boosts to target card
    for (var stat in path.statBoosts) {
      targetCard.currentAttack += path.statBoosts.attack || 0;
      targetCard.currentHealth += path.statBoosts.health || 0;
      targetCard.maxHealth += path.statBoosts.health || 0;
    }
    for (var j = 0; j < path.newAbilities.length; j++) {
      if (targetCard.abilities.indexOf(path.newAbilities[j]) < 0) {
        targetCard.abilities.push(path.newAbilities[j]);
      }
    }

    this._evolvedCards.push({ from: cardId, to: path.toCardId, at: Date.now() });
    this._stats.totalEvolutions++;
    this._save();
    return { success: true, evolvedCard: targetCard };
  };

  // Get evolution paths for a card
  CardEvolution.prototype.getEvolutionPaths = function (cardId) {
    var result = [];
    for (var pid in this._evolutionPaths) {
      if (this._evolutionPaths[pid].fromCardId === cardId) result.push(this._evolutionPaths[pid]);
    }
    return result;
  };

  // List all cards
  CardEvolution.prototype.listCards = function () {
    var result = [];
    for (var id in this._cards) result.push(this._cards[id]);
    return result;
  };

  // Get evolvable cards (those that have evolution paths)
  CardEvolution.prototype.getEvolvableCards = function () {
    var result = [];
    for (var pid in this._evolutionPaths) {
      var fromId = this._evolutionPaths[pid].fromCardId;
      if (this._cards[fromId]) result.push(this._cards[fromId]);
    }
    return result;
  };

  // Get stats
  CardEvolution.prototype.getStats = function () {
    return {
      totalEvolutions: this._stats.totalEvolutions,
      totalExperienceGained: this._stats.totalExperienceGained,
      totalCards: Object.keys(this._cards).length,
      totalPaths: Object.keys(this._evolutionPaths).length
    };
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.EvolutionPath = EvolutionPath;
  window.EvolvableCard = EvolvableCard;
  window.CardEvolution = CardEvolution;
})();