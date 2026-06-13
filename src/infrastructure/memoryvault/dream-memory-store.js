// ============================================================================
// Distributed Memory Vault — V300 Direction F Iteration 1/30
// DreamMemoryStore: 跨会话记忆持久化层（IndexedDB兼容接口 + localStorage shim）
// 来源：nanobot Dream Memory + generic-agent L0-L4 + thunderbolt SQLite offline-first
// ============================================================================
'use strict';

(function () {

  // --------------------------------------------------------------------------
  // MEMORY_TYPE — memory category enumeration
  // --------------------------------------------------------------------------
  var MEMORY_TYPE = {
    EPISODIC: 'episodic',     // 事件记忆 (一次战斗/一次交易)
    SEMANTIC: 'semantic',     // 语义记忆 (卡牌知识/规则)
    PROCEDURAL: 'procedural', // 程序记忆 (操作技能/快捷键)
    EMOTIONAL: 'emotional',   // 情感记忆 (输赢体验/难忘时刻)
    NPC: 'npc',               // NPC相关记忆
    STRATEGIC: 'strategic',   // 策略记忆 (对手建模)
    META: 'meta'              // 元记忆 (记忆的记忆)
  };

  // --------------------------------------------------------------------------
  // MEMORY_LAYER — L0-L4 分层记忆层级
  // --------------------------------------------------------------------------
  var MEMORY_LAYER = {
    L0_RULE: 'L0',       // 规则层 (核心规则/常量)
    L1_INDEX: 'L1',      // 索引层 (主题/标签)
    L2_GLOBAL: 'L2',     // 全局层 (跨玩家通用知识)
    L3_SKILL: 'L3',      // 技能层 (玩家独有技巧)
    L4_SESSION: 'L4'     // 会话层 (本次对战上下文)
  };

  // --------------------------------------------------------------------------
  // MemoryEntry — single memory record
  // --------------------------------------------------------------------------
  function MemoryEntry(id, type, layer, content, metadata) {
    this.id = id || '';
    this.type = type || MEMORY_TYPE.EPISODIC;
    this.layer = layer || MEMORY_LAYER.L4_SESSION;
    this.content = content || null;
    this.metadata = metadata || {};
    this.createdAt = Date.now();
    this.accessedAt = Date.now();
    this.accessCount = 0;
    this.importance = 0.5;
    this.decayFactor = 1.0;
  }

  MemoryEntry.prototype.touch = function () {
    this.accessedAt = Date.now();
    this.accessCount += 1;
    return this;
  };

  MemoryEntry.prototype.setImportance = function (value) {
    var v = Number(value);
    if (isNaN(v)) return false;
    this.importance = Math.max(0, Math.min(1, v));
    return true;
  };

  MemoryEntry.prototype.applyDecay = function (rate) {
    var r = Number(rate);
    if (isNaN(r) || r <= 0) return false;
    this.decayFactor = this.decayFactor * (1 - r);
    if (this.decayFactor < 0.01) this.decayFactor = 0.01;
    return true;
  };

  MemoryEntry.prototype.toJSON = function () {
    return {
      id: this.id,
      type: this.type,
      layer: this.layer,
      content: this.content,
      metadata: this.metadata,
      createdAt: this.createdAt,
      accessedAt: this.accessedAt,
      accessCount: this.accessCount,
      importance: this.importance,
      decayFactor: this.decayFactor
    };
  };

  MemoryEntry.fromJSON = function (obj) {
    if (!obj || typeof obj !== 'object') return null;
    var e = new MemoryEntry(obj.id, obj.type, obj.layer, obj.content, obj.metadata);
    e.createdAt = obj.createdAt || e.createdAt;
    e.accessedAt = obj.accessedAt || e.accessedAt;
    e.accessCount = obj.accessCount || 0;
    e.importance = obj.importance != null ? obj.importance : 0.5;
    e.decayFactor = obj.decayFactor != null ? obj.decayFactor : 1.0;
    return e;
  };

  // --------------------------------------------------------------------------
  // DreamMemoryStore — main memory container with persistence
  // --------------------------------------------------------------------------
  function DreamMemoryStore(options) {
    this.entries = {};           // id -> MemoryEntry
    this.byType = {};            // type -> Set of ids
    this.byLayer = {};           // layer -> Set of ids
    this.bySession = {};         // sessionId -> Set of ids
    this.sessions = {};          // sessionId -> {start, end, count}
    this.persistence = (options && options.persistence) || null;
    this.namespace = (options && options.namespace) || 'dream_memory';
    this.maxSize = (options && options.maxSize) || 10000;
    this._idCounter = 0;
    this._loadFromPersistence();
  }

  DreamMemoryStore.prototype._loadFromPersistence = function () {
    if (!this.persistence || typeof this.persistence.getItem !== 'function') return;
    var raw = this.persistence.getItem(this.namespace);
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      this._restore(parsed);
    } catch (e) { /* corrupt data, ignore */ }
  };

  DreamMemoryStore.prototype._restore = function (data) {
    if (!data || typeof data !== 'object') return;
    this._idCounter = data._idCounter || 0;
    this.sessions = data.sessions || {};
    var entries = data.entries || {};
    for (var key in entries) {
      if (Object.prototype.hasOwnProperty.call(entries, key)) {
        var e = MemoryEntry.fromJSON(entries[key]);
        if (e) {
          this.entries[key] = e;
          this._indexEntry(e);
        }
      }
    }
  };

  DreamMemoryStore.prototype._indexEntry = function (e) {
    if (!this.byType[e.type]) this.byType[e.type] = {};
    this.byType[e.type][e.id] = true;
    if (!this.byLayer[e.layer]) this.byLayer[e.layer] = {};
    this.byLayer[e.layer][e.id] = true;
    var sid = e.metadata && e.metadata.sessionId;
    if (sid) {
      if (!this.bySession[sid]) this.bySession[sid] = {};
      this.bySession[sid][e.id] = true;
    }
  };

  DreamMemoryStore.prototype._unindexEntry = function (e) {
    if (this.byType[e.type]) delete this.byType[e.type][e.id];
    if (this.byLayer[e.layer]) delete this.byLayer[e.layer][e.id];
    var sid = e.metadata && e.metadata.sessionId;
    if (sid && this.bySession[sid]) delete this.bySession[sid][e.id];
  };

  DreamMemoryStore.prototype._generateId = function () {
    this._idCounter += 1;
    return 'mem_' + Date.now().toString(36) + '_' + this._idCounter;
  };

  DreamMemoryStore.prototype._persist = function () {
    if (!this.persistence || typeof this.persistence.setItem !== 'function') return;
    var snapshot = {
      _idCounter: this._idCounter,
      sessions: this.sessions,
      entries: {}
    };
    for (var k in this.entries) {
      if (Object.prototype.hasOwnProperty.call(this.entries, k)) {
        snapshot.entries[k] = this.entries[k].toJSON();
      }
    }
    try {
      this.persistence.setItem(this.namespace, JSON.stringify(snapshot));
    } catch (e) { /* quota exceeded, ignore */ }
  };

  // Save memory
  DreamMemoryStore.prototype.save = function (type, layer, content, metadata) {
    if (this.size() >= this.maxSize) {
      return { error: 'storage_full', success: false };
    }
    if (!type || typeof type !== 'string') {
      return { error: 'invalid_type', success: false };
    }
    if (!layer || typeof layer !== 'string') {
      return { error: 'invalid_layer', success: false };
    }
    var id = this._generateId();
    var entry = new MemoryEntry(id, type, layer, content, metadata);
    this.entries[id] = entry;
    this._indexEntry(entry);
    this._persist();
    return { success: true, id: id, entry: entry };
  };

  // Get by id (touches access metadata)
  DreamMemoryStore.prototype.get = function (id) {
    if (!id || typeof id !== 'string') return null;
    var e = this.entries[id];
    if (!e) return null;
    e.touch();
    return e.toJSON();
  };

  // Get raw entry without touching
  DreamMemoryStore.prototype.peek = function (id) {
    if (!id || typeof id !== 'string') return null;
    var e = this.entries[id];
    return e ? e.toJSON() : null;
  };

  // Delete memory
  DreamMemoryStore.prototype.delete = function (id) {
    if (!id || typeof id !== 'string') return { error: 'invalid_id', success: false };
    var e = this.entries[id];
    if (!e) return { error: 'not_found', success: false };
    this._unindexEntry(e);
    delete this.entries[id];
    this._persist();
    return { success: true };
  };

  // Total count
  DreamMemoryStore.prototype.size = function () {
    return Object.keys(this.entries).length;
  };

  // List by type
  DreamMemoryStore.prototype.listByType = function (type) {
    if (!type) return [];
    var ids = this.byType[type];
    if (!ids) return [];
    var out = [];
    for (var id in ids) {
      if (Object.prototype.hasOwnProperty.call(ids, id) && this.entries[id]) {
        out.push(this.entries[id].toJSON());
      }
    }
    return out;
  };

  // List by layer (L0-L4)
  DreamMemoryStore.prototype.listByLayer = function (layer) {
    if (!layer) return [];
    var ids = this.byLayer[layer];
    if (!ids) return [];
    var out = [];
    for (var id in ids) {
      if (Object.prototype.hasOwnProperty.call(ids, id) && this.entries[id]) {
        out.push(this.entries[id].toJSON());
      }
    }
    return out;
  };

  // List by session id
  DreamMemoryStore.prototype.listBySession = function (sessionId) {
    if (!sessionId) return [];
    var ids = this.bySession[sessionId];
    if (!ids) return [];
    var out = [];
    for (var id in ids) {
      if (Object.prototype.hasOwnProperty.call(ids, id) && this.entries[id]) {
        out.push(this.entries[id].toJSON());
      }
    }
    return out;
  };

  // Start a new session
  DreamMemoryStore.prototype.startSession = function (sessionId) {
    if (!sessionId || typeof sessionId !== 'string') return { error: 'invalid_session_id' };
    if (this.sessions[sessionId]) return { error: 'session_exists', session: this.sessions[sessionId] };
    this.sessions[sessionId] = { start: Date.now(), end: null, count: 0 };
    return { success: true, sessionId: sessionId };
  };

  // End a session
  DreamMemoryStore.prototype.endSession = function (sessionId) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'session_not_found' };
    if (s.end) return { error: 'session_already_ended', session: s };
    s.end = Date.now();
    var ids = this.bySession[sessionId] || {};
    s.count = Object.keys(ids).length;
    this._persist();
    return { success: true, session: s };
  };

  // Get session info
  DreamMemoryStore.prototype.getSession = function (sessionId) {
    if (!sessionId) return null;
    return this.sessions[sessionId] || null;
  };

  // List all sessions
  DreamMemoryStore.prototype.listSessions = function () {
    var out = [];
    for (var k in this.sessions) {
      if (Object.prototype.hasOwnProperty.call(this.sessions, k)) {
        out.push({ id: k, info: this.sessions[k] });
      }
    }
    return out;
  };

  // Get stats
  DreamMemoryStore.prototype.getStats = function () {
    var byType = {};
    for (var t in this.byType) {
      if (Object.prototype.hasOwnProperty.call(this.byType, t)) {
        byType[t] = Object.keys(this.byType[t]).length;
      }
    }
    var byLayer = {};
    for (var l in this.byLayer) {
      if (Object.prototype.hasOwnProperty.call(this.byLayer, l)) {
        byLayer[l] = Object.keys(this.byLayer[l]).length;
      }
    }
    return {
      total: this.size(),
      byType: byType,
      byLayer: byLayer,
      sessions: Object.keys(this.sessions).length,
      maxSize: this.maxSize
    };
  };

  // Clear all
  DreamMemoryStore.prototype.clear = function () {
    this.entries = {};
    this.byType = {};
    this.byLayer = {};
    this.bySession = {};
    this.sessions = {};
    this._idCounter = 0;
    this._persist();
    return { success: true };
  };

  // --------------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------------
  window.MEMORY_TYPE = MEMORY_TYPE;
  window.MEMORY_LAYER = MEMORY_LAYER;
  window.MemoryEntry = MemoryEntry;
  window.DreamMemoryStore = DreamMemoryStore;

})();