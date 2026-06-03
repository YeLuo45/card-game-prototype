// ============================================================================
// PvP Co-op — V290 Direction D Iteration 9/9
// MatchReplay: 比赛回放 (记录/步进/快进/跳转/导出)
// 来源：thunderbolt PowerSync + chatdev Multi-Agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function MatchReplay(options) {
    options = options || {};
    this.recordings = {};
    this.recordingCounter = 0;
    this.maxFrames = options.maxFrames || 10000;
    this.metrics = {
      started: 0,
      frames: 0,
      replays: 0
    };
  }

  MatchReplay.prototype.start = function (matchId, options) {
    options = options || {};
    if (this.recordings[matchId]) return { error: 'already_recording' };
    this.recordingCounter++;
    var rid = this.recordingCounter;
    this.recordings[matchId] = {
      recordingId: 'rec_' + rid,
      matchId: matchId,
      startTime: Date.now(),
      endTime: null,
      frames: [],
      players: options.players || [],
      metadata: options.metadata || {},
      currentFrame: 0
    };
    this.metrics.started++;
    return { success: true, recordingId: this.recordings[matchId].recordingId };
  };

  MatchReplay.prototype.stop = function (matchId) {
    var r = this.recordings[matchId];
    if (!r) return { error: 'not_found' };
    r.endTime = Date.now();
    return { success: true, totalFrames: r.frames.length, duration: r.endTime - r.startTime };
  };

  MatchReplay.prototype.recordFrame = function (matchId, frame) {
    var r = this.recordings[matchId];
    if (!r) return { error: 'not_found' };
    if (r.endTime) return { error: 'recording_stopped' };
    if (typeof frame !== 'object') return { error: 'invalid_frame' };
    var entry = {
      index: r.frames.length,
      ts: Date.now(),
      data: frame.data || frame,
      delta: frame.delta || null
    };
    r.frames.push(entry);
    if (r.frames.length > this.maxFrames) {
      r.frames = r.frames.slice(-this.maxFrames);
    }
    this.metrics.frames++;
    return { success: true, frameIndex: entry.index };
  };

  MatchReplay.prototype.getFrame = function (matchId, index) {
    var r = this.recordings[matchId];
    if (!r) return null;
    if (typeof index !== 'number' || index < 0 || index >= r.frames.length) return null;
    return r.frames[index];
  };

  MatchReplay.prototype.getCurrentFrame = function (matchId) {
    var r = this.recordings[matchId];
    if (!r) return null;
    if (r.currentFrame >= r.frames.length) return null;
    return r.frames[r.currentFrame];
  };

  MatchReplay.prototype.step = function (matchId) {
    var r = this.recordings[matchId];
    if (!r) return { error: 'not_found' };
    if (r.currentFrame >= r.frames.length - 1) return { error: 'end_of_recording' };
    r.currentFrame++;
    return { success: true, frame: r.frames[r.currentFrame] };
  };

  MatchReplay.prototype.seek = function (matchId, index) {
    var r = this.recordings[matchId];
    if (!r) return { error: 'not_found' };
    if (typeof index !== 'number' || index < 0 || index >= r.frames.length) return { error: 'out_of_range' };
    r.currentFrame = index;
    return { success: true, frame: r.frames[index] };
  };

  MatchReplay.prototype.rewind = function (matchId) {
    var r = this.recordings[matchId];
    if (!r) return { error: 'not_found' };
    r.currentFrame = 0;
    return { success: true };
  };

  MatchReplay.prototype.fastForward = function (matchId, frames) {
    var r = this.recordings[matchId];
    if (!r) return { error: 'not_found' };
    var target = Math.min(r.frames.length - 1, r.currentFrame + (frames || 30));
    r.currentFrame = target;
    return { success: true, frame: r.frames[target] };
  };

  MatchReplay.prototype.replay = function (matchId, callback) {
    var r = this.recordings[matchId];
    if (!r) return { error: 'not_found' };
    if (typeof callback !== 'function') return { error: 'invalid_callback' };
    var count = 0;
    for (var i = 0; i < r.frames.length; i++) {
      callback(r.frames[i], i);
      count++;
    }
    this.metrics.replays++;
    return { success: true, framesReplayed: count };
  };

  MatchReplay.prototype.replayRange = function (matchId, startIdx, endIdx, callback) {
    var r = this.recordings[matchId];
    if (!r) return { error: 'not_found' };
    if (typeof callback !== 'function') return { error: 'invalid_callback' };
    var s = Math.max(0, startIdx);
    var e = Math.min(r.frames.length - 1, endIdx);
    var count = 0;
    for (var i = s; i <= e; i++) {
      callback(r.frames[i], i);
      count++;
    }
    return { success: true, framesReplayed: count };
  };

  MatchReplay.prototype.getRecording = function (matchId) {
    return this.recordings[matchId] || null;
  };

  MatchReplay.prototype.listRecordings = function () {
    var arr = [];
    for (var k in this.recordings) {
      if (Object.prototype.hasOwnProperty.call(this.recordings, k)) {
        var r = this.recordings[k];
        arr.push({ matchId: k, recordingId: r.recordingId, totalFrames: r.frames.length, endTime: r.endTime });
      }
    }
    return arr;
  };

  MatchReplay.prototype.exportRecording = function (matchId) {
    var r = this.recordings[matchId];
    if (!r) return { error: 'not_found' };
    return {
      format: 'replay-v1',
      matchId: r.matchId,
      recordingId: r.recordingId,
      startTime: r.startTime,
      endTime: r.endTime,
      players: r.players,
      metadata: r.metadata,
      frames: r.frames,
      totalFrames: r.frames.length
    };
  };

  MatchReplay.prototype.importRecording = function (data) {
    if (!data || data.format !== 'replay-v1') return { error: 'invalid_format' };
    if (!data.matchId) return { error: 'matchId_required' };
    this.recordings[data.matchId] = {
      recordingId: data.recordingId,
      matchId: data.matchId,
      startTime: data.startTime,
      endTime: data.endTime,
      frames: data.frames || [],
      players: data.players || [],
      metadata: data.metadata || {},
      currentFrame: 0
    };
    return { success: true, matchId: data.matchId, totalFrames: (data.frames || []).length };
  };

  MatchReplay.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  MatchReplay.prototype.getSummary = function () {
    var totalFrames = 0;
    for (var k in this.recordings) {
      if (Object.prototype.hasOwnProperty.call(this.recordings, k)) {
        totalFrames += this.recordings[k].frames.length;
      }
    }
    return {
      totalRecordings: Object.keys(this.recordings).length,
      totalFrames: totalFrames,
      metrics: this.metrics
    };
  };

  MatchReplay.prototype.clear = function () {
    this.recordings = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.MatchReplay = MatchReplay;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MatchReplay: MatchReplay };
  }
})();
