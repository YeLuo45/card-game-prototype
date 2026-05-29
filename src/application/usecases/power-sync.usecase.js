'use strict';
const fs = require('fs');
const path = require('path');

// PRE-MOCKS for browser-like globals
global.localStorage = {
  _store: {},
  getItem(k) { return this._store.hasOwnProperty(k) ? this._store[k] : null; },
  setItem(k, v) { this._store[k] = v; },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

global.sessionStorage = { _store: {}, getItem(k) { return this._store[k] || null; }, setItem(k, v) { this._store[k] = v; }, removeItem(k) { delete this._store[k]; }, clear() { this._store = {}; } };

global.window = {
  gameState: {
    player: { hp: 80, maxHp: 80, energy: 3, maxEnergy: 3, gold: 150, deck: [] },
    enemy: { hp: 50, maxHp: 50, attack: 8, name: '史莱姆王' },
    currentNode: 'battle',
    gamePhase: 'player_turn'
  },
  cardStudio: null,
  dreamManager: null,
  aiMemory: null,
  skillCrystallizer: null,
  eliteLoader: null,
  metaManager: null,
  addEventListener: () => {},
  document: {
    addEventListener: () => {},
    body: { appendChild: () => {}, querySelector: () => null },
    querySelectorAll: () => [],
    getElementById: () => null
  }
};

// ===== V90 PowerSync Energy Manager =====
/**
 * PowerSync - Energy System Enhancement
 * Features:
 * - Energy Overflow: Convert excess energy to bonus effects
 * - Combo Bonus: Consecutive energy usage increases power
 * - Critical Recovery: Energy restoration at critical HP moments
 * - Energy Drain: Enemy attacks reduce max energy temporarily
 */

class EnergySyncManager {
  constructor() {
    this.version = '1.0.0';
    this.name = 'EnergySyncManager';

    // Energy state
    this.currentEnergy = 3;
    this.maxEnergy = 3;
    this.overflow = 0;  // Excess energy from combo bonus
    this.combo = 0;     // Consecutive energy usage
    this.lastEnergyUsed = 0;
    this.overflowConversionRate = 0.5;  // 50% of overflow converts to bonus

    // Combo tracking
    this.comboHistory = [];  // Recent combo values
    this.maxCombo = 0;       // Highest combo achieved

    // Critical HP tracking
    this.criticalHpThreshold = 0.25;  // Below 25% HP is critical
    this.criticalRecoveryEnabled = true;
    this.criticalRecoveryAmount = 1;   // Extra energy at critical moments

    // Energy drain (from enemy attacks)
    this.drainStacks = 0;  // Number of energy drain debuffs
    this.drainReduction = 0;  // Max energy reduction per drain
    this.drainDuration = 0;  // Turns until drain expires

    // Passive abilities
    this.passiveBonuses = {
      energyGeneration: 0,    // Extra energy per turn
      overflowMultiplier: 1, // Multiplier on overflow conversion
      comboGrowth: 1.2       // Combo growth rate
    };
  }

  // === Core Energy Management ===

  /**
   * Get current energy state
   */
  getEnergyState() {
    const effectiveMax = Math.max(0, this.maxEnergy - this.drainReduction * this.drainStacks);
    return {
      current: this.currentEnergy,
      max: effectiveMax,
      overflow: this.overflow,
      combo: this.combo,
      drainActive: this.drainStacks > 0,
      drainStacks: this.drainStacks,
      drainReductionTotal: this.drainReduction * this.drainStacks
    };
  }

  /**
   * Spend energy (returns true if successful)
   */
  spendEnergy(amount) {
    const effectiveMax = Math.max(0, this.maxEnergy - this.drainReduction * this.drainStacks);
    const available = this.currentEnergy + this.overflow;

    if (available < amount) {
      return { success: false, reason: 'Not enough energy', available, required: amount };
    }

    // Spend from overflow first, then current energy
    let remaining = amount;
    if (this.overflow >= remaining) {
      this.overflow -= remaining;
      remaining = 0;
    } else {
      remaining -= this.overflow;
      this.overflow = 0;
      this.currentEnergy = Math.max(0, this.currentEnergy - remaining);
      remaining = 0;
    }

    // Update combo
    this.combo += this.passiveBonuses.comboGrowth;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.lastEnergyUsed = amount;
    this.comboHistory.push(this.combo);
    if (this.comboHistory.length > 5) this.comboHistory.shift();

    return {
      success: true,
      spent: amount,
      combo: this.combo,
      remainingEnergy: this.currentEnergy,
      remainingOverflow: this.overflow
    };
  }

  /**
   * Gain energy at start of turn
   */
  gainEnergy(amount = 1) {
    // Apply passive bonus
    const effectiveAmount = amount + this.passiveBonuses.energyGeneration;
    const effectiveMax = Math.max(0, this.maxEnergy - this.drainReduction * this.drainStacks);

    // Check for critical recovery
    let bonusEnergy = 0;
    if (this.criticalRecoveryEnabled && this._isPlayerCritical()) {
      bonusEnergy = this.criticalRecoveryAmount;
    }

    const oldEnergy = this.currentEnergy;
    const potentialEnergy = this.currentEnergy + effectiveAmount;

    // Overflow conversion: only if we would exceed max
    if (potentialEnergy > effectiveMax) {
      const excess = potentialEnergy - effectiveMax;
      this.overflow += excess * this.overflowConversionRate * this.passiveBonuses.overflowMultiplier;
      this.currentEnergy = effectiveMax;
    } else {
      this.currentEnergy = potentialEnergy;
    }

    return {
      gained: effectiveAmount,
      bonus: bonusEnergy,
      current: this.currentEnergy,
      max: effectiveMax,
      overflow: this.overflow,
      combo: this.combo
    };
  }

  /**
   * Reset combo (at end of turn or when taking damage)
   */
  resetCombo(reason = 'turn_end') {
    const oldCombo = this.combo;
    this.combo = 0;
    return { oldCombo, newCombo: 0, reason };
  }

  // === Energy Overflow ===

  /**
   * Get overflow bonus (extra damage/effect from overflow)
   */
  getOverflowBonus() {
    const bonus = Math.floor(this.overflow * 0.5);
    return {
      overflow: this.overflow,
      bonusEnergy: bonus,
      bonusType: bonus > 0 ? 'damage_or_shield' : 'none'
    };
  }

  /**
   * Consume overflow for bonus effect
   */
  consumeOverflow(amount = null) {
    const toConsume = amount !== null ? Math.min(amount, this.overflow) : Math.floor(this.overflow);
    if (toConsume <= 0) return { success: false, reason: 'No overflow to consume' };

    this.overflow = Math.max(0, this.overflow - toConsume);
    return {
      success: true,
      consumed: toConsume,
      remaining: this.overflow,
      bonus: toConsume * 2  // Each overflow gives double bonus
    };
  }

  // === Combo System ===

  /**
   * Get current combo multiplier
   */
  getComboMultiplier() {
    if (this.combo < 1) return 1;
    if (this.combo < 3) return 1.25;
    if (this.combo < 5) return 1.5;
    if (this.combo < 8) return 1.75;
    return 2.0;  // Max combo bonus
  }

  /**
   * Get combo bonus for a card
   */
  getComboBonusForCard(baseValue) {
    const mult = this.getComboMultiplier();
    const bonus = Math.floor(baseValue * (mult - 1));
    return {
      baseValue,
      multiplier: mult,
      bonus,
      total: baseValue + bonus
    };
  }

  /**
   * Get combo history summary
   */
  getComboHistory() {
    return {
      current: this.combo,
      max: this.maxCombo,
      history: [...this.comboHistory],
      multiplier: this.getComboMultiplier()
    };
  }

  // === Critical Recovery ===

  /**
   * Check if player is at critical HP
   */
  _isPlayerCritical() {
    if (!global.window?.gameState?.player) return false;
    const hp = global.window.gameState.player.hp || 0;
    const maxHp = global.window.gameState.player.maxHp || 1;
    return hp / maxHp <= this.criticalHpThreshold;
  }

  /**
   * Trigger critical recovery
   */
  triggerCriticalRecovery() {
    if (!this.criticalRecoveryEnabled) return { success: false, reason: 'Critical recovery disabled' };
    if (!this._isPlayerCritical()) return { success: false, reason: 'Player not critical' };

    this.currentEnergy += this.criticalRecoveryAmount;
    const recovery = this.criticalRecoveryAmount;
    this.criticalRecoveryAmount += 0.5;  // Increase recovery for next critical moment
    return {
      success: true,
      recovered: recovery,
      newEnergy: this.currentEnergy,
      nextRecoveryBonus: this.criticalRecoveryAmount
    };
  }

  // === Energy Drain ===

  /**
   * Apply energy drain debuff (from enemy attack)
   */
  applyEnergyDrain(stacks = 1, reduction = 1, duration = 3) {
    this.drainStacks += stacks;
    this.drainReduction = Math.max(this.drainReduction, reduction);
    this.drainDuration = Math.max(this.drainDuration, duration);

    const effectiveMax = Math.max(0, this.maxEnergy - this.drainReduction * this.drainStacks);
    if (this.currentEnergy > effectiveMax) {
      this.currentEnergy = effectiveMax;
    }

    return {
      stacks: this.drainStacks,
      reduction: this.drainReduction,
      effectiveMax,
      duration
    };
  }

  /**
   * Process drain at end of turn (reduce duration)
   */
  processEnergyDrain() {
    if (this.drainStacks === 0) return { active: false };

    this.drainDuration--;
    if (this.drainDuration <= 0) {
      this.drainStacks = 0;
      this.drainReduction = 0;
      return { active: false, cleared: true };
    }
    return { active: true, stacks: this.drainStacks, durationLeft: this.drainDuration };
  }

  // === Passive Bonuses ===

  /**
   * Update passive bonus
   */
  setPassiveBonus(type, value) {
    if (!this.passiveBonuses.hasOwnProperty(type)) {
      return { success: false, reason: `Unknown bonus type: ${type}` };
    }
    const oldValue = this.passiveBonuses[type];
    this.passiveBonuses[type] = value;
    return { success: true, type, oldValue, newValue: value };
  }

  /**
   * Get all passive bonuses
   */
  getPassiveBonuses() {
    return { ...this.passiveBonuses };
  }

  /**
   * Enable/disable critical recovery
   */
  setCriticalRecovery(enabled, threshold = null) {
    this.criticalRecoveryEnabled = enabled;
    if (threshold !== null) this.criticalHpThreshold = threshold;
    return { enabled: this.criticalRecoveryEnabled, threshold: this.criticalHpThreshold };
  }

  // === State Management ===

  /**
   * Reset for new battle
   */
  reset() {
    this.currentEnergy = this.maxEnergy;
    this.overflow = 0;
    this.combo = 0;
    this.lastEnergyUsed = 0;
    // maxCombo is PRESERVED across battles (historical record)
    this.comboHistory = [];
    this.drainStacks = 0;
    this.drainReduction = 0;
    this.drainDuration = 0;
    this.criticalRecoveryAmount = 1;
    return { reset: true };
  }

  /**
   * Export energy state for saving
   */
  exportState() {
    return {
      currentEnergy: this.currentEnergy,
      maxEnergy: this.maxEnergy,
      overflow: this.overflow,
      combo: this.combo,
      maxCombo: this.maxCombo,
      drainStacks: this.drainStacks,
      drainReduction: this.drainReduction,
      drainDuration: this.drainDuration,
      passiveBonuses: { ...this.passiveBonuses },
      criticalRecoveryEnabled: this.criticalRecoveryEnabled,
      criticalHpThreshold: this.criticalHpThreshold,
      criticalRecoveryAmount: this.criticalRecoveryAmount
    };
  }

  /**
   * Import state from save
   */
  importState(state) {
    if (state.currentEnergy !== undefined) this.currentEnergy = state.currentEnergy;
    if (state.maxEnergy !== undefined) this.maxEnergy = state.maxEnergy;
    if (state.overflow !== undefined) this.overflow = state.overflow;
    if (state.combo !== undefined) this.combo = state.combo;
    if (state.maxCombo !== undefined) this.maxCombo = state.maxCombo;
    if (state.drainStacks !== undefined) this.drainStacks = state.drainStacks;
    if (state.drainReduction !== undefined) this.drainReduction = state.drainReduction;
    if (state.drainDuration !== undefined) this.drainDuration = state.drainDuration;
    if (state.passiveBonuses) Object.assign(this.passiveBonuses, state.passiveBonuses);
    if (state.criticalRecoveryEnabled !== undefined) this.criticalRecoveryEnabled = state.criticalRecoveryEnabled;
    if (state.criticalHpThreshold !== undefined) this.criticalHpThreshold = state.criticalHpThreshold;
    if (state.criticalRecoveryAmount !== undefined) this.criticalRecoveryAmount = state.criticalRecoveryAmount;
    return { imported: true };
  }
}

// Export for Node.js (test environment) and browser (window global)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnergySyncManager };
}
if (typeof window !== 'undefined') {
  window.EnergySyncManager = EnergySyncManager;
}