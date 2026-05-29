// ============================================================================
// Card Replay Theater — V147 Direction E
// Match playback and analysis with timeline scrubbing and annotations
// chatdev multi-agent collaboration + thunderbolt offline-first + nanobot tool registry
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // ReplayEvent: Single event in a match replay
  // -----------------------------------------------------------------------
  function ReplayEvent(timestamp, type, data) {
    this.timestamp = timestamp;
    this.type = type; // 'play' | 'attack' | 'damage' | 'turn' | 'end'
    this.data = data || {};
  }

  ReplayEvent.prototype.toJSON = function () {
    return { timestamp: this.timestamp, type: this.type, data: this.data };
  };

  // -----------------------------------------------------------------------
  // Replay: Complete match replay
  // -----------------------------------------------------------------------
  function Replay(id, players) {
    this.id = id || 'replay_' + Date.now();
    this.players = players || []; // [{ id, name, deck }]
    this.events = [];
    this.duration = 0;
    this.winner = null;
    this.metadata = {};
    this.rating = null; // 1-5 stars
    this.notes = [];
    this.tags = [];
    this.createdAt = Date.now();
    this.views = 0;
  }

  Replay.prototype.addEvent = function (type, data) {
    var timestamp = this.events.length > 0 ? this.events[this.events.length - 1].timestamp + 1 : 0;
    var event = new ReplayEvent(timestamp, type, data);
    this.events.push(event);
    return event;
  };

  Replay.prototype.endReplay = function (winnerId) {
    this.winner = winnerId;
    this.duration = this.events.length > 0 ? this.events[this.events.length - 1].timestamp + 1 : 0;
  };

  Replay.prototype.getEventsByType = function (type) {
    return this.events.filter(function (e) { return e.type === type; });
  };

  Replay.prototype.getEventAt = function (index) {
    return this.events[index] || null;
  };

  Replay.prototype.addNote = function (text, timestamp) {
    this.notes.push({ text: text, timestamp: timestamp || null, createdAt: Date.now() });
  };

  Replay.prototype.tag = function (tag) {
    if (this.tags.indexOf(tag) < 0) this.tags.push(tag);
  };

  // -----------------------------------------------------------------------
  // ReplayRecorder: Records match events for replay
  // -----------------------------------------------------------------------
  function ReplayRecorder() {
    this._currentReplay = null;
    this._eventCount = 0;
  }

  ReplayRecorder.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[ReplayRecorder] ' + msg);
  };

  ReplayRecorder.prototype.startRecording = function (players) {
    if (this._currentReplay) return { error: 'already_recording' };
    this._currentReplay = new Replay('replay_' + Date.now(), players);
    this._eventCount = 0;
    this._log('Recording started');
    return { success: true, replayId: this._currentReplay.id };
  };

  ReplayRecorder.prototype.recordEvent = function (type, data) {
    if (!this._currentReplay) return { error: 'not_recording' };
    this._currentReplay.addEvent(type, data);
    this._eventCount++;
    return { success: true, eventIndex: this._eventCount - 1 };
  };

  ReplayRecorder.prototype.stopRecording = function (winnerId) {
    if (!this._currentReplay) return { error: 'not_recording' };
    this._currentReplay.endReplay(winnerId);
    var replay = this._currentReplay;
    this._currentReplay = null;
    this._log('Recording stopped, ' + replay.events.length + ' events');
    return { success: true, replay: replay };
  };

  ReplayRecorder.prototype.cancelRecording = function () {
    this._currentReplay = null;
    this._log('Recording cancelled');
  };

  // -----------------------------------------------------------------------
  // ReplayStorage: Manages replay persistence
  // -----------------------------------------------------------------------
  function ReplayStorage(storageKey) {
    this.storageKey = storageKey || 'replay_theater';
    this._replays = {};
    this._init();
  }

  ReplayStorage.prototype._init = function () {
    this._load();
  };

  ReplayStorage.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._replays = data.replays || {};
        }
      }
    } catch (e) {}
  };

  ReplayStorage.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({ replays: this._replays }));
      }
    } catch (e) {}
  };

  ReplayStorage.prototype.saveReplay = function (replay) {
    this._replays[replay.id] = replay;
    this._save();
    return { success: true };
  };

  ReplayStorage.prototype.getReplay = function (id) {
    return this._replays[id] || null;
  };

  ReplayStorage.prototype.listReplays = function (filters) {
    var result = [];
    for (var id in this._replays) {
      var r = this._replays[id];
      if (filters) {
        if (filters.winner && r.winner !== filters.winner) continue;
        if (filters.tag && r.tags.indexOf(filters.tag) < 0) continue;
        if (filters.rating && r.rating !== filters.rating) continue;
      }
      result.push({
        id: r.id,
        winner: r.winner,
        duration: r.duration,
        eventCount: r.events.length,
        rating: r.rating,
        createdAt: r.createdAt,
        views: r.views
      });
    }
    return result.sort(function (a, b) { return b.createdAt - a.createdAt; });
  };

  ReplayStorage.prototype.deleteReplay = function (id) {
    if (!this._replays[id]) return { error: 'replay_not_found' };
    delete this._replays[id];
    this._save();
    return { success: true };
  };

  ReplayStorage.prototype.searchReplays = function (query) {
    var q = query.toLowerCase();
    var result = [];
    for (var id in this._replays) {
      var r = this._replays[id];
      var match = false;

      if (r.id.indexOf(q) >= 0) match = true;
      if (r.metadata && r.metadata.query && r.metadata.query.indexOf(q) >= 0) match = true;
      for (var i = 0; i < r.notes.length; i++) {
        if (r.notes[i].text.toLowerCase().indexOf(q) >= 0) match = true;
      }

      if (match) result.push(r);
    }
    return result;
  };

  // -----------------------------------------------------------------------
  // ReplayAnalyzer: Post-replay statistics
  // -----------------------------------------------------------------------
  function ReplayAnalyzer() {}

  ReplayAnalyzer.prototype.analyze = function (replay) {
    var events = replay.events || [];
    var plays = events.filter(function (e) { return e.type === 'play'; });
    var attacks = events.filter(function (e) { return e.type === 'attack'; });
    var damages = events.filter(function (e) { return e.type === 'damage'; });

    var totalDamage = 0;
    for (var i = 0; i < damages.length; i++) {
      totalDamage += damages[i].data.amount || 0;
    }

    return {
      totalEvents: events.length,
      playCount: plays.length,
      attackCount: attacks.length,
      damageCount: damages.length,
      totalDamage: totalDamage,
      duration: replay.duration,
      winner: replay.winner,
      playerCount: replay.players ? replay.players.length : 0
    };
  };

  // -----------------------------------------------------------------------
  // ReplayTheater: UI state machine for replay playback
  // -----------------------------------------------------------------------
  function ReplayTheater(replay) {
    this.replay = replay;
    this.currentIndex = 0;
    this.speed = 1.0; // 1x, 2x, 4x
    this.playing = false;
    this._interval = null;
  }

  ReplayTheater.prototype.play = function () {
    if (this.playing) return;
    this.playing = true;
    var self = this;
    var delay = 1000 / this.speed;

    this._interval = setInterval(function () {
      self.currentIndex++;
      if (self.currentIndex >= self.replay.events.length) {
        self.pause();
        self.currentIndex = self.replay.events.length - 1;
      }
    }, delay);
  };

  ReplayTheater.prototype.pause = function () {
    this.playing = false;
    if (this._interval) clearInterval(this._interval);
  };

  ReplayTheater.prototype.seek = function (index) {
    this.pause();
    this.currentIndex = Math.max(0, Math.min(index, this.replay.events.length - 1));
  };

  ReplayTheater.prototype.setSpeed = function (speed) {
    this.speed = speed;
    if (this.playing) {
      this.pause();
      this.play();
    }
  };

  ReplayTheater.prototype.getCurrentEvent = function () {
    return this.replay.events[this.currentIndex] || null;
  };

  ReplayTheater.prototype.getProgress = function () {
    if (this.replay.events.length === 0) return 0;
    return this.currentIndex / (this.replay.events.length - 1);
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.ReplayEvent = ReplayEvent;
  window.Replay = Replay;
  window.ReplayRecorder = ReplayRecorder;
  window.ReplayStorage = ReplayStorage;
  window.ReplayAnalyzer = ReplayAnalyzer;
  window.ReplayTheater = ReplayTheater;
})();