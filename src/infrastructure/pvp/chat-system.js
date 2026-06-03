// ============================================================================
// PvP Co-op — V289 Direction D Iteration 8/9
// ChatSystem: 游戏内聊天 (频道/快捷语/表情/系统消息/历史)
// 来源：thunderbolt PowerSync + chatdev Multi-Agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var CHANNEL_TYPE = {
    GLOBAL: 'global',
    TEAM: 'team',
    WHISPER: 'whisper',
    SYSTEM: 'system',
    TRADE: 'trade'
  };

  function ChatSystem(options) {
    options = options || {};
    this.channels = {};
    this.maxMessages = options.maxMessages || 200;
    this.muted = {};  // playerId -> expires
    this.banned = {};
    this.metrics = {
      messages: 0,
      emotes: 0,
      system: 0,
      blocked: 0
    };
  }

  ChatSystem.prototype.createChannel = function (channelId, options) {
    options = options || {};
    if (this.channels[channelId]) return { error: 'exists' };
    this.channels[channelId] = {
      channelId: channelId,
      type: options.type || CHANNEL_TYPE.GLOBAL,
      name: options.name || channelId,
      members: options.members || [],
      messages: [],
      password: options.password || null,
      createdAt: Date.now()
    };
    return { success: true };
  };

  ChatSystem.prototype.deleteChannel = function (channelId) {
    if (!this.channels[channelId]) return { error: 'not_found' };
    delete this.channels[channelId];
    return { success: true };
  };

  ChatSystem.prototype.joinChannel = function (channelId, playerId, options) {
    var c = this.channels[channelId];
    if (!c) return { error: 'not_found' };
    if (c.members.indexOf(playerId) !== -1) return { error: 'already_member' };
    if (c.password && (!options || options.password !== c.password)) return { error: 'password_required' };
    c.members.push(playerId);
    return { success: true };
  };

  ChatSystem.prototype.leaveChannel = function (channelId, playerId) {
    var c = this.channels[channelId];
    if (!c) return { error: 'not_found' };
    var idx = c.members.indexOf(playerId);
    if (idx === -1) return { error: 'not_member' };
    c.members.splice(idx, 1);
    return { success: true };
  };

  ChatSystem.prototype.send = function (channelId, playerId, message, options) {
    var c = this.channels[channelId];
    if (!c) return { error: 'not_found' };
    if (this.banned[playerId]) return { error: 'banned' };
    if (this.muted[playerId] && this.muted[playerId] > Date.now()) return { error: 'muted' };
    if (typeof message !== 'string' || message.length === 0) return { error: 'invalid_message' };
    if (message.length >= 500) return { error: 'message_too_long' };
    // simple profanity filter (placeholder)
    if (/\bbadword\b/i.test(message)) {
      this.metrics.blocked++;
      return { error: 'profanity' };
    }
    var entry = {
      type: 'user',
      playerId: playerId,
      message: message,
      ts: Date.now(),
      isEmote: (options && options.emote) || false,
      isWhisper: c.type === CHANNEL_TYPE.WHISPER
    };
    c.messages.push(entry);
    if (c.messages.length > this.maxMessages) c.messages = c.messages.slice(-this.maxMessages);
    if (entry.isEmote) this.metrics.emotes++;
    else this.metrics.messages++;
    return { success: true, entry: entry };
  };

  ChatSystem.prototype.emote = function (channelId, playerId, emote) {
    return this.send(channelId, playerId, '*' + emote + '*', { emote: true });
  };

  ChatSystem.prototype.system = function (channelId, message) {
    var c = this.channels[channelId];
    if (!c) return { error: 'not_found' };
    var entry = { type: 'system', message: message, ts: Date.now() };
    c.messages.push(entry);
    if (c.messages.length > this.maxMessages) c.messages = c.messages.slice(-this.maxMessages);
    this.metrics.system++;
    return { success: true };
  };

  ChatSystem.prototype.whisper = function (fromPlayerId, toPlayerId, message) {
    var channelId = 'whisper_' + [fromPlayerId, toPlayerId].sort().join('_');
    if (!this.channels[channelId]) {
      this.createChannel(channelId, { type: CHANNEL_TYPE.WHISPER, name: 'Whisper', members: [fromPlayerId, toPlayerId] });
    }
    return this.send(channelId, fromPlayerId, message);
  };

  ChatSystem.prototype.mute = function (playerId, durationMs) {
    this.muted[playerId] = Date.now() + (durationMs || 60000);
    return { success: true };
  };

  ChatSystem.prototype.unmute = function (playerId) {
    delete this.muted[playerId];
    return { success: true };
  };

  ChatSystem.prototype.ban = function (playerId) {
    this.banned[playerId] = true;
    return { success: true };
  };

  ChatSystem.prototype.unban = function (playerId) {
    delete this.banned[playerId];
    return { success: true };
  };

  ChatSystem.prototype.getHistory = function (channelId, limit) {
    var c = this.channels[channelId];
    if (!c) return null;
    if (typeof limit === 'number' && limit > 0) return c.messages.slice(-limit);
    return c.messages.slice();
  };

  ChatSystem.prototype.getChannels = function (playerId) {
    var arr = [];
    for (var k in this.channels) {
      if (Object.prototype.hasOwnProperty.call(this.channels, k)) {
        var c = this.channels[k];
        if (playerId && c.members.length > 0 && c.members.indexOf(playerId) === -1) continue;
        arr.push({ channelId: c.channelId, type: c.type, name: c.name, members: c.members.length, messageCount: c.messages.length });
      }
    }
    return arr;
  };

  ChatSystem.prototype.isMuted = function (playerId) {
    return !!(this.muted[playerId] && this.muted[playerId] > Date.now());
  };

  ChatSystem.prototype.isBanned = function (playerId) {
    return !!this.banned[playerId];
  };

  ChatSystem.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  ChatSystem.prototype.getSummary = function () {
    return {
      totalChannels: Object.keys(this.channels).length,
      totalMuted: Object.keys(this.muted).length,
      totalBanned: Object.keys(this.banned).length,
      metrics: this.metrics
    };
  };

  ChatSystem.prototype.clear = function () {
    this.channels = {};
    this.muted = {};
    this.banned = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.ChatSystem = ChatSystem;
    window.CHANNEL_TYPE = CHANNEL_TYPE;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChatSystem: ChatSystem, CHANNEL_TYPE: CHANNEL_TYPE };
  }
})();
