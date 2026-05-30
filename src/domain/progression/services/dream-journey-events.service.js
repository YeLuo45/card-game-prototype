// ============================================================================
// Card Game Dream Journey Events — V251 Direction A Expansion
// Dream Journey Events: thunderbolt feedback loops + nanobot mesh event propagation
// Event generation, chain reactions, and player memory tracking in dreams
// ============================================================================
'use strict';

(function () {
  // ------ Models ------
  var DreamEvent = function(eventId, eventType, intensity, trigger) {
    this.eventId = eventId;
    this.eventType = eventType; // revelation, omen, memory_echo, transformation, encounter
    this.intensity = intensity || 1;  // 1-5
    this.trigger = trigger || null;   // triggering eventId
    this.affectedPlayers = [];
    this.consequences = [];
    this.timestamp = Date.now();
    this.resolved = false;
    this.layer = 0;  // L0-L4 memory layer
  };

  var DreamState = function(dreamId) {
    this.dreamId = dreamId;
    this.events = {};      // eventId -> DreamEvent
    this.activeEventId = null;
    this.phase = 'init';   // init, exploration, climax, resolution
    this.mood = 'mysterious'; // mysterious, ominous, peaceful, chaotic
    this.participants = {}; // playerId -> participant state
    this.meshConnections = []; // network of related events
    this.stats = { totalEvents: 0, chainReactions: 0 };
  };

  var ParticipantState = function(playerId) {
    this.playerId = playerId;
    this.dreamEnergy = 100;
    this.memoriesTriggered = [];
    this.eventResponses = {};
    this.layerAccess = 0;
    this.insight = 0;
    this.resonance = 0;  // nanobot mesh resonance
  };

  // ------ Dream Event Generator (thunderbolt feedback loops) ------
  var DreamEventGenerator = function() {
    this.eventTemplates = this._buildTemplates();
    this.cooldownMap = {};  // eventId -> last triggered timestamp
  };

  DreamEventGenerator.prototype._buildTemplates = function() {
    return [
      { type: 'revelation', baseIntensity: 3, minLayer: 0 },
      { type: 'omen', baseIntensity: 4, minLayer: 1 },
      { type: 'memory_echo', baseIntensity: 2, minLayer: 0 },
      { type: 'transformation', baseIntensity: 5, minLayer: 2 },
      { type: 'encounter', baseIntensity: 3, minLayer: 1 }
    ];
  };

  DreamEventGenerator.prototype.generateEvent = function(layer, previousEvent) {
    var templates = this.eventTemplates.filter(function(t) { return t.minLayer <= layer; });
    if (templates.length === 0) templates = this.eventTemplates;
    var template = templates[Math.floor(Math.random() * templates.length)];

    var intensity = template.baseIntensity + Math.floor(Math.random() * 2);
    intensity = Math.min(5, intensity);

    var eventId = 'de_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    var event = new DreamEvent(eventId, template.type, intensity, previousEvent ? previousEvent.eventId : null);

    // thunderbolt feedback: intensity influenced by previous event
    if (previousEvent && previousEvent.intensity >= 4) {
      event.intensity = Math.min(5, event.intensity + 1);
      event.consequences.push({ type: 'cascade', intensityBoost: 1 });
    }

    return event;
  };

  // ------ Dream State Manager (nanobot mesh) ------
  var DreamJourneyManager = function(managerId) {
    this.managerId = managerId;
    this.dreams = {};       // dreamId -> DreamState
    this.activeDreamId = null;
    this.generator = new DreamEventGenerator();
    this.hooks = {};
  };

  DreamJourneyManager.prototype.createDream = function(dreamId, participants) {
    var state = new DreamState(dreamId);
    if (participants) {
      participants.forEach(function(pid) {
        state.participants[pid] = new ParticipantState(pid);
      });
    }
    this.dreams[dreamId] = state;
    this.activeDreamId = dreamId;
    this._triggerHook('onDreamCreate', state);
    return { success: true, dreamId: dreamId, dream: state };
  };

  DreamJourneyManager.prototype.enterDream = function(dreamId) {
    if (!this.dreams[dreamId]) return { error: 'dream_not_found' };
    this.activeDreamId = dreamId;
    return { success: true, dream: this.dreams[dreamId] };
  };

  DreamJourneyManager.prototype.setDreamPhase = function(dreamId, phase) {
    var dream = this.dreams[dreamId];
    if (!dream) return { error: 'dream_not_found' };
    dream.phase = phase;
    this._triggerHook('onPhaseChange', dream, phase);
    return { success: true, phase: phase };
  };

  DreamJourneyManager.prototype.setDreamMood = function(dreamId, mood) {
    var dream = this.dreams[dreamId];
    if (!dream) return { error: 'dream_not_found' };
    dream.mood = mood;
    return { success: true };
  };

  // Event Management
  DreamJourneyManager.prototype.triggerEvent = function(eventType, intensity, playerId, layer) {
    if (!this.activeDreamId) return { error: 'no_active_dream' };
    var dream = this.dreams[this.activeDreamId];
    var previousEvent = dream.activeEventId ? dream.events[dream.activeEventId] : null;

    // Generate event (thunderbolt feedback)
    var event = this.generator.generateEvent(layer || 0, previousEvent);
    event.eventType = eventType || event.eventType;
    if (intensity) event.intensity = Math.min(5, Math.max(1, intensity));
    if (playerId) event.affectedPlayers.push(playerId);

    dream.events[event.eventId] = event;
    dream.activeEventId = event.eventId;
    dream.stats.totalEvents++;
    this._triggerHook('onEventTrigger', dream, event);
    return { success: true, event: event };
  };

  DreamJourneyManager.prototype.chainReaction = function(eventId, chainFromPlayer) {
    var dream = this.dreams[this.activeDreamId];
    if (!dream) return { error: 'no_active_dream' };
    var triggeringEvent = dream.events[eventId];
    if (!triggeringEvent) return { error: 'event_not_found' };

    // nanobot mesh: events propagate to connected participants
    var chainEvent = this.generator.generateEvent(triggeringEvent.layer, triggeringEvent);
    chainEvent.trigger = eventId;
    chainEvent.intensity = Math.max(1, triggeringEvent.intensity - 1);

    if (chainFromPlayer) chainEvent.affectedPlayers.push(chainFromPlayer);

    dream.events[chainEvent.eventId] = chainEvent;
    dream.activeEventId = chainEvent.eventId;
    dream.stats.chainReactions++;
    this._triggerHook('onChainReaction', dream, chainEvent, triggeringEvent);
    return { success: true, chainEvent: chainEvent };
  };

  DreamJourneyManager.prototype.resolveEvent = function(eventId) {
    var dream = this.dreams[this.activeDreamId];
    if (!dream) return { error: 'no_active_dream' };
    var event = dream.events[eventId];
    if (!event) return { error: 'event_not_found' };
    event.resolved = true;
    this._triggerHook('onEventResolve', dream, event);
    return { success: true };
  };

  DreamJourneyManager.prototype.getActiveEvent = function() {
    var dream = this.dreams[this.activeDreamId];
    if (!dream || !dream.activeEventId) return null;
    return dream.events[dream.activeEventId];
  };

  DreamJourneyManager.prototype.getEventHistory = function(limit) {
    var dream = this.dreams[this.activeDreamId];
    if (!dream) return [];
    limit = limit || 20;
    var events = Object.values(dream.events).sort(function(a, b) { return b.timestamp - a.timestamp; });
    return events.slice(0, limit);
  };

  DreamJourneyManager.prototype.getEventsByType = function(eventType) {
    var dream = this.dreams[this.activeDreamId];
    if (!dream) return [];
    return Object.values(dream.events).filter(function(e) { return e.eventType === eventType; });
  };

  // Participant Management
  DreamJourneyManager.prototype.addParticipant = function(playerId) {
    var dream = this.dreams[this.activeDreamId];
    if (!dream) return { error: 'no_active_dream' };
    if (dream.participants[playerId]) return { error: 'already_participating' };
    dream.participants[playerId] = new ParticipantState(playerId);
    return { success: true };
  };

  DreamJourneyManager.prototype.updateParticipantEnergy = function(playerId, delta) {
    var dream = this.dreams[this.activeDreamId];
    if (!dream || !dream.participants[playerId]) return { error: 'not_found' };
    var p = dream.participants[playerId];
    p.dreamEnergy = Math.max(0, Math.min(200, p.dreamEnergy + delta));
    if (delta > 0) p.resonance = Math.min(100, p.resonance + delta * 0.1);
    return { success: true, energy: p.dreamEnergy };
  };

  DreamJourneyManager.prototype.triggerMemory = function(playerId, eventId) {
    var dream = this.dreams[this.activeDreamId];
    if (!dream || !dream.participants[playerId]) return { error: 'not_found' };
    var event = dream.events[eventId];
    if (!event) return { error: 'event_not_found' };
    var p = dream.participants[playerId];
    if (p.memoriesTriggered.indexOf(eventId) < 0) p.memoriesTriggered.push(eventId);
    p.insight = Math.min(100, p.insight + event.intensity * 2);
    this._triggerHook('onMemoryTrigger', dream, playerId, event);
    return { success: true, insight: p.insight };
  };

  DreamJourneyManager.prototype.getParticipantState = function(playerId) {
    var dream = this.dreams[this.activeDreamId];
    if (!dream || !dream.participants[playerId]) return null;
    return dream.participants[playerId];
  };

  // Mesh Connections
  DreamJourneyManager.prototype.addMeshConnection = function(eventId1, eventId2) {
    var dream = this.dreams[this.activeDreamId];
    if (!dream) return { error: 'no_active_dream' };
    var connection = { from: eventId1, to: eventId2, timestamp: Date.now() };
    dream.meshConnections.push(connection);
    return { success: true };
  };

  DreamJourneyManager.prototype.getConnectedEvents = function(eventId) {
    var dream = this.dreams[this.activeDreamId];
    if (!dream) return [];
    return dream.meshConnections.filter(function(c) { return c.from === eventId || c.to === eventId; });
  };

  // Hook System
  DreamJourneyManager.prototype.registerHook = function(eventName, callback) {
    if (!this.hooks[eventName]) this.hooks[eventName] = [];
    this.hooks[eventName].push(callback);
    return { success: true };
  };

  DreamJourneyManager.prototype._triggerHook = function(eventName) {
    var hooks = this.hooks[eventName] || [];
    var args = Array.prototype.slice.call(arguments, 1);
    hooks.forEach(function(h) { h.apply(null, args); });
  };

  // Stats
  DreamJourneyManager.prototype.getDreamStats = function(dreamId) {
    var dream = this.dreams[dreamId];
    if (!dream) return null;
    return {
      totalEvents: dream.stats.totalEvents,
      chainReactions: dream.stats.chainReactions,
      activePhase: dream.phase,
      mood: dream.mood,
      participantCount: Object.keys(dream.participants).length,
      eventTypeCounts: Object.values(dream.events).reduce(function(acc, e) {
        acc[e.eventType] = (acc[e.eventType] || 0) + 1;
        return acc;
      }, {})
    };
  };

  // ------ Expose globally ------
  window.DreamJourneyManager = window.DreamJourneyManager || DreamJourneyManager;
  window.DreamEvent = window.DreamEvent || DreamEvent;
  window.DreamState = window.DreamState || DreamState;
  window.DreamEventGenerator = window.DreamEventGenerator || DreamEventGenerator;

})();
