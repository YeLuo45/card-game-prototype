/**
 * Battle Replay Recorder (Iteration 1/9)
 * Core: BattleReplayRecorder
 * 
 * Features:
 * - Record battle events (draw, play, damage, status changes)
 * - Serialize/deserialize for storage
 * - Compressed storage (key events vs full record)
 */

class BattleReplayRecorder {
  constructor(options = {}) {
    this.events = [];
    this.currentBattleId = null;
    this.maxEvents = options.maxEvents || 1000;
    this.compressionEnabled = options.compressionEnabled || false;
    this.version = 'V255-Iter1';
    this.battles = new Map();
  }

  /**
   * Record a battle event
   * @param {object} eventData - Event data to record
   * @returns {string} Battle ID
   */
  record(eventData) {
    const event = {
      ...eventData,
      timestamp: eventData.timestamp || Date.now(),
      eventId: this._generateEventId()
    };

    // Check if this is a battle start event
    if (event.type === 'battle_start') {
      this.currentBattleId = this._generateBattleId();
      this.battles.set(this.currentBattleId, []);
    }

    // Associate event with current battle
    if (this.currentBattleId) {
      event.battleId = this.currentBattleId;
    }

    // Enforce max events limit
    if (this.events.length >= this.maxEvents) {
      this.events.shift();
    }

    this.events.push(event);
    
    // Also add to battles map for replay by battle ID
    if (this.currentBattleId) {
      const battleEvents = this.battles.get(this.currentBattleId);
      if (battleEvents) {
        battleEvents.push(event);
      }
    }

    return this.currentBattleId;
  }

  /**
   * Replay recorded events
   * @param {string} battleId - Optional specific battle ID to replay
   * @returns {object} Replay data with events and metadata
   */
  replay(battleId = null) {
    let eventsToReplay;
    let replayBattleId = battleId;

    if (battleId) {
      eventsToReplay = this.battles.get(battleId) || [];
      replayBattleId = battleId;
    } else {
      eventsToReplay = this.events;
      replayBattleId = this.currentBattleId;
    }

    const replayEvents = eventsToReplay.map(e => ({ ...e }));

    // Calculate duration from timestamps
    let duration = 0;
    if (replayEvents.length >= 2) {
      const firstTs = replayEvents[0].timestamp || 0;
      const lastTs = replayEvents[replayEvents.length - 1].timestamp || 0;
      duration = lastTs - firstTs;
    }

    return {
      battleId: replayBattleId,
      events: replayEvents,
      eventCount: replayEvents.length,
      duration,
      version: this.version
    };
  }

  /**
   * Serialize events to JSON
   * @returns {string} JSON string of recorded events
   */
  serialize() {
    const data = {
      metadata: {
        version: this.version,
        eventCount: this.events.length,
        timestamp: Date.now(),
        compressionEnabled: this.compressionEnabled
      },
      events: this.compressionEnabled ? this._compressEvents() : [...this.events]
    };

    return JSON.stringify(data);
  }

  /**
   * Deserialize JSON back to events
   * @param {string} jsonString - JSON string to deserialize
   * @returns {object|boolean} Deserialized data or false on error
   */
  deserialize(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      return false;
    }

    try {
      const data = JSON.parse(jsonString);
      
      if (!data.events || !Array.isArray(data.events)) {
        return false;
      }

      this.events = data.events.map(e => ({ ...e }));
      this.version = data.metadata?.version || this.version;

      // Rebuild battles map
      this.battles.clear();
      for (const event of this.events) {
        if (event.battleId) {
          if (!this.battles.has(event.battleId)) {
            this.battles.set(event.battleId, []);
          }
          this.battles.get(event.battleId).push(event);
        }
      }

      // Set current battle ID to last battle
      const battleIds = Array.from(this.battles.keys());
      this.currentBattleId = battleIds[battleIds.length - 1] || null;

      return {
        eventCount: this.events.length,
        version: this.version
      };
    } catch (e) {
      return false;
    }
  }

  /**
   * Reset recorder state
   */
  reset() {
    this.events = [];
    this.currentBattleId = null;
    this.battles.clear();
  }

  /**
   * Get total event count
   * @returns {number} Event count
   */
  getEventCount() {
    return this.events.length;
  }

  /**
   * Get key events (battle_start, battle_end, critical_hit, finishing_blow)
   * @returns {Array} Key events
   */
  getKeyEvents() {
    const keyTypes = ['battle_start', 'battle_end', 'critical_hit', 'finishing_blow', 'decision_point'];
    return this.events.filter(e => keyTypes.includes(e.type));
  }

  /**
   * Generate unique battle ID
   * @returns {string} Battle ID
   */
  _generateBattleId() {
    return `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   * @returns {string} Event ID
   */
  _generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Compress events (simple deduplication for consecutive similar events)
   * @returns {Array} Compressed events
   */
  _compressEvents() {
    const compressed = [];
    let lastEvent = null;

    for (const event of this.events) {
      if (lastEvent && this._areSimilarEvents(lastEvent, event)) {
        // Update count instead of adding new event
        if (compressed.length > 0) {
          compressed[compressed.length - 1].repeatCount = 
            (compressed[compressed.length - 1].repeatCount || 1) + 1;
        }
      } else {
        compressed.push({ ...event, repeatCount: 1 });
      }
      lastEvent = event;
    }

    return compressed;
  }

  /**
   * Check if two events are similar enough to compress
   * @param {object} event1 - First event
   * @param {object} event2 - Second event
   * @returns {boolean} True if similar
   */
  _areSimilarEvents(event1, event2) {
    if (event1.type !== event2.type) return false;
    if (event1.turn !== event2.turn) return false;
    if (event1.cardId && event1.cardId === event2.cardId) return true;
    return false;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BattleReplayRecorder };
} else if (typeof window !== 'undefined') {
  window.BattleReplayRecorder = BattleReplayRecorder;
}