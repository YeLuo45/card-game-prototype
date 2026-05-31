/**
 * Duel Room Manager (Iteration 7/9)
 * Core: DuelRoomManager
 * 
 * Features:
 * - Create/join duel rooms
 * - Room state management (waiting/matching/in_progress/ended)
 * - Player ready status tracking
 */

class DuelRoomManager {
  constructor(options = {}) {
    this.rooms = new Map();
    this.maxRooms = options.maxRooms || 100;
    this.version = 'V255-Iter7';
  }

  /**
   * Create a new duel room
   * @param {object} config - Room configuration
   * @returns {object} Created room
   */
  createRoom(config = {}) {
    const roomId = this._generateRoomId();
    const room = {
      id: roomId,
      name: config.name || `Room ${roomId}`,
      hostId: config.hostId,
      players: [config.hostId],
      status: 'waiting',
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
      readyStatus: {},
      settings: config.settings || {}
    };

    if (typeof room.setReady !== 'function') {
      room.setReady = (playerId, ready) => {
        room.readyStatus[playerId] = ready;
      };
    }

    if (typeof room.areAllReady !== 'function') {
      room.areAllReady = () => {
        return room.players.every(p => room.readyStatus[p] === true);
      };
    }

    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * Join an existing room
   * @param {string} roomId - Room ID
   * @param {object} player - Player data
   * @returns {boolean} Success
   */
  joinRoom(roomId, player) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.players.includes(player.playerId)) {
      return false;
    }

    if (room.status !== 'waiting') {
      return false;
    }

    room.players.push(player.playerId);
    room.status = 'matching';
    return true;
  }

  /**
   * Leave a room
   * @param {string} roomId - Room ID
   * @param {string} playerId - Player ID
   */
  leaveRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const index = room.players.indexOf(playerId);
    if (index > -1) {
      room.players.splice(index, 1);
    }

    delete room.readyStatus[playerId];

    if (playerId === room.hostId || room.players.length === 0) {
      this.rooms.delete(roomId);
      return;
    }

    if (room.status === 'matching') {
      room.status = 'waiting';
    }
  }

  /**
   * Get room by ID
   * @param {string} roomId - Room ID
   * @returns {object|null} Room
   */
  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * List available rooms
   * @returns {Array} Available rooms
   */
  listAvailableRooms() {
    return Array.from(this.rooms.values())
      .filter(r => r.status === 'waiting');
  }

  /**
   * Delete a room
   * @param {string} roomId - Room ID
   */
  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }

  /**
   * Generate unique room ID
   * @returns {string} Room ID
   */
  _generateRoomId() {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DuelRoomManager };
} else if (typeof window !== 'undefined') {
  window.DuelRoomManager = DuelRoomManager;
}