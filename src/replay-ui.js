/**
 * Replay UI Controller (Iteration 1/9)
 * Core: ReplayUI
 * 
 * Features:
 * - Playback controls: play/pause/fast-forward/rewind
 * - Key turn navigation
 * - Tactical analysis panel
 */

class ReplayUI {
  constructor(options = {}) {
    this.playbackSpeed = options.playbackSpeed || 1;
    this.autoAdvance = options.autoAdvance || false;
    this.currentTurn = 0;
    this.isPlaying = false;
    this.keyTurns = [];
    this.eventListeners = new Map();
    this.panelVisible = false;
    this.containerId = options.containerId || 'replay-ui-container';
  }

  /**
   * Initialize replay UI
   * @param {HTMLElement|string} container - Container element or ID
   */
  init(container) {
    const containerEl = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    
    if (!containerEl) {
      return false;
    }

    this.container = containerEl;
    this._setupDefaultUI();
    this._attachEventListeners();
    
    return true;
  }

  /**
   * Play replay
   */
  play() {
    this.isPlaying = true;
    this._emit('play', { currentTurn: this.currentTurn });
  }

  /**
   * Pause replay
   */
  pause() {
    this.isPlaying = false;
    this._emit('pause', { currentTurn: this.currentTurn });
  }

  /**
   * Toggle play/pause
   */
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Fast forward
   * @param {number} speed - Speed multiplier
   */
  fastForward(speed = 2) {
    this.playbackSpeed = speed;
    this._emit('fastForward', { speed, currentTurn: this.currentTurn });
  }

  /**
   * Rewind
   * @param {number} turns - Number of turns to rewind
   */
  rewind(turns = 1) {
    this.currentTurn = Math.max(0, this.currentTurn - turns);
    this._emit('rewind', { turns, currentTurn: this.currentTurn });
  }

  /**
   * Jump to specific turn
   * @param {number} turn - Turn number to jump to
   */
  jumpToTurn(turn) {
    this.currentTurn = turn;
    this._emit('jumpToTurn', { turn });
  }

  /**
   * Jump to key turn
   * @param {number} index - Index of key turn (0-based)
   */
  jumpToKeyTurn(index) {
    if (index >= 0 && index < this.keyTurns.length) {
      this.jumpToTurn(this.keyTurns[index]);
    }
  }

  /**
   * Next turn
   */
  nextTurn() {
    this.currentTurn++;
    this._emit('nextTurn', { currentTurn: this.currentTurn });
  }

  /**
   * Previous turn
   */
  previousTurn() {
    this.currentTurn = Math.max(0, this.currentTurn - 1);
    this._emit('previousTurn', { currentTurn: this.currentTurn });
  }

  /**
   * Set key turns for navigation
   * @param {Array} keyTurns - Array of key turn numbers
   */
  setKeyTurns(keyTurns) {
    this.keyTurns = keyTurns || [];
    this._emit('keyTurnsChanged', { keyTurns: this.keyTurns });
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Show analysis panel
   * @param {object} analysisData - Analysis data to display
   */
  showAnalysisPanel(analysisData) {
    this.panelVisible = true;
    this._emit('showAnalysis', { data: analysisData });
  }

  /**
   * Hide analysis panel
   */
  hideAnalysisPanel() {
    this.panelVisible = false;
    this._emit('hideAnalysis');
  }

  /**
   * Update progress
   * @param {number} currentTurn - Current turn
   * @param {number} totalTurns - Total turns
   */
  updateProgress(currentTurn, totalTurns) {
    this.currentTurn = currentTurn;
    this._emit('progressUpdate', { currentTurn, totalTurns });
  }

  /**
   * Reset UI state
   */
  reset() {
    this.currentTurn = 0;
    this.isPlaying = false;
    this.playbackSpeed = 1;
    this._emit('reset');
  }

  /**
   * Clean up UI
   */
  destroy() {
    this.eventListeners.clear();
    if (this.container && this.container.innerHTML) {
      // Don't remove container content, just clean up references
    }
    this.container = null;
  }

  // ========== Private Methods ==========

  _setupDefaultUI() {
    if (!this.container) return;

    // Create default UI structure
    this.container.innerHTML = `
      <div class="replay-controls">
        <button class="replay-btn rewind-btn" title="Rewind">⏮</button>
        <button class="replay-btn play-btn" title="Play/Pause">▶</button>
        <button class="replay-btn ff-btn" title="Fast Forward">⏭</button>
        <div class="replay-progress">
          <span class="current-turn">Turn 0</span>
          <span class="separator">/</span>
          <span class="total-turns">0</span>
        </div>
        <div class="replay-speed">${this.playbackSpeed}x</div>
        <button class="replay-btn analysis-btn" title="Analysis">📊</button>
      </div>
      <div class="replay-keyturns"></div>
      <div class="replay-analysis-panel" style="display: none;"></div>
    `;
  }

  _attachEventListeners() {
    if (!this.container) return;

    // Play/Pause button
    const playBtn = this.container.querySelector('.play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlayPause());
    }

    // Rewind button
    const rewindBtn = this.container.querySelector('.rewind-btn');
    if (rewindBtn) {
      rewindBtn.addEventListener('click', () => this.rewind());
    }

    // Fast forward button
    const ffBtn = this.container.querySelector('.ff-btn');
    if (ffBtn) {
      ffBtn.addEventListener('click', () => this.fastForward());
    }

    // Analysis button
    const analysisBtn = this.container.querySelector('.analysis-btn');
    if (analysisBtn) {
      analysisBtn.addEventListener('click', () => {
        if (this.panelVisible) {
          this.hideAnalysisPanel();
        } else {
          this.showAnalysisPanel({});
        }
      });
    }

    // Keyboard shortcuts
    this._setupKeyboardShortcuts();
  }

  _setupKeyboardShortcuts() {
    // These would attach to document if running in browser context
    this._emit('shortcutsReady');
  }

  _emit(event, data = {}) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (e) {
          console.warn(`ReplayUI event handler error: ${e}`);
        }
      }
    }
  }

  _updateTurnDisplay(currentTurn, totalTurns) {
    if (!this.container) return;

    const currentEl = this.container.querySelector('.current-turn');
    const totalEl = this.container.querySelector('.total-turns');
    
    if (currentEl) {
      currentEl.textContent = `Turn ${currentTurn}`;
    }
    if (totalEl) {
      totalEl.textContent = totalTurns;
    }
  }

  _updateKeyTurnsDisplay() {
    if (!this.container) return;

    const keyTurnsEl = this.container.querySelector('.replay-keyturns');
    if (keyTurnsEl) {
      keyTurnsEl.innerHTML = this.keyTurns.map((turn, i) => 
        `<button class="keyturn-btn" data-index="${i}">${turn}</button>`
      ).join('');
    }
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReplayUI };
} else if (typeof window !== 'undefined') {
  window.ReplayUI = ReplayUI;
}