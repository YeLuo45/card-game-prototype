// ============================================================================
// Federated Strategy Cloud — V260 Direction A Iteration 6/9
// PrivacyManager: 隐私控制 (匿名化/局部/全量 三档共享 + 字段级控制)
// 来源：thunderbolt PowerSync + generic-agent L0-L4 + chatdev Multi-Agent
// ============================================================================
'use strict';

(function () {

  var PRIVACY_LEVELS = {
    ANONYMOUS: 'anonymous',  // 只共享统计数据，无身份
    LOCAL: 'local',         // 只在本地存储，不上云
    FULL: 'full'            // 完整共享
  };

  var DATA_CATEGORIES = {
    IDENTITY: 'identity',     // 玩家名/ID
    STATS: 'stats',           // 胜率/段位
    DECKS: 'decks',           // 牌组内容
    MATCHES: 'matches',       // 比赛历史
    COMBOS: 'combos',         // combo 习惯
    PROGRESS: 'progress',     // 进度/成就
    ANALYTICS: 'analytics'    // 使用分析
  };

  // Default privacy per category
  var DEFAULT_PRIVACY = {};
  DEFAULT_PRIVACY[DATA_CATEGORIES.IDENTITY] = PRIVACY_LEVELS.ANONYMOUS;
  DEFAULT_PRIVACY[DATA_CATEGORIES.STATS] = PRIVACY_LEVELS.FULL;
  DEFAULT_PRIVACY[DATA_CATEGORIES.DECKS] = PRIVACY_LEVELS.LOCAL;
  DEFAULT_PRIVACY[DATA_CATEGORIES.MATCHES] = PRIVACY_LEVELS.LOCAL;
  DEFAULT_PRIVACY[DATA_CATEGORIES.COMBOS] = PRIVACY_LEVELS.FULL;
  DEFAULT_PRIVACY[DATA_CATEGORIES.PROGRESS] = PRIVACY_LEVELS.FULL;
  DEFAULT_PRIVACY[DATA_CATEGORIES.ANALYTICS] = PRIVACY_LEVELS.FULL;

  function PrivacyManager(syncManager, options) {
    options = options || {};
    this.sync = syncManager || null;
    this.storageKey = options.storageKey || 'privacy_settings';
    this.consentKey = options.consentKey || 'privacy_consent';
    this.playerId = options.playerId || ((syncManager && syncManager.deviceId) || 'unknown');
    this.settings = {};
    for (var k in DEFAULT_PRIVACY) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_PRIVACY, k)) {
        this.settings[k] = DEFAULT_PRIVACY[k];
      }
    }
    this.consentGiven = false;
    this.consentTimestamp = null;
    this.auditLog = [];
    this.consentVersion = '1.0.0';
    if (this.sync) {
      this._loadFromSync();
    }
  }

  PrivacyManager.prototype._loadFromSync = function () {
    if (!this.sync) return;
    var stored = this.sync.localStore.get(this.storageKey);
    if (stored && stored.value) {
      if (stored.value.settings) this.settings = stored.value.settings;
      if (stored.value.consentGiven !== undefined) this.consentGiven = stored.value.consentGiven;
      if (stored.value.consentTimestamp !== undefined) this.consentTimestamp = stored.value.consentTimestamp;
      if (stored.value.auditLog) this.auditLog = stored.value.auditLog;
    }
  };

  PrivacyManager.prototype._saveToSync = function () {
    if (!this.sync) return { success: false, reason: 'no_sync' };
    return this.sync.localStore.set(this.storageKey, {
      settings: this.settings,
      consentGiven: this.consentGiven,
      consentTimestamp: this.consentTimestamp,
      auditLog: this.auditLog
    }, { type: 'privacy' });
  };

  PrivacyManager.prototype._audit = function (action, details) {
    this.auditLog.push({ ts: Date.now(), action: action, details: details || {} });
    if (this.auditLog.length > 200) this.auditLog = this.auditLog.slice(-200);
  };

  PrivacyManager.prototype.giveConsent = function () {
    this.consentGiven = true;
    this.consentTimestamp = Date.now();
    this._audit('consent_given', { playerId: this.playerId });
    this._saveToSync();
    return { success: true, consentTimestamp: this.consentTimestamp, version: this.consentVersion };
  };

  PrivacyManager.prototype.revokeConsent = function () {
    this.consentGiven = false;
    this.consentTimestamp = null;
    for (var k in this.settings) {
      if (Object.prototype.hasOwnProperty.call(this.settings, k)) {
        this.settings[k] = PRIVACY_LEVELS.LOCAL;
      }
    }
    this._audit('consent_revoked', { playerId: this.playerId });
    this._saveToSync();
    return { success: true };
  };

  PrivacyManager.prototype.hasConsent = function () {
    return this.consentGiven === true;
  };

  PrivacyManager.prototype.setPrivacyLevel = function (category, level) {
    var validCats = Object.keys(DATA_CATEGORIES).map(function (k) { return DATA_CATEGORIES[k]; });
    if (validCats.indexOf(category) === -1) return { error: 'invalid_category' };
    var validLevels = Object.keys(PRIVACY_LEVELS).map(function (k) { return PRIVACY_LEVELS[k]; });
    if (validLevels.indexOf(level) === -1) return { error: 'invalid_level' };
    var oldLevel = this.settings[category];
    this.settings[category] = level;
    this._audit('privacy_changed', { category: category, from: oldLevel, to: level });
    this._saveToSync();
    return { success: true, category: category, level: level, previous: oldLevel };
  };

  PrivacyManager.prototype.getPrivacyLevel = function (category) {
    if (!this.settings[category]) return null;
    return this.settings[category];
  };

  PrivacyManager.prototype.getAllSettings = function () {
    var copy = {};
    for (var k in this.settings) {
      if (Object.prototype.hasOwnProperty.call(this.settings, k)) {
        copy[k] = this.settings[k];
      }
    }
    return copy;
  };

  PrivacyManager.prototype.resetToDefaults = function () {
    var oldSettings = JSON.parse(JSON.stringify(this.settings));
    this.settings = {};
    for (var k in DEFAULT_PRIVACY) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_PRIVACY, k)) {
        this.settings[k] = DEFAULT_PRIVACY[k];
      }
    }
    this._audit('reset_defaults', { previous: oldSettings });
    this._saveToSync();
    return { success: true, settings: this.settings };
  };

  PrivacyManager.prototype.canShare = function (category) {
    if (!this.consentGiven) return false;
    var level = this.settings[category];
    return level === PRIVACY_LEVELS.FULL;
  };

  PrivacyManager.prototype.canShareAnonymously = function (category) {
    if (!this.consentGiven) return false;
    var level = this.settings[category];
    return level === PRIVACY_LEVELS.ANONYMOUS || level === PRIVACY_LEVELS.FULL;
  };

  PrivacyManager.prototype.redactForCloud = function (data, category) {
    if (!data || typeof data !== 'object') return { redacted: false, reason: 'invalid_data' };
    var level = this.settings[category];
    if (!level) return { redacted: false, reason: 'unknown_category' };
    if (level === PRIVACY_LEVELS.LOCAL) return { redacted: true, level: 'local', data: null };
    if (level === PRIVACY_LEVELS.ANONYMOUS) {
      var copy = JSON.parse(JSON.stringify(data));
      if (category === DATA_CATEGORIES.IDENTITY) {
        copy.playerId = this._hash(copy.playerId || '');
        copy.playerName = 'anon_' + (copy.playerId || '').slice(0, 4);
      } else if (category === DATA_CATEGORIES.STATS) {
        copy.playerId = this._hash(copy.playerId || '');
        if (copy.playerName) copy.playerName = 'anon_' + (copy.playerId || '').slice(0, 4);
      } else if (category === DATA_CATEGORIES.DECKS || category === DATA_CATEGORIES.MATCHES) {
        if (copy.playerId) copy.playerId = this._hash(copy.playerId);
        if (copy.playerName) copy.playerName = 'anon';
      }
      return { redacted: true, level: 'anonymous', data: copy };
    }
    if (level === PRIVACY_LEVELS.FULL) {
      return { redacted: false, level: 'full', data: JSON.parse(JSON.stringify(data)) };
    }
    return { redacted: true, level: 'unknown', data: null };
  };

  PrivacyManager.prototype._hash = function (str) {
    if (typeof str !== 'string') str = String(str);
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'h' + Math.abs(hash).toString(36);
  };

  PrivacyManager.prototype.batchRedact = function (dataByCategory) {
    if (!dataByCategory || typeof dataByCategory !== 'object') return { error: 'invalid_input' };
    var results = {};
    for (var cat in dataByCategory) {
      if (Object.prototype.hasOwnProperty.call(dataByCategory, cat)) {
        results[cat] = this.redactForCloud(dataByCategory[cat], cat);
      }
    }
    return { success: true, results: results };
  };

  PrivacyManager.prototype.shouldUpload = function (category) {
    if (!this.consentGiven) return false;
    var level = this.settings[category];
    return level === PRIVACY_LEVELS.FULL || level === PRIVACY_LEVELS.ANONYMOUS;
  };

  PrivacyManager.prototype.getUploadableData = function (dataByCategory) {
    var result = {};
    for (var cat in dataByCategory) {
      if (Object.prototype.hasOwnProperty.call(dataByCategory, cat)) {
        if (this.shouldUpload(cat)) {
          var r = this.redactForCloud(dataByCategory[cat], cat);
          if (r.data) result[cat] = r.data;
        }
      }
    }
    return result;
  };

  PrivacyManager.prototype.publishToCloud = function (dataByCategory) {
    if (!this.sync) return { error: 'no_sync' };
    if (!this.consentGiven) return { error: 'no_consent' };
    var uploadable = this.getUploadableData(dataByCategory);
    if (Object.keys(uploadable).length === 0) return { success: true, uploaded: 0, data: {} };
    var r = this.sync.backup(this.storageKey + '_data', { playerIdHash: this._hash(this.playerId), categories: uploadable, ts: Date.now() }, { type: 'privacy_data' });
    if (r.success) {
      this._audit('publish', { categories: Object.keys(uploadable) });
      this._saveToSync();
    }
    return r;
  };

  PrivacyManager.prototype.getAuditLog = function (limit) {
    if (typeof limit === 'number' && limit > 0) {
      return this.auditLog.slice(-limit);
    }
    return this.auditLog.slice();
  };

  PrivacyManager.prototype.exportSettings = function () {
    return JSON.stringify({
      format: 'privacy-settings-v1',
      exportedAt: Date.now(),
      playerId: this._hash(this.playerId),
      settings: this.settings,
      consentGiven: this.consentGiven,
      consentTimestamp: this.consentTimestamp
    });
  };

  PrivacyManager.prototype.importSettings = function (jsonString) {
    if (typeof jsonString !== 'string') return { error: 'invalid_input' };
    try {
      var parsed = JSON.parse(jsonString);
      if (parsed.format !== 'privacy-settings-v1') return { error: 'unknown_format' };
      this.settings = parsed.settings || {};
      this.consentGiven = parsed.consentGiven === true;
      this.consentTimestamp = parsed.consentTimestamp || null;
      this._saveToSync();
      return { success: true };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  PrivacyManager.prototype.getSummary = function () {
    var counts = { full: 0, local: 0, anonymous: 0 };
    for (var k in this.settings) {
      if (Object.prototype.hasOwnProperty.call(this.settings, k) && counts[this.settings[k]] !== undefined) {
        counts[this.settings[k]]++;
      }
    }
    return {
      playerId: this.playerId,
      consentGiven: this.consentGiven,
      consentTimestamp: this.consentTimestamp,
      levelCounts: counts,
      totalCategories: Object.keys(this.settings).length,
      auditLogSize: this.auditLog.length
    };
  };

  PrivacyManager.prototype.clear = function () {
    this.settings = {};
    for (var k in DEFAULT_PRIVACY) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_PRIVACY, k)) {
        this.settings[k] = DEFAULT_PRIVACY[k];
      }
    }
    this.auditLog = [];
    this.consentGiven = false;
    this.consentTimestamp = null;
    this._saveToSync();
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.PrivacyManager = PrivacyManager;
    window.PRIVACY_LEVELS = PRIVACY_LEVELS;
    window.PRIVACY_DATA_CATEGORIES = DATA_CATEGORIES;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PrivacyManager: PrivacyManager, PRIVACY_LEVELS: PRIVACY_LEVELS, PRIVACY_DATA_CATEGORIES: DATA_CATEGORIES };
  }
})();
