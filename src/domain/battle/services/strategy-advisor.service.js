// ============================================================================
// Card Game Strategy Advisor Agent — V253
// Strategy Advisor Agent: chatdev multi-agent + claude-code tool use + generic-agent reasoning
// AI battle advisor, play recommendations, opponent modeling
// ============================================================================
'use strict';

(function () {
  // ------ Models ------
  var AdvisorOpinion = function(agentId, recommendation, confidence, reasoning) {
    this.agentId = agentId;
    this.recommendation = recommendation || null; // cardId or action
    this.confidence = confidence || 0.5;         // 0-1
    this.reasoning = reasoning || '';
    this.toolsUsed = [];
    this.timestamp = Date.now();
  };

  var OpponentProfile = function(playerId) {
    this.playerId = playerId;
    this.playStyle = null;    // aggressive, defensive, balanced, unpredictable
    this.avgTurnTime = 0;
    this.preferredCardTypes = [];
    this.bluffFrequency = 0;
    this.predictability = 0;  // 0-1, higher = more predictable
    this.weaknesses = [];     // identified weaknesses
    this.strengths = [];      // identified strengths
    this.observationCount = 0;
  };

  var BattleContext = function(contextId) {
    this.contextId = contextId;
    this.playerHand = [];
    this.opponentKnownCards = [];
    this.boardState = {};
    this.turnNumber = 0;
    this.playerHealth = 100;
    this.opponentHealth = 100;
    this.resources = {};
    this.recentActions = [];
    this.timestamp = Date.now();
  };

  // ------ Advisor Agents (chatdev multi-agent pattern) ------
  var BaseAgent = function(agentId, role) {
    this.agentId = agentId;
    this.role = role || 'advisor';
    this.opinions = [];
  };

  BaseAgent.prototype.analyze = function(context) {
    return new AdvisorOpinion(this.agentId, null, 0, 'base agent');
  };

  var AggressiveAdvisor = function() {
    BaseAgent.call(this, 'aggressive_advisor', 'aggressive');
  };
  AggressiveAdvisor.prototype = Object.create(BaseAgent.prototype);

  AggressiveAdvisor.prototype.analyze = function(context) {
    var rec = null;
    var confidence = 0.5;
    var reasoning = 'Aggressive style: prioritize damage';

    var highDamageCards = context.playerHand.filter(function(c) { return c.attack && c.attack >= 8; });
    if (highDamageCards.length > 0) {
      rec = highDamageCards[0].cardId;
      confidence = 0.75;
      reasoning += '. Found ' + highDamageCards.length + ' high-damage cards.';
    }

    if (context.opponentHealth <= 20) {
      rec = context.playerHand.reduce(function(best, c) { return (c.attack > best.attack) ? c : best; }, { attack: 0 }).cardId;
      confidence = 0.9;
      reasoning += '. Finisher detected.';
    }

    return new AdvisorOpinion(this.agentId, rec, confidence, reasoning);
  };

  var DefensiveAdvisor = function() {
    BaseAgent.call(this, 'defensive_advisor', 'defensive');
  };
  DefensiveAdvisor.prototype = Object.create(BaseAgent.prototype);

  DefensiveAdvisor.prototype.analyze = function(context) {
    var rec = null;
    var confidence = 0.5;
    var reasoning = 'Defensive style: prioritize survival';

    if (context.playerHealth < 30) {
      var healCards = context.playerHand.filter(function(c) { return c.heal && c.heal >= 10; });
      if (healCards.length > 0) {
        rec = healCards[0].cardId;
        confidence = 0.85;
        reasoning += '. Health critical, recommending heal.';
      }
    }

    var defenseCards = context.playerHand.filter(function(c) { return c.defense && c.defense >= 5; });
    if (!rec && defenseCards.length > 0) {
      rec = defenseCards[0].cardId;
      confidence = 0.7;
      reasoning += '. Recommending defense.';
    }

    return new AdvisorOpinion(this.agentId, rec, confidence, reasoning);
  };

  var OpponentModeler = function() {
    BaseAgent.call(this, 'opponent_modeler', 'modeler');
  };
  OpponentModeler.prototype = Object.create(BaseAgent.prototype);

  OpponentModeler.prototype.analyze = function(context, profile) {
    var rec = null;
    var confidence = 0.5;
    var reasoning = 'Opponent modeling: ';

    if (!profile || profile.observationCount < 3) {
      reasoning += 'insufficient data';
      return new AdvisorOpinion(this.agentId, rec, confidence, reasoning);
    }

    reasoning += 'style=' + (profile.playStyle || 'unknown');

    if (profile.playStyle === 'aggressive') {
      var counterCards = context.playerHand.filter(function(c) { return c.defense && c.defense >= 6; });
      if (counterCards.length > 0) {
        rec = counterCards[0].cardId;
        confidence = 0.7;
        reasoning += ', counter-aggressive detected';
      }
    } else if (profile.playStyle === 'defensive') {
      var pierceCards = context.playerHand.filter(function(c) { return c.pierce && c.pierce >= 5; });
      if (pierceCards.length > 0) {
        rec = pierceCards[0].cardId;
        confidence = 0.7;
        reasoning += ', anti-defense detected';
      }
    } else if (profile.predictability > 0.7) {
      var predicted = this._predictOpponentAction(context, profile);
      if (predicted) {
        rec = predicted;
        confidence = 0.8;
        reasoning += ', exploiting predictability';
      }
    }

    return new AdvisorOpinion(this.agentId, rec, confidence, reasoning);
  };

  OpponentModeler.prototype._predictOpponentAction = function(context, profile) {
    // Simple prediction: if opponent always plays high-attack on turn 1, predict and counter
    if (context.turnNumber === 1 && profile.preferredCardTypes.indexOf('high_attack') >= 0) {
      var defenseCards = context.playerHand.filter(function(c) { return c.defense; });
      return defenseCards.length > 0 ? defenseCards[0].cardId : null;
    }
    return null;
  };

  // ------ Main Strategy Advisor Manager ------
  var StrategyAdvisorManager = function() {
    this.agents = {
      aggressive: new AggressiveAdvisor(),
      defensive: new DefensiveAdvisor(),
      modeler: new OpponentModeler()
    };
    this.profiles = {};  // playerId -> OpponentProfile
    this.hooks = {};
  };

  StrategyAdvisorManager.prototype.getRecommendation = function(context, targetPlayerId) {
    var opinions = [];
    var self = this;

    Object.keys(this.agents).forEach(function(key) {
      var agent = self.agents[key];
      var opinion = agent.analyze(context, targetPlayerId ? self.profiles[targetPlayerId] : null);
      opinions.push(opinion);
      agent.opinions.push(opinion);
    });

    // Aggregate: pick highest confidence
    opinions.sort(function(a, b) { return b.confidence - a.confidence; });
    var best = opinions[0];

    this._triggerHook('onRecommendation', best, opinions);
    return { recommendation: best.recommendation, confidence: best.confidence, reasoning: best.reasoning, allOpinions: opinions };
  };

  // Opponent Profile Management
  StrategyAdvisorManager.prototype.createProfile = function(playerId) {
    if (this.profiles[playerId]) return { error: 'profile_exists' };
    this.profiles[playerId] = new OpponentProfile(playerId);
    return { success: true, profile: this.profiles[playerId] };
  };

  StrategyAdvisorManager.prototype.getProfile = function(playerId) {
    return this.profiles[playerId] || null;
  };

  StrategyAdvisorManager.prototype.recordAction = function(playerId, action, cardType, turnNumber) {
    var profile = this.profiles[playerId];
    if (!profile) {
      profile = new OpponentProfile(playerId);
      this.profiles[playerId] = profile;
    }
    profile.observationCount++;

    if (cardType) profile.preferredCardTypes.push(cardType);

    if (action === 'attack' && turnNumber <= 3) {
      profile.playStyle = 'aggressive';
    } else if (action === 'defend' || action === 'heal') {
      profile.playStyle = profile.playStyle === 'aggressive' ? 'balanced' : 'defensive';
    }

    // Update predictability
    var typeCounts = {};
    profile.preferredCardTypes.forEach(function(t) { typeCounts[t] = (typeCounts[t] || 0) + 1; });
    var maxCount = Math.max.apply(null, Object.values(typeCounts));
    profile.predictability = maxCount / Math.max(1, profile.preferredCardTypes.length);

    return { success: true, profile: profile };
  };

  StrategyAdvisorManager.prototype.identifyWeakness = function(playerId, weakness) {
    var profile = this.profiles[playerId];
    if (!profile) return { error: 'profile_not_found' };
    if (profile.weaknesses.indexOf(weakness) < 0) profile.weaknesses.push(weakness);
    return { success: true };
  };

  StrategyAdvisorManager.prototype.identifyStrength = function(playerId, strength) {
    var profile = this.profiles[playerId];
    if (!profile) return { error: 'profile_not_found' };
    if (profile.strengths.indexOf(strength) < 0) profile.strengths.push(strength);
    return { success: true };
  };

  // Battle Context Factory
  StrategyAdvisorManager.prototype.createContext = function(contextId, playerHand, opponentKnownCards, boardState, turnNumber, playerHealth, opponentHealth) {
    var ctx = new BattleContext(contextId);
    ctx.playerHand = playerHand || [];
    ctx.opponentKnownCards = opponentKnownCards || [];
    ctx.boardState = boardState || {};
    ctx.turnNumber = turnNumber || 1;
    ctx.playerHealth = playerHealth || 100;
    ctx.opponentHealth = opponentHealth || 100;
    return ctx;
  };

  // Hook System
  StrategyAdvisorManager.prototype.registerHook = function(eventName, callback) {
    if (!this.hooks[eventName]) this.hooks[eventName] = [];
    this.hooks[eventName].push(callback);
    return { success: true };
  };

  StrategyAdvisorManager.prototype._triggerHook = function(eventName) {
    var hooks = this.hooks[eventName] || [];
    var args = Array.prototype.slice.call(arguments, 1);
    hooks.forEach(function(h) { h.apply(null, args); });
  };

  // Stats
  StrategyAdvisorManager.prototype.getAdvisorStats = function() {
    var agentStats = {};
    for (var key in this.agents) {
      agentStats[key] = this.agents[key].opinions.length;
    }
    return {
      agentCount: Object.keys(this.agents).length,
      opinionCounts: agentStats,
      profileCount: Object.keys(this.profiles).length
    };
  };

  // ------ Expose globally ------
  window.StrategyAdvisorManager = window.StrategyAdvisorManager || StrategyAdvisorManager;
  window.AdvisorOpinion = window.AdvisorOpinion || AdvisorOpinion;
  window.OpponentProfile = window.OpponentProfile || OpponentProfile;
  window.BattleContext = window.BattleContext || BattleContext;

})();
