// ============================================================================
// Card Game Replay Analysis — V250 Direction E
// Replay Analysis: thunderbolt offline-first + generic-agent L0-L4 + chatdev pipeline
// Frame-level replay, AI-powered suggestions, and battle analysis pipeline
// ============================================================================
'use strict';

(function () {
  // ------ Models ------
  var Replay = function(replayId, matchConfig) {
    this.replayId = replayId;
    this.matchConfig = matchConfig || {};
    this.frames = [];        // array of Frame objects
    this.duration = 0;       // in ms
    this.winnerId = null;
    this.playerIds = [];
    this.startedAt = Date.now();
    this.endedAt = null;
    this.metadata = {};      // custom metadata
    this.analysis = null;    // AnalysisResult
    this.tags = [];
    this.bookmarked = false;
  };

  var Frame = function(frameIndex, events, state) {
    this.frameIndex = frameIndex;
    this.timestamp = frameIndex * 16; // 60fps = 16.67ms per frame
    this.events = events || [];      // action events at this frame
    this.state = state || {};         // game state snapshot
    this.flags = {};
  };

  var FrameEvent = function(eventId, type, playerId, data, frameIndex) {
    this.eventId = eventId;
    this.type = type;   // play, attack, defend, use_ability, end_turn, draw, discard
    this.playerId = playerId || null;
    this.data = data || {};
    this.frameIndex = frameIndex;
    this.timestamp = Date.now();
  };

  var AnalysisResult = function(replayId) {
    this.replayId = replayId;
    this.turnCount = 0;
    this.avgTurnLength = 0;
    this.criticalFrames = [];  // key turning points
    this.playerStats = {};     // playerId -> stats
    this.aiSuggestions = [];   // AI-powered tips
    this.timeline = [];        // event timeline
  };

  // ------ Replay Core ------
  var ReplayManager = function(managerId) {
    this.managerId = managerId;
    this.replays = {};       // replayId -> Replay
    this.activeReplayId = null;
    this.frameBuffer = [];   // current recording buffer
    this.hooks = {};
  };

  // Recording
  ReplayManager.prototype.startRecording = function(matchConfig) {
    var replayId = 'replay_' + Date.now();
    var replay = new Replay(replayId, matchConfig);
    if (matchConfig && matchConfig.playerIds) replay.playerIds = matchConfig.playerIds;
    this.replays[replayId] = replay;
    this.activeReplayId = replayId;
    this.frameBuffer = [];
    this._triggerHook('onRecordingStart', replay);
    return { success: true, replayId: replayId };
  };

  ReplayManager.prototype.recordFrame = function(frameIndex, events, state) {
    if (!this.activeReplayId) return { error: 'no_active_recording' };
    var frame = new Frame(frameIndex, events, state);
    this.replays[this.activeReplayId].frames.push(frame);
    this.frameBuffer.push(frame);
    return { success: true, frameIndex: frameIndex };
  };

  ReplayManager.prototype.endRecording = function(winnerId) {
    if (!this.activeReplayId) return { error: 'no_active_recording' };
    var replay = this.replays[this.activeReplayId];
    replay.winnerId = winnerId || null;
    replay.endedAt = Date.now();
    replay.duration = replay.endedAt - replay.startedAt;
    if (replay.frames.length > 0) {
      replay.duration = replay.frames[replay.frames.length - 1].timestamp - replay.frames[0].timestamp;
    }
    this._triggerHook('onRecordingEnd', replay);
    this.activeReplayId = null;
    this.frameBuffer = [];
    return { success: true, replayId: replay.replayId, duration: replay.duration, frameCount: replay.frames.length };
  };

  ReplayManager.prototype.addTag = function(replayId, tag) {
    var replay = this.replays[replayId];
    if (!replay) return { error: 'replay_not_found' };
    if (replay.tags.indexOf(tag) < 0) replay.tags.push(tag);
    return { success: true };
  };

  ReplayManager.prototype.setBookmark = function(replayId, bookmarked) {
    var replay = this.replays[replayId];
    if (!replay) return { error: 'replay_not_found' };
    replay.bookmarked = !!bookmarked;
    return { success: true };
  };

  // Playback
  ReplayManager.prototype.getReplay = function(replayId) {
    return this.replays[replayId] || null;
  };

  ReplayManager.prototype.getFrame = function(replayId, frameIndex) {
    var replay = this.replays[replayId];
    if (!replay) return null;
    return replay.frames[frameIndex] || null;
  };

  ReplayManager.prototype.getFrameRange = function(replayId, start, end) {
    var replay = this.replays[replayId];
    if (!replay) return [];
    return replay.frames.slice(start, end);
  };

  ReplayManager.prototype.getEventsAtFrame = function(replayId, frameIndex) {
    var frame = this.getFrame(replayId, frameIndex);
    return frame ? frame.events : [];
  };

  ReplayManager.prototype.getReplaysByPlayer = function(playerId) {
    var result = [];
    for (var rid in this.replays) {
      if (this.replays[rid].playerIds.indexOf(playerId) >= 0) result.push(this.replays[rid]);
    }
    return result;
  };

  ReplayManager.prototype.getReplaysByTag = function(tag) {
    var result = [];
    for (var rid in this.replays) {
      if (this.replays[rid].tags.indexOf(tag) >= 0) result.push(this.replays[rid]);
    }
    return result;
  };

  ReplayManager.prototype.getBookmarkedReplays = function() {
    var result = [];
    for (var rid in this.replays) {
      if (this.replays[rid].bookmarked) result.push(this.replays[rid]);
    }
    return result;
  };

  // Analysis (generic-agent L0-L4 pattern matching)
  ReplayManager.prototype.analyzeReplay = function(replayId) {
    var replay = this.replays[replayId];
    if (!replay) return { error: 'replay_not_found' };

    var analysis = new AnalysisResult(replayId);
    var turnEvents = { p1: 0, p2: 0 };
    var lastTurnEnd = 0;
    var turnLengths = [];

    replay.frames.forEach(function(frame) {
      frame.events.forEach(function(event) {
        if (event.type === 'end_turn') {
          var turnLen = frame.frameIndex - lastTurnEnd;
          turnLengths.push(turnLen);
          lastTurnEnd = frame.frameIndex;
        }
      });
    });

    analysis.turnCount = turnLengths.length;
    analysis.avgTurnLength = turnLengths.length > 0 ? Math.round(turnLengths.reduce(function(a,b){return a+b;},0) / turnLengths.length) : 0;

    // Identify critical frames (high event density)
    var eventDensity = {};
    replay.frames.forEach(function(frame) {
      var key = Math.floor(frame.frameIndex / 60); // per-second bucket
      eventDensity[key] = (eventDensity[key] || 0) + frame.events.length;
    });
    var maxDensity = 0;
    for (var k in eventDensity) { if (eventDensity[k] > maxDensity) maxDensity = eventDensity[k]; }
    for (var k in eventDensity) {
      if (eventDensity[k] >= maxDensity * 0.7) {
        analysis.criticalFrames.push({ second: parseInt(k), density: eventDensity[k] });
      }
    }

    // AI suggestions based on patterns
    if (analysis.turnCount < 5) {
      analysis.aiSuggestions.push({ type: 'aggressive', message: 'Early victory — consider aggressive opening' });
    }
    if (analysis.avgTurnLength > 300) {
      analysis.aiSuggestions.push({ type: 'pace', message: 'Long average turn length — improve pacing' });
    }
    if (analysis.criticalFrames.length >= 3) {
      analysis.aiSuggestions.push({ type: 'complexity', message: 'Many critical moments — high complexity match' });
    }

    replay.analysis = analysis;
    return { success: true, analysis: analysis };
  };

  ReplayManager.prototype.getAnalysis = function(replayId) {
    var replay = this.replays[replayId];
    if (!replay) return null;
    return replay.analysis || null;
  };

  // Slow-motion playback simulation
  ReplayManager.prototype.simulatePlayback = function(replayId, speed) {
    var replay = this.replays[replayId];
    if (!replay) return { error: 'replay_not_found' };
    speed = speed || 1;
    var effectiveDuration = replay.duration / speed;
    return {
      replayId: replayId,
      originalDuration: replay.duration,
      effectiveDuration: effectiveDuration,
      frameCount: replay.frames.length,
      speed: speed
    };
  };

  // Export replay as JSON-serializable
  ReplayManager.prototype.exportReplay = function(replayId) {
    var replay = this.replays[replayId];
    if (!replay) return null;
    return JSON.parse(JSON.stringify(replay));
  };

  // Hook system
  ReplayManager.prototype.registerHook = function(eventName, callback) {
    if (!this.hooks[eventName]) this.hooks[eventName] = [];
    this.hooks[eventName].push(callback);
    return { success: true };
  };

  ReplayManager.prototype._triggerHook = function(eventName) {
    var hooks = this.hooks[eventName] || [];
    var args = Array.prototype.slice.call(arguments, 1);
    hooks.forEach(function(h) { h.apply(null, args); });
  };

  // Stats
  ReplayManager.prototype.getManagerStats = function() {
    var replayList = Object.values(this.replays);
    return {
      totalReplays: replayList.length,
      bookmarkedCount: replayList.filter(function(r) { return r.bookmarked; }).length,
      analyzedCount: replayList.filter(function(r) { return r.analysis !== null; }).length,
      totalFrames: replayList.reduce(function(s, r) { return s + r.frames.length; }, 0),
      avgDuration: replayList.length > 0 ? Math.round(replayList.reduce(function(s, r) { return s + r.duration; }, 0) / replayList.length) : 0
    };
  };

  // ------ Expose globally ------
  window.ReplayManager = window.ReplayManager || ReplayManager;
  window.Replay = window.Replay || Replay;
  window.Frame = window.Frame || Frame;
  window.FrameEvent = window.FrameEvent || FrameEvent;
  window.AnalysisResult = window.AnalysisResult || AnalysisResult;

})();
