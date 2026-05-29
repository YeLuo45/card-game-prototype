// ============================================================================
// Card Event Calendar — V151 Direction C
// Timed events, holiday specials, and limited-time card releases
// thunderbolt offline-first + generic-agent L0-L4 + chatdev multi-agent
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // EventCard: Card variant from events (limited edition)
  // -----------------------------------------------------------------------
  function EventCard(eventId, baseCard, multiplier, bonusEffect) {
    this.id = baseCard.id + '_event_' + eventId;
    this.name = baseCard.name;
    this.eventId = eventId;
    this.basePower = baseCard.power;
    this.power = Math.floor(baseCard.power * multiplier);
    this.rarity = baseCard.rarity;
    this.cost = baseCard.cost;
    this.multiplier = multiplier;
    this.bonusEffect = bonusEffect || '';
    this.expiresAt = null;
  }

  EventCard.prototype.setExpiry = function (timestamp) { this.expiresAt = timestamp; };
  EventCard.prototype.isExpired = function () {
    return this.expiresAt !== null && Date.now() > this.expiresAt;
  };

  // -----------------------------------------------------------------------
  // GameEvent: Single timed event definition
  // -----------------------------------------------------------------------
  function GameEvent(id, name, type, description, startDate, endDate, rewards, conditions) {
    this.id = id;
    this.name = name;
    this.type = type || 'special'; // daily | weekly | seasonal | special | crossovers
    this.description = description || '';
    this.startDate = startDate || Date.now();
    this.endDate = endDate || (Date.now() + 86400000);
    this.rewards = rewards || {};
    this.conditions = conditions || {};
    this.progress = 0;
    this.participated = false;
    this.claimed = false;
  }

  GameEvent.prototype.isActive = function () {
    var now = Date.now();
    return now >= this.startDate && now <= this.endDate;
  };

  GameEvent.prototype.getTimeRemaining = function () {
    var remaining = this.endDate - Date.now();
    return Math.max(remaining, 0);
  };

  GameEvent.prototype.participate = function () {
    this.participated = true;
  };

  GameEvent.prototype.updateProgress = function (amount) {
    this.progress += amount;
  };

  GameEvent.prototype.claim = function () {
    this.claimed = true;
  };

  GameEvent.prototype.getCompletionPercent = function () {
    if (!this.conditions.target) return 0;
    return Math.min(this.progress / this.conditions.target, 1);
  };

  // --------------------------------------------------------------------===
  // EventCalendar: Manages all timed events
  // ========================================================================
  function EventCalendar(storageKey) {
    this.storageKey = storageKey || 'event_calendar';
    this._events = {};
    this._pastEvents = [];
    this._eventCards = {};
    this._stats = { participated: 0, completed: 0, claimed: 0 };
    this._init();
  }

  EventCalendar.prototype._init = function () {
    this._load();
    if (Object.keys(this._events).length === 0) {
      this._generateDefaultEvents();
    }
  };

  EventCalendar.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._events = data.events || {};
          this._stats = data.stats || this._stats;
        }
      }
    } catch (e) {}
  };

  EventCalendar.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          events: this._events,
          stats: this._stats
        }));
      }
    } catch (e) {}
  };

  EventCalendar.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[EventCalendar] ' + msg);
  };

  EventCalendar.prototype._generateDefaultEvents = function () {
    var now = Date.now();
    var day = 86400000;

    var events = [
      { id: 'daily_1', name: 'Daily Challenge', type: 'daily', desc: 'Complete 3 battles', startDate: now, endDate: now + day, conditions: { type: 'battles', target: 3 }, rewards: { coins: 100, xp: 50 } },
      { id: 'weekly_1', name: 'Weekly Tournament', type: 'weekly', desc: 'Win 10 battles', startDate: now, endDate: now + (7 * day), conditions: { type: 'wins', target: 10 }, rewards: { coins: 500, card: 'rare_sword' } },
      { id: 'spring_event', name: 'Spring Festival', type: 'seasonal', desc: 'Collect spring cards', startDate: now, endDate: now + (14 * day), conditions: { type: 'collect', target: 5 }, rewards: { coins: 1000, card: 'spring_warrior' } }
    ];

    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      this._events[e.id] = new GameEvent(e.id, e.name, e.type, e.desc, e.startDate, e.endDate, e.rewards, e.conditions);
    }
    this._log('Generated ' + events.length + ' default events');
  };

  // Get all events
  EventCalendar.prototype.getAllEvents = function () {
    var result = [];
    for (var id in this._events) result.push(this._events[id]);
    return result;
  };

  // Get active events only
  EventCalendar.prototype.getActiveEvents = function () {
    var result = [];
    for (var id in this._events) {
      if (this._events[id].isActive()) result.push(this._events[id]);
    }
    return result;
  };

  // Get upcoming events
  EventCalendar.prototype.getUpcomingEvents = function () {
    var result = [];
    for (var id in this._events) {
      if (this._events[id].startDate > Date.now()) result.push(this._events[id]);
    }
    return result.sort(function (a, b) { return a.startDate - b.startDate; });
  };

  // Participate in event
  EventCalendar.prototype.participateInEvent = function (eventId) {
    var e = this._events[eventId];
    if (!e) return { error: 'event_not_found' };
    if (!e.isActive()) return { error: 'event_not_active' };
    if (e.participated) return { error: 'already_participated' };

    e.participate();
    this._stats.participated++;
    this._save();
    return { success: true };
  };

  // Update event progress
  EventCalendar.prototype.updateEventProgress = function (eventId, amount) {
    var e = this._events[eventId];
    if (!e) return { error: 'event_not_found' };
    if (!e.isActive()) return { error: 'event_not_active' };

    e.updateProgress(amount);
    this._save();
    return { success: true, progress: e.progress };
  };

  // Claim event reward
  EventCalendar.prototype.claimEventReward = function (eventId) {
    var e = this._events[eventId];
    if (!e) return { error: 'event_not_found' };
    if (!e.claimed && e.getCompletionPercent() < 1) return { error: 'not_completed' };
    if (e.claimed) return { error: 'already_claimed' };

    e.claim();
    this._stats.claimed++;
    this._stats.completed++;
    this._save();
    return { success: true, rewards: e.rewards };
  };

  // Get event by ID
  EventCalendar.prototype.getEvent = function (eventId) {
    return this._events[eventId] || null;
  };

  // Get stats
  EventCalendar.prototype.getStats = function () {
    return {
      participated: this._stats.participated,
      completed: this._stats.completed,
      claimed: this._stats.claimed
    };
  };

  // Archive expired events
  EventCalendar.prototype.archiveExpiredEvents = function () {
    var now = Date.now();
    var archived = 0;
    for (var id in this._events) {
      if (this._events[id].endDate < now) {
        this._pastEvents.push(this._events[id]);
        delete this._events[id];
        archived++;
      }
    }
    this._save();
    this._log('Archived ' + archived + ' expired events');
    return { success: true, archived: archived };
  };

  // Create event card (bonus edition)
  EventCalendar.prototype.createEventCard = function (eventId, baseCard, multiplier, bonusEffect, expiresAt) {
    var e = this._events[eventId];
    if (!e) return { error: 'event_not_found' };

    var card = new EventCard(eventId, baseCard, multiplier, bonusEffect);
    card.expiresAt = expiresAt || e.endDate;
    this._eventCards[card.id] = card;
    return { success: true, card: card };
  };

  // Get event card
  EventCalendar.prototype.getEventCard = function (cardId) {
    return this._eventCards[cardId] || null;
  };

  // Get stats for specific event type
  EventCalendar.prototype.getEventTypeStats = function (type) {
    var events = this.getAllEvents().filter(function (e) { return e.type === type; });
    var completed = events.filter(function (e) { return e.getCompletionPercent() >= 1; }).length;
    var claimed = events.filter(function (e) { return e.claimed; }).length;
    return { total: events.length, completed: completed, claimed: claimed };
  };

  // Add custom event
  EventCalendar.prototype.addEvent = function (id, name, type, description, startDate, endDate, rewards, conditions) {
    if (this._events[id]) return { error: 'event_exists' };
    this._events[id] = new GameEvent(id, name, type, description, startDate, endDate, rewards, conditions);
    this._save();
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // Exports
  // -----------------------------------------------------------------------
  window.EventCard = EventCard;
  window.GameEvent = GameEvent;
  window.EventCalendar = EventCalendar;
})();