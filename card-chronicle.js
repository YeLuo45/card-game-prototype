// ============================================================================
// Card Chronicle — V200 Direction A
// Chronicle recording with event logging, timeline entries, and history tracks
// nanobot distributed mesh + thunderbolt feedback loops
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // TimelineEntry: A single entry in the chronicle timeline
  // -----------------------------------------------------------------------
  function TimelineEntry(entryId, eventType, description, timestamp, tags) {
    this.entryId = entryId;
    this.eventType = eventType || 'general';
    this.description = description || '';
    this.timestamp = timestamp || Date.now();
    this.tags = tags || [];
    this.importance = 1; // 1-5
    this.pinned = false;
  }

  TimelineEntry.prototype.setImportance = function (level) {
    this.importance = Math.max(1, Math.min(5, level));
    return { success: true, importance: this.importance };
  };

  TimelineEntry.prototype.pin = function () {
    this.pinned = true;
    return { success: true };
  };

  TimelineEntry.prototype.unpin = function () {
    this.pinned = false;
    return { success: true };
  };

  TimelineEntry.prototype.getAge = function () {
    return Date.now() - this.timestamp;
  };

  // -----------------------------------------------------------------------
  // Chronicle: Main chronicle log
  // -----------------------------------------------------------------------
  function Chronicle(chronicleId, name, maxEntries) {
    this.chronicleId = chronicleId || ('chron_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Chronicle';
    this.maxEntries = maxEntries || 200;
    this.entries = {}; // entryId -> TimelineEntry
    this.entryOrder = []; // ordered array of entryIds
    this.entryCounter = 0;
    this.eventCounts = {}; // eventType -> count
  }

  Chronicle.prototype.addEntry = function (entry) {
    if (Object.keys(this.entries).length >= this.maxEntries) {
      // evict oldest non-pinned entry
      for (var i = 0; i < this.entryOrder.length; i++) {
        var eid = this.entryOrder[i];
        if (!this.entries[eid].pinned) {
          delete this.entries[eid];
          this.entryOrder.splice(i, 1);
          break;
        }
      }
    }
    this.entries[entry.entryId] = entry;
    this.entryOrder.push(entry.entryId);
    this.eventCounts[entry.eventType] = (this.eventCounts[entry.eventType] || 0) + 1;
    return { success: true, count: Object.keys(this.entries).length };
  };

  Chronicle.prototype.getEntry = function (entryId) {
    return this.entries[entryId] || null;
  };

  Chronicle.prototype.removeEntry = function (entryId) {
    var entry = this.entries[entryId];
    if (!entry) return { error: 'entry_not_found' };
    var idx = this.entryOrder.indexOf(entryId);
    if (idx !== -1) this.entryOrder.splice(idx, 1);
    delete this.entries[entryId];
    this.eventCounts[entry.eventType] = Math.max(0, (this.eventCounts[entry.eventType] || 1) - 1);
    return { success: true };
  };

  Chronicle.prototype.getRecentEntries = function (count) {
    var start = Math.max(0, this.entryOrder.length - count);
    var result = [];
    for (var i = start; i < this.entryOrder.length; i++) {
      result.push(this.entries[this.entryOrder[i]]);
    }
    return result;
  };

  Chronicle.prototype.getEntriesByType = function (eventType) {
    var result = [];
    for (var i = 0; i < this.entryOrder.length; i++) {
      var e = this.entries[this.entryOrder[i]];
      if (e.eventType === eventType) result.push(e);
    }
    return result;
  };

  Chronicle.prototype.getEntriesByTag = function (tag) {
    var result = [];
    for (var i = 0; i < this.entryOrder.length; i++) {
      var e = this.entries[this.entryOrder[i]];
      if (e.tags.indexOf(tag) !== -1) result.push(e);
    }
    return result;
  };

  Chronicle.prototype.getEventCounts = function () {
    return this.eventCounts;
  };

  Chronicle.prototype.getEntryCount = function () { return Object.keys(this.entries).length; };

  // -----------------------------------------------------------------------
  // ChronicleVolume: A collection of chronicles
  // -----------------------------------------------------------------------
  function ChronicleVolume(volumeId, name) {
    this.volumeId = volumeId || ('vol_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Volume';
    this.chronicles = {}; // chronicleId -> Chronicle
    this.currentChronicleId = null;
    this.volumeCounter = 0;
  }

  ChronicleVolume.prototype.createChronicle = function (name, maxEntries) {
    var id = 'chron_' + (++this.volumeCounter);
    this.chronicles[id] = new Chronicle(id, name, maxEntries);
    this.currentChronicleId = id;
    return { success: true, chronicleId: id };
  };

  ChronicleVolume.prototype.getCurrentChronicle = function () {
    return this.currentChronicleId ? this.chronicles[this.currentChronicleId] : null;
  };

  ChronicleVolume.prototype.switchChronicle = function (chronicleId) {
    if (!this.chronicles[chronicleId]) return { error: 'chronicle_not_found' };
    this.currentChronicleId = chronicleId;
    return { success: true };
  };

  ChronicleVolume.prototype.getChronicle = function (id) { return this.chronicles[id] || null; };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.TimelineEntry = TimelineEntry;
  window.Chronicle = Chronicle;
  window.ChronicleVolume = ChronicleVolume;
})();