// ============================================================================
// PvP Co-op — V282 Direction D Iteration 1/9
// MatchRoom: 比赛房间 (create/join/leave/configure/lifecycle)
// 来源：thunderbolt PowerSync + chatdev Multi-Agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var ROOM_STATUS = {
    WAITING: 'waiting',
    STARTING: 'starting',
    IN_PROGRESS: 'in_progress',
    FINISHED: 'finished',
    CLOSED: 'closed'
  };

  var ROOM_TYPE = {
    PVP: 'pvp',
    COOP: 'coop',
    CASUAL: 'casual',
    RANKED: 'ranked',
    TOURNAMENT: 'tournament'
  };

  function MatchRoom(options) {
    options = options || {};
    this.rooms = {};
    this.maxRooms = options.maxRooms || 1000;
    this.maxPlayersPerRoom = options.maxPlayersPerRoom || 8;
    this.roomCounter = 0;
    this.metrics = {
      created: 0,
      joined: 0,
      left: 0,
      started: 0,
      finished: 0,
      closed: 0
    };
  }

  MatchRoom.prototype.create = function (config) {
    config = config || {};
    if (Object.keys(this.rooms).length >= this.maxRooms) return { error: 'max_rooms_reached' };
    var roomId = 'r_' + (++this.roomCounter) + '_' + Date.now();
    var room = {
      roomId: roomId,
      name: config.name || ('Room ' + this.roomCounter),
      type: config.type || ROOM_TYPE.CASUAL,
      status: ROOM_STATUS.WAITING,
      maxPlayers: config.maxPlayers || this.maxPlayersPerRoom,
      players: [],
      spectators: [],
      config: config.config || {},
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
      host: null,
      password: config.password || null
    };
    this.rooms[roomId] = room;
    this.metrics.created++;
    // auto-join host
    if (config.hostId) {
      this.join(roomId, config.hostId, { asHost: true });
    }
    return { success: true, roomId: roomId, room: room };
  };

  MatchRoom.prototype._findPlayerIndex = function (room, playerId) {
    for (var i = 0; i < room.players.length; i++) {
      if (room.players[i].playerId === playerId) return i;
    }
    return -1;
  };

  MatchRoom.prototype.join = function (roomId, playerId, options) {
    options = options || {};
    var room = this.rooms[roomId];
    if (!room) return { error: 'not_found' };
    if (room.status === ROOM_STATUS.CLOSED) return { error: 'room_closed' };
    if (room.status === ROOM_STATUS.FINISHED) return { error: 'room_finished' };
    if (room.status === ROOM_STATUS.IN_PROGRESS && !options.spectate) return { error: 'in_progress' };
    if (options.password && room.password !== options.password) return { error: 'wrong_password' };
    if (room.password && !options.password) return { error: 'password_required' };
    if (this._findPlayerIndex(room, playerId) !== -1) return { error: 'already_joined' };
    if (room.players.length >= room.maxPlayers && !options.spectate) return { error: 'room_full' };
    if (options.spectate) {
      room.spectators.push({ playerId: playerId, joinedAt: Date.now() });
    } else {
      var entry = {
        playerId: playerId,
        joinedAt: Date.now(),
        isHost: options.asHost || false,
        ready: false,
        team: options.team || null,
        metadata: options.metadata || {}
      };
      room.players.push(entry);
      if (options.asHost || !room.host) {
        room.host = playerId;
        entry.isHost = true;
      }
    }
    this.metrics.joined++;
    return { success: true, role: options.spectate ? 'spectator' : 'player' };
  };

  MatchRoom.prototype.leave = function (roomId, playerId) {
    var room = this.rooms[roomId];
    if (!room) return { error: 'not_found' };
    var idx = this._findPlayerIndex(room, playerId);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      this.metrics.left++;
      // if host left, assign new host
      if (room.host === playerId) {
        room.host = room.players.length > 0 ? room.players[0].playerId : null;
      }
      return { success: true };
    }
    // check spectators
    for (var i = 0; i < room.spectators.length; i++) {
      if (room.spectators[i].playerId === playerId) {
        room.spectators.splice(i, 1);
        this.metrics.left++;
        return { success: true, role: 'spectator' };
      }
    }
    return { error: 'not_in_room' };
  };

  MatchRoom.prototype.setReady = function (roomId, playerId, ready) {
    var room = this.rooms[roomId];
    if (!room) return { error: 'not_found' };
    var idx = this._findPlayerIndex(room, playerId);
    if (idx === -1) return { error: 'not_in_room' };
    room.players[idx].ready = ready !== false;
    return { success: true, ready: room.players[idx].ready };
  };

  MatchRoom.prototype.kick = function (roomId, hostId, targetId) {
    var room = this.rooms[roomId];
    if (!room) return { error: 'not_found' };
    if (room.host !== hostId) return { error: 'not_host' };
    return this.leave(roomId, targetId);
  };

  MatchRoom.prototype.transferHost = function (roomId, currentHostId, newHostId) {
    var room = this.rooms[roomId];
    if (!room) return { error: 'not_found' };
    if (room.host !== currentHostId) return { error: 'not_host' };
    var idx = this._findPlayerIndex(room, newHostId);
    if (idx === -1) return { error: 'not_in_room' };
    var oldHostIdx = this._findPlayerIndex(room, currentHostId);
    if (oldHostIdx !== -1) room.players[oldHostIdx].isHost = false;
    room.players[idx].isHost = true;
    room.host = newHostId;
    return { success: true };
  };

  MatchRoom.prototype.start = function (roomId, hostId) {
    var room = this.rooms[roomId];
    if (!room) return { error: 'not_found' };
    if (room.host !== hostId) return { error: 'not_host' };
    if (room.status !== ROOM_STATUS.WAITING && room.status !== ROOM_STATUS.STARTING) {
      return { error: 'invalid_state', current: room.status };
    }
    if (room.players.length < 1) return { error: 'no_players' };
    // check all ready (optional)
    for (var i = 0; i < room.players.length; i++) {
      if (!room.players[i].ready) {
        // allow anyway but record
        break;
      }
    }
    room.status = ROOM_STATUS.IN_PROGRESS;
    room.startedAt = Date.now();
    this.metrics.started++;
    return { success: true };
  };

  MatchRoom.prototype.finish = function (roomId, results) {
    var room = this.rooms[roomId];
    if (!room) return { error: 'not_found' };
    if (room.status !== ROOM_STATUS.IN_PROGRESS) return { error: 'invalid_state' };
    room.status = ROOM_STATUS.FINISHED;
    room.finishedAt = Date.now();
    room.results = results || null;
    this.metrics.finished++;
    return { success: true };
  };

  MatchRoom.prototype.close = function (roomId) {
    var room = this.rooms[roomId];
    if (!room) return { error: 'not_found' };
    room.status = ROOM_STATUS.CLOSED;
    this.metrics.closed++;
    return { success: true };
  };

  MatchRoom.prototype.getRoom = function (roomId) {
    return this.rooms[roomId] || null;
  };

  MatchRoom.prototype.listRooms = function (filter) {
    var arr = [];
    for (var k in this.rooms) {
      if (Object.prototype.hasOwnProperty.call(this.rooms, k)) {
        var r = this.rooms[k];
        if (filter) {
          if (filter.status && r.status !== filter.status) continue;
          if (filter.type && r.type !== filter.type) continue;
          if (filter.hasSpace && r.players.length >= r.maxPlayers) continue;
        }
        arr.push(r);
      }
    }
    return arr;
  };

  MatchRoom.prototype.listOpenRooms = function () {
    return this.listRooms({ status: ROOM_STATUS.WAITING, hasSpace: true });
  };

  MatchRoom.prototype.getPlayerRoom = function (playerId) {
    for (var k in this.rooms) {
      if (Object.prototype.hasOwnProperty.call(this.rooms, k)) {
        var r = this.rooms[k];
        var idx = this._findPlayerIndex(r, playerId);
        if (idx !== -1) return r;
        for (var i = 0; i < r.spectators.length; i++) {
          if (r.spectators[i].playerId === playerId) return r;
        }
      }
    }
    return null;
  };

  MatchRoom.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  MatchRoom.prototype.getSummary = function () {
    var dist = {};
    for (var k in this.rooms) {
      if (Object.prototype.hasOwnProperty.call(this.rooms, k)) {
        var s = this.rooms[k].status;
        dist[s] = (dist[s] || 0) + 1;
      }
    }
    return {
      totalRooms: Object.keys(this.rooms).length,
      statusDistribution: dist,
      metrics: this.metrics
    };
  };

  MatchRoom.prototype.clear = function () {
    this.rooms = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.MatchRoom = MatchRoom;
    window.ROOM_STATUS = ROOM_STATUS;
    window.ROOM_TYPE = ROOM_TYPE;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MatchRoom: MatchRoom, ROOM_STATUS: ROOM_STATUS, ROOM_TYPE: ROOM_TYPE };
  }
})();
