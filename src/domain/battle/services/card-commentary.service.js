// ============================================================================
// Card Game Card Commentary Agent — V254 (Final Iteration)
// Card Commentary Agent: chatdev multi-agent + thunderbolt feedback loops + nanobot registry
// AI battle commentator, real-time narration, and event annotation
// ============================================================================
'use strict';

(function () {
  // ------ Models ------
  var CommentaryEvent = function(eventId, type, content, timestamp, intensity) {
    this.eventId = eventId;
    this.type = type;   // dramatic, factual, humor, milestone, warning
    this.content = content || '';
    this.timestamp = timestamp || Date.now();
    this.intensity = intensity || 1;  // 1-5
    this.annotations = [];
    this.style = 'neutral'; // neutral, excited, calm, ironic
  };

  var NarratorAgent = function(agentId, style) {
    this.agentId = agentId;
    this.style = style || 'neutral';
    this.registry = {};  // eventType -> handler (nanobot pattern)
    this.feedbackHistory = [];  // thunderbolt feedback loop
  };

  NarratorAgent.prototype.registerEventHandler = function(eventType, handler) {
    this.registry[eventType] = handler;  // nanobot: eventType -> handler
    return { success: true, handlerCount: Object.keys(this.registry).length };
  };

  NarratorAgent.prototype.generateCommentary = function(eventType, data) {
    var handler = this.registry[eventType];
    var baseCommentary = handler ? handler(data) : this._defaultHandler(eventType, data);

    // thunderbolt feedback: adjust based on history
    var recentHighIntensity = this.feedbackHistory.slice(-5).filter(function(e) { return e.intensity >= 4; }).length;
    var adjusted = baseCommentary;
    if (recentHighIntensity >= 2 && eventType === 'normal') {
      adjusted.intensity = Math.max(1, adjusted.intensity - 1);
      adjusted.content = '[cooling down] ' + adjusted.content;
    }
    if (data.critical && adjusted.intensity < 4) {
      adjusted.intensity = 4;
      adjusted.content = '[CRITICAL] ' + adjusted.content;
    }

    this.feedbackHistory.push(adjusted);
    return adjusted;
  };

  NarratorAgent.prototype._defaultHandler = function(eventType, data) {
    var content = 'Event: ' + eventType;
    if (data && data.playerName) content = data.playerName + ' performed ' + eventType;
    return new CommentaryEvent(null, 'factual', content, Date.now(), data && data.intensity ? data.intensity : 2);
  };

  // ------ Commentary Manager (chatdev multi-agent coordination) ------
  var CommentaryManager = function() {
    this.commentaryId = 'commentary_' + Date.now();
    this.events = [];    // CommentaryEvent[]
    this.agents = {
      play_by_play: new NarratorAgent('play_by_play', 'neutral'),
      color_commentator: new NarratorAgent('color_commentator', 'excited'),
      stats_analyst: new NarratorAgent('stats_analyst', 'factual')
    };
    this.hooks = {};
    this.sessionActive = false;
    this.stats = { totalEvents: 0, byType: {}, byAgent: {} };
  };

  // Session Management
  CommentaryManager.prototype.startSession = function() {
    if (this.sessionActive) return { error: 'session_already_active' };
    this.events = [];
    this.sessionActive = true;
    this._triggerHook('onSessionStart');
    return { success: true, sessionId: this.commentaryId };
  };

  CommentaryManager.prototype.endSession = function() {
    if (!this.sessionActive) return { error: 'no_active_session' };
    this.sessionActive = false;
    this._triggerHook('onSessionEnd');
    return { success: true, totalEvents: this.events.length };
  };

  // Agent Registration (nanobot registry pattern)
  CommentaryManager.prototype.registerAgent = function(agentId, style) {
    if (this.agents[agentId]) return { error: 'agent_exists' };
    this.agents[agentId] = new NarratorAgent(agentId, style || 'neutral');
    return { success: true, agent: this.agents[agentId] };
  };

  CommentaryManager.prototype.registerEventHandler = function(agentId, eventType, handler) {
    var agent = this.agents[agentId];
    if (!agent) return { error: 'agent_not_found' };
    var result = agent.registerEventHandler(eventType, handler);
    this._triggerHook('onHandlerRegistered', agentId, eventType);
    return result;
  };

  // Generate Commentary (chatdev multi-agent: each agent generates opinion)
  CommentaryManager.prototype.generateCommentary = function(eventType, data) {
    if (!this.sessionActive) return { error: 'no_active_session' };
    var self = this;
    var agentCommentaries = {};
    var agentIds = Object.keys(this.agents);

    agentIds.forEach(function(agentId) {
      var agent = self.agents[agentId];
      var commentary = agent.generateCommentary(eventType, data);
      commentary.agentId = agentId;
      agentCommentaries[agentId] = commentary;
      self.stats.byAgent[agentId] = (self.stats.byAgent[agentId] || 0) + 1;
    });

    // Aggregate: merge commentaries
    var primary = agentCommentaries[agentIds[0]] || new CommentaryEvent(null, eventType, '', Date.now(), 1);
    var mergedContent = agentIds.map(function(agentId) {
      return '[' + agentId + '] ' + agentCommentaries[agentId].content;
    }).join(' | ');

    // thunderbolt pattern: take max intensity across all agents
    var maxIntensity = 1;
    var maxType = primary.type;
    agentIds.forEach(function(agentId) {
      var c = agentCommentaries[agentId];
      if (c.intensity > maxIntensity) {
        maxIntensity = c.intensity;
        maxType = c.type;
      }
    });

    var finalCommentary = new CommentaryEvent(
      'ce_' + Date.now(),
      maxType,
      mergedContent,
      Date.now(),
      maxIntensity
    );
    finalCommentary.style = primary.style;
    finalCommentary.agentCommentaries = agentCommentaries;

    this.events.push(finalCommentary);
    this.stats.totalEvents++;
    this.stats.byType[eventType] = (this.stats.byType[eventType] || 0) + 1;

    this._triggerHook('onCommentaryGenerated', finalCommentary);
    return { success: true, commentary: finalCommentary, allAgents: agentCommentaries };
  };

  // Pre-built commentary for common game events
  CommentaryManager.prototype.registerGameHandlers = function() {
    var self = this;
    var agents = this.agents;

    // play-by-play handlers
    agents.play_by_play.registerEventHandler('card_played', function(d) {
      return new CommentaryEvent(null, 'factual', d.playerName + ' plays ' + (d.cardName || 'a card'), Date.now(), 2);
    });
    agents.play_by_play.registerEventHandler('damage_dealt', function(d) {
      return new CommentaryEvent(null, 'dramatic', d.targetName + ' takes ' + d.amount + ' damage!', Date.now(), Math.min(5, Math.floor(d.amount / 10) + 2));
    });
    agents.play_by_play.registerEventHandler('turn_start', function(d) {
      return new CommentaryEvent(null, 'factual', 'Turn ' + d.turnNumber + ' begins', Date.now(), 1);
    });

    // color commentator handlers
    agents.color_commentator.registerEventHandler('card_played', function(d) {
      return new CommentaryEvent(null, 'excited', 'What a play by ' + d.playerName + '!', Date.now(), 3);
    });
    agents.color_commentator.registerEventHandler('damage_dealt', function(d) {
      var exclamations = ['Incredible!', 'Unbelievable!', 'Wow!', 'No way!'];
      var ex = exclamations[Math.floor(Math.random() * exclamations.length)];
      return new CommentaryEvent(null, 'dramatic', ex + ' ' + d.targetName + ' hit for ' + d.amount + '!', Date.now(), 4);
    });
    agents.color_commentator.registerEventHandler('milestone', function(d) {
      return new CommentaryEvent(null, 'milestone', '*** MILESTONE: ' + d.message + ' ***', Date.now(), 5);
    });

    // stats analyst handlers
    agents.stats_analyst.registerEventHandler('card_played', function(d) {
      return new CommentaryEvent(null, 'factual', d.playerName + ' has now played ' + (d.totalPlayed || 0) + ' cards this game', Date.now(), 1);
    });
    agents.stats_analyst.registerEventHandler('damage_dealt', function(d) {
      var total = d.totalDamage || d.amount;
      return new CommentaryEvent(null, 'factual', 'Cumulative damage this match: ' + total, Date.now(), 1);
    });
    agents.stats_analyst.registerEventHandler('win_probability', function(d) {
      return new CommentaryEvent(null, 'factual', 'Estimated win probability: ' + d.probability + '%', Date.now(), 2);
    });
  };

  // Add Annotation
  CommentaryManager.prototype.addAnnotation = function(eventId, annotation) {
    var event = this._findEvent(eventId);
    if (!event) return { error: 'event_not_found' };
    event.annotations.push({ text: annotation, timestamp: Date.now() });
    return { success: true, annotationCount: event.annotations.length };
  };

  CommentaryManager.prototype._findEvent = function(eventId) {
    for (var i = 0; i < this.events.length; i++) {
      if (this.events[i].eventId === eventId) return this.events[i];
    }
    return null;
  };

  // Get Commentary
  CommentaryManager.prototype.getRecentCommentary = function(n) {
    n = n || 10;
    return this.events.slice(-n);
  };

  CommentaryManager.prototype.getCommentaryByType = function(type) {
    return this.events.filter(function(e) { return e.type === type; });
  };

  CommentaryManager.prototype.getSessionStats = function() {
    return {
      sessionActive: this.sessionActive,
      totalEvents: this.stats.totalEvents,
      byType: JSON.parse(JSON.stringify(this.stats.byType)),
      byAgent: JSON.parse(JSON.stringify(this.stats.byAgent)),
      eventCount: this.events.length
    };
  };

  // Hook System
  CommentaryManager.prototype.registerHook = function(eventName, callback) {
    if (!this.hooks[eventName]) this.hooks[eventName] = [];
    this.hooks[eventName].push(callback);
    return { success: true };
  };

  CommentaryManager.prototype._triggerHook = function(eventName) {
    var hooks = this.hooks[eventName] || [];
    var args = Array.prototype.slice.call(arguments, 1);
    hooks.forEach(function(h) { h.apply(null, args); });
  };

  // ------ Expose globally ------
  window.CommentaryManager = window.CommentaryManager || CommentaryManager;
  window.CommentaryEvent = window.CommentaryEvent || CommentaryEvent;
  window.NarratorAgent = window.NarratorAgent || NarratorAgent;

})();
