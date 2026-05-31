/**
 * Duel UI (Iteration 7/9)
 * Core: DuelUI
 * 
 * Features:
 * - Room list display
 * - Duel interface
 * - State synchronization
 */

class DuelUI {
  constructor(container = null) {
    this.container = container;
    this.state = {
      activeView: 'room_list',
      currentRoom: null,
      duelState: null,
      notifications: []
    };
    this.version = 'V255-Iter7';
  }

  /**
   * Render room list HTML
   * @param {Array} rooms - Rooms to display
   * @returns {string} HTML
   */
  renderRoomList(rooms) {
    if (!rooms || rooms.length === 0) {
      return '<div class="room-list-empty">No rooms available</div>';
    }

    const roomHtml = rooms.map(room => `
      <div class="room-item" data-room-id="${room.id}">
        <span class="room-name">${room.name}</span>
        <span class="room-host">${room.hostId}</span>
        <span class="room-status">${room.status}</span>
      </div>
    `).join('');

    return `<div class="room-list">${roomHtml}</div>`;
  }

  /**
   * Render duel interface HTML
   * @param {object} duelState - Current duel state
   * @returns {string} HTML
   */
  renderDuelInterface(duelState) {
    const p1 = duelState.player1Id;
    const p2 = duelState.player2Id;
    const turn = duelState.currentTurn;

    return `
      <div class="duel-interface">
        <div class="player player-1" data-player="${p1}">
          <span class="player-name">${p1}</span>
          <span class="player-life">${duelState.player1Life}</span>
          ${turn === p1 ? '<span class="turn-indicator">Your Turn</span>' : ''}
        </div>
        <div class="player player-2" data-player="${p2}">
          <span class="player-name">${p2}</span>
          <span class="player-life">${duelState.player2Life}</span>
          ${turn === p2 ? '<span class="turn-indicator">Your Turn</span>' : ''}
        </div>
        <div class="turn-info">Turn: ${duelState.turnNumber}</div>
      </div>
    `;
  }

  /**
   * Synchronize state with external data
   * @param {object} newState - State to merge
   */
  syncState(newState) {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Render waiting room HTML
   * @param {object} room - Room data
   * @returns {string} HTML
   */
  renderWaitingRoom(room) {
    const playersHtml = room.players.map(p => 
      `<span class="player-slot">${p}</span>`
    ).join('');

    return `
      <div class="waiting-room" data-room-id="${room.id}">
        <h2 class="room-title">${room.name}</h2>
        <div class="players">${playersHtml}</div>
        <div class="room-actions">
          <button class="btn-ready">Ready</button>
          <button class="btn-leave">Leave</button>
        </div>
      </div>
    `;
  }

  /**
   * Show a notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @returns {object} Notification object
   */
  showNotification(message, type = 'info') {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: Date.now()
    };
    this.state.notifications.push(notification);
    return notification;
  }

  /**
   * Update room status in state
   * @param {string} roomId - Room ID
   * @param {string} status - New status
   */
  updateRoomStatus(roomId, status) {
    if (this.state.currentRoom && this.state.currentRoom.id === roomId) {
      this.state.currentRoom.status = status;
    }
  }

  /**
   * Clear duel interface
   */
  clearDuelInterface() {
    this.state.currentRoom = null;
    this.state.duelState = null;
    this.state.activeView = 'room_list';
  }

  /**
   * Format life points display
   * @param {number} life - Life points
   * @returns {string} Formatted display
   */
  formatLifePoints(life) {
    const lowWarning = life <= 25 ? ' low-life' : '';
    return `<span class="life-points${lowWarning}">${life}</span>`;
  }

  /**
   * Get current state
   * @returns {object} Current state
   */
  getState() {
    return { ...this.state };
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DuelUI };
} else if (typeof window !== 'undefined') {
  window.DuelUI = DuelUI;
}