// ============================================================================
// Persistent World — V3: WorldEventBus + DynamicEventQueue
// thunderbolt feedback pipeline + nanobot distributed mesh communication
// ============================================================================
'use strict';

var EventPriority = { LOW: 0, NORMAL: 1, HIGH: 2, CRITICAL: 3 };

var WorldEvent = function(type, data, priority) {
  this.id = 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  this.type = type;
  this.data = data || {};
  this.priority = priority || EventPriority.NORMAL;
  this.timestamp = Date.now();
  this.sourceId = data && data.sourceId ? data.sourceId : null;
  this.propagated = false;
  this.handled = false;
  this.handledBy = [];
};

WorldEvent.prototype.markHandled = function(handlerId) {
  this.handled = true;
  this.handledBy.push(handlerId);
};

WorldEvent.prototype.isExpired = function(ttl) {
  return (Date.now() - this.timestamp) > ttl;
};

var WorldEventBus = function() {
  this.subscribers = {};
  this.eventHistory = [];
  this.eventLog = [];
  this.maxHistorySize = 1000;
  this.dispatchCount = 0;
};

WorldEventBus.prototype.subscribe = function(eventType, handler, handlerId, priority) {
  if (!this.subscribers[eventType]) this.subscribers[eventType] = [];
  var subId = handlerId || 'handler_' + Date.now();
  this.subscribers[eventType].push({
    id: subId,
    handler: handler,
    priority: priority || EventPriority.NORMAL,
    eventType: eventType,
    active: true
  });
  this.subscribers[eventType].sort(function(a, b) { return b.priority - a.priority; });
  return { success: true, subscriptionId: subId, subscriberCount: this.subscribers[eventType].length };
};

WorldEventBus.prototype.unsubscribe = function(eventType, handlerId) {
  if (!this.subscribers[eventType]) return { error: 'no_subscribers' };
  var idx = -1;
  for (var i = 0; i < this.subscribers[eventType].length; i++) {
    if (this.subscribers[eventType][i].id === handlerId) { idx = i; break; }
  }
  if (idx === -1) return { error: 'handler_not_found' };
  this.subscribers[eventType].splice(idx, 1);
  return { success: true, subscriberCount: this.subscribers[eventType].length };
};

WorldEventBus.prototype.publish = function(event) {
  if (!(event instanceof WorldEvent)) event = new WorldEvent(event.type, event.data, event.priority);
  this.eventLog.push(event);
  this.dispatchCount++;
  var delivered = 0;
  var handlers = this.subscribers[event.type] || [];
  for (var i = 0; i < handlers.length; i++) {
    if (!handlers[i].active) continue;
    try {
      handlers[i].handler(event);
      delivered++;
    } catch (e) {
      console.error('Event handler error:', e);
    }
  }
  this.eventHistory.push(event);
  if (this.eventHistory.length > this.maxHistorySize) {
    this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
  }
  return { deliveredCount: delivered, totalSubscribers: handlers.length, eventId: event.id };
};

WorldEventBus.prototype.getEventHistory = function(eventType, limit) {
  var events = this.eventHistory;
  if (eventType) events = events.filter(function(e) { return e.type === eventType; });
  return events.slice(-(limit || 50));
};

WorldEventBus.prototype.getSubscriberCount = function(eventType) {
  return this.subscribers[eventType] ? this.subscribers[eventType].filter(function(s) { return s.active; }).length : 0;
};

WorldEventBus.prototype.getStatistics = function() {
  var typeCount = {};
  for (var type in this.subscribers) {
    typeCount[type] = this.subscribers[type].filter(function(s) { return s.active; }).length;
  }
  return { totalDispatches: this.dispatchCount, eventTypeCount: typeCount, historySize: this.eventHistory.length };
};

var DynamicEventQueue = function(eventBus) {
  this.eventBus = eventBus;
  this.queue = [];
  this.scheduledEvents = {};
  this.processing = false;
  this.maxQueueSize = 500;
  this.tickInterval = 100;
};

DynamicEventQueue.prototype.enqueue = function(event, delay) {
  if (this.queue.length >= this.maxQueueSize) return { error: 'queue_full' };
  var queuedEvent = { event: event, enqueuedAt: Date.now(), delay: delay || 0, scheduledFor: Date.now() + (delay || 0) };
  this.queue.push(queuedEvent);
  this.queue.sort(function(a, b) { return a.scheduledFor - b.scheduledFor; });
  return { success: true, queuePosition: this.queue.length, eventId: event.id };
};

DynamicEventQueue.prototype.scheduleRecurring = function(eventType, data, intervalMs, maxOccurrences) {
  var scheduleId = 'sched_' + Date.now();
  this.scheduledEvents[scheduleId] = {
    scheduleId: scheduleId,
    eventType: eventType,
    data: data,
    intervalMs: intervalMs,
    maxOccurrences: maxOccurrences || Infinity,
    occurrences: 0,
    nextFireAt: Date.now() + intervalMs,
    active: true
  };
  return { success: true, scheduleId: scheduleId };
};

DynamicEventQueue.prototype.cancelScheduled = function(scheduleId) {
  if (!this.scheduledEvents[scheduleId]) return { error: 'schedule_not_found' };
  this.scheduledEvents[scheduleId].active = false;
  return { success: true };
};

DynamicEventQueue.prototype.tick = function(now) {
  if (now === undefined) now = Date.now();
  var processed = 0;
  for (var i = this.queue.length - 1; i >= 0; i--) {
    var item = this.queue[i];
    if (item.scheduledFor <= now) {
      this.eventBus.publish(item.event);
      this.queue.splice(i, 1);
      processed++;
    }
  }
  for (var sid in this.scheduledEvents) {
    var sched = this.scheduledEvents[sid];
    if (!sched.active) continue;
    if (sched.nextFireAt <= now) {
      var evt = new WorldEvent(sched.eventType, sched.data, EventPriority.NORMAL);
      this.eventBus.publish(evt);
      sched.occurrences++;
      if (sched.occurrences >= sched.maxOccurrences) {
        sched.active = false;
      } else {
        sched.nextFireAt = now + sched.intervalMs;
      }
    }
  }
  return { processed: processed, queueSize: this.queue.length, activeSchedules: this._getActiveScheduleCount() };
};

DynamicEventQueue.prototype._getActiveScheduleCount = function() {
  var count = 0;
  for (var sid in this.scheduledEvents) { if (this.scheduledEvents[sid].active) count++; }
  return count;
};

DynamicEventQueue.prototype.getQueueSize = function() { return this.queue.length; };

window.EventPriority = EventPriority;
window.WorldEvent = WorldEvent;
window.WorldEventBus = WorldEventBus;
window.DynamicEventQueue = DynamicEventQueue;