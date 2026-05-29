/**
 * V63 Meta Progress & Achievements System
 * 卡牌游戏进度系统 - 统计面板+成就+难度选择
 */

// ===== STORAGE KEYS =====
const META_STORAGE_KEYS = {
  GLOBAL_STATS: 'cgp_globalStats',
  ACHIEVEMENTS: 'cgp_achievements',
  CARD_UNLOCKS: 'cgp_cardUnlocks',
  RELIC_UNLOCKS: 'cgp_relicUnlocks',
  CHAPTER_UNLOCKS: 'cgp_chapterUnlocks',
  CURRENT_STATS: 'cgp_currentStats',
};

// ===== GLOBAL STATS DEFAULT =====
const DEFAULT_GLOBAL_STATS = {
  totalBattles: 0,
  totalWins: 0,
  totalLosses: 0,
  totalDamageDealt: 0,
  totalHealing: 0,
  totalRelicsCollected: 0,
  totalCardsUsed: 0,
  totalPlaytime: 0,
  winsByDifficulty: { easy: 0, normal: 0, hard: 0, nightmare: 0 },
  bossKills: { ancientDragon: 0, abyssLord: 0 },
  unscathedBattles: 0,
  noExtraCardWins: 0,
  maxRelicsHeld: 0,
  maxDamageInOneRun: 0,
  lowHpWins: 0,
};

// ===== ACHIEVEMENTS =====
const ACHIEVEMENTS = [
  // Combat
  { id: 'first_blood', name: '初战告捷', desc: '赢得第一场战斗', secret: false, condition: (s) => s.totalWins >= 1 },
  { id: 'unscathed', name: '毫发无损', desc: '无伤赢得一场战斗', secret: false, condition: (s) => s.unscathedBattles >= 1 },
  { id: 'dragon_slayer', name: '屠龙者', desc: '击杀远古巨龙', secret: false, condition: (s) => s.bossKills?.ancientDragon >= 1 },
  { id: 'abyss_lord_slayer', name: '深渊克星', desc: '击杀深渊领主', secret: false, condition: (s) => s.bossKills?.abyssLord >= 1 },
  { id: 'no_cards_used', name: '徒手空拳', desc: '仅用初始手牌赢得战斗', secret: true, condition: (s) => s.noExtraCardWins >= 1 },
  // Collection
  { id: 'first_relic', name: '初获遗物', desc: '获得第一个遗物', secret: false, condition: (s) => s.totalRelicsCollected >= 1 },
  { id: 'relic_collector', name: '遗物收藏家', desc: '拥有5个以上遗物', secret: false, condition: (s) => s.maxRelicsHeld >= 5 },
  { id: 'all_relics', name: '收藏大师', desc: '解锁全部遗物', secret: true, condition: (s) => s.totalRelicsCollected >= 8 },
  // Progress
  { id: 'first_victory', name: '初次通关', desc: '通关普通难度', secret: false, condition: (s) => s.winsByDifficulty?.normal >= 1 },
  { id: 'hard_mode', name: '迎难而上', desc: '通关困难难度', secret: false, condition: (s) => s.winsByDifficulty?.hard >= 1 },
  { id: 'nightmare_mode', name: '噩梦征服者', desc: '通关噩梦难度', secret: true, condition: (s) => s.winsByDifficulty?.nightmare >= 1 },
  { id: 'veteran', name: '身经百战', desc: '累计进行50场战斗', secret: false, condition: (s) => s.totalBattles >= 50 },
  // Special
  { id: 'powerhouse', name: '力量源泉', desc: '单局造成100点伤害', secret: false, condition: (s) => s.maxDamageInOneRun >= 100 },
  { id: 'survivor', name: '绝境求生', desc: '在生命值低于10%时获胜', secret: true, condition: (s) => s.lowHpWins >= 1 },
];

// ===== DIFFICULTY SETTINGS =====
const DIFFICULTY_SETTINGS = {
  easy: { hpMult: 0.7, dmgMult: 0.7, bossHpMult: 0.7, label: '简单', locked: false },
  normal: { hpMult: 1.0, dmgMult: 1.0, bossHpMult: 1.0, label: '普通', locked: false },
  hard: { hpMult: 1.5, dmgMult: 1.3, bossHpMult: 1.5, label: '困难', locked: true, reward: 1 },
  nightmare: { hpMult: 2.0, dmgMult: 1.6, bossHpMult: 2.0, label: '噩梦', locked: true, reward: 2 },
};

// ===== META MANAGER CLASS =====
class MetaManager {
  constructor() {
    this.stats = this.loadStats();
    this.achievements = this.loadAchievements();
    this.cardUnlocks = this.loadCardUnlocks();
    this.relicUnlocks = this.loadRelicUnlocks();
    this.chapterUnlocks = this.loadChapterUnlocks();
    this.currentStats = this.loadCurrentStats();
  }

  // ===== STATS =====
  loadStats() {
    try {
      const saved = localStorage.getItem(META_STORAGE_KEYS.GLOBAL_STATS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_GLOBAL_STATS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load global stats:', e);
    }
    return { ...DEFAULT_GLOBAL_STATS };
  }

  saveStats() {
    try {
      localStorage.setItem(META_STORAGE_KEYS.GLOBAL_STATS, JSON.stringify(this.stats));
    } catch (e) {
      console.warn('Failed to save global stats:', e);
    }
  }

  getStats() {
    return JSON.parse(JSON.stringify(this.stats));
  }

  // ===== ACHIEVEMENTS =====
  loadAchievements() {
    try {
      const saved = localStorage.getItem(META_STORAGE_KEYS.ACHIEVEMENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with ACHIEVEMENTS defaults, preserve unlocked state
        return ACHIEVEMENTS.map(ach => {
          const savedAch = parsed.find(a => a.id === ach.id);
          return {
            ...ach,
            unlocked: savedAch ? savedAch.unlocked : false,
            unlockedAt: savedAch ? savedAch.unlockedAt : null
          };
        });
      }
    } catch (e) {
      console.warn('Failed to load achievements:', e);
    }
    return ACHIEVEMENTS.map(ach => ({ ...ach, unlocked: false, unlockedAt: null }));
  }

  saveAchievements() {
    try {
      const toSave = this.achievements.map(ach => ({
        id: ach.id,
        unlocked: ach.unlocked,
        unlockedAt: ach.unlockedAt
      }));
      localStorage.setItem(META_STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save achievements:', e);
    }
  }

  getUnlockedAchievements() {
    return this.achievements.filter(ach => ach.unlocked);
  }

  getLockedAchievements() {
    return this.achievements.filter(ach => !ach.unlocked);
  }

  checkAchievements() {
    const newlyUnlocked = [];
    for (const ach of this.achievements) {
      if (ach.unlocked) continue;
      try {
        if (ach.condition(this.stats)) {
          ach.unlocked = true;
          ach.unlockedAt = Date.now();
          newlyUnlocked.push(ach);
        }
      } catch (e) {
        console.warn('Achievement check failed for', ach.id, e);
      }
    }
    if (newlyUnlocked.length > 0) {
      this.saveAchievements();
      this.saveStats();
    }
    return newlyUnlocked;
  }

  // ===== CARD UNLOCKS =====
  loadCardUnlocks() {
    try {
      const saved = localStorage.getItem(META_STORAGE_KEYS.CARD_UNLOCKS);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveCardUnlocks() {
    try {
      localStorage.setItem(META_STORAGE_KEYS.CARD_UNLOCKS, JSON.stringify(this.cardUnlocks));
    } catch (e) {
      console.warn('Failed to save card unlocks:', e);
    }
  }

  // ===== RELIC UNLOCKS =====
  loadRelicUnlocks() {
    try {
      const saved = localStorage.getItem(META_STORAGE_KEYS.RELIC_UNLOCKS);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveRelicUnlocks() {
    try {
      localStorage.setItem(META_STORAGE_KEYS.RELIC_UNLOCKS, JSON.stringify(this.relicUnlocks));
    } catch (e) {
      console.warn('Failed to save relic unlocks:', e);
    }
  }

  // ===== CHAPTER UNLOCKS =====
  loadChapterUnlocks() {
    try {
      const saved = localStorage.getItem(META_STORAGE_KEYS.CHAPTER_UNLOCKS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load chapter unlocks:', e);
    }
    return { normal: true, hard: false, nightmare: false };
  }

  saveChapterUnlocks() {
    try {
      localStorage.setItem(META_STORAGE_KEYS.CHAPTER_UNLOCKS, JSON.stringify(this.chapterUnlocks));
    } catch (e) {
      console.warn('Failed to save chapter unlocks:', e);
    }
  }

  // ===== CURRENT STATS (per-run) =====
  loadCurrentStats() {
    try {
      const saved = localStorage.getItem(META_STORAGE_KEYS.CURRENT_STATS);
      return saved ? JSON.parse(saved) : {
        battleCount: 0,
        damageDealt: 0,
        healing: 0,
        relicsCollected: 0,
        cardsUsed: 0,
        maxRelicsHeld: 0,
        battleStartHp: 0,
        tookDamage: false
      };
    } catch (e) {
      return {
        battleCount: 0,
        damageDealt: 0,
        healing: 0,
        relicsCollected: 0,
        cardsUsed: 0,
        maxRelicsHeld: 0,
        battleStartHp: 0,
        tookDamage: false
      };
    }
  }

  saveCurrentStats() {
    try {
      localStorage.setItem(META_STORAGE_KEYS.CURRENT_STATS, JSON.stringify(this.currentStats));
    } catch (e) {
      console.warn('Failed to save current stats:', e);
    }
  }

  // ===== GAME EVENT HOOKS =====
  onBattleStart(difficulty) {
    this.currentStats.battleCount++;
    this.stats.totalBattles++;
    this.currentStats.battleStartHp = window.gameState ? window.gameState.playerHp : 100;
    this.currentStats.tookDamage = false;
    this.saveStats();
    this.saveCurrentStats();
  }

  onBattleEnd(victory, difficulty) {
    if (victory) {
      this.stats.totalWins++;
      if (!this.stats.winsByDifficulty) {
        this.stats.winsByDifficulty = { easy: 0, normal: 0, hard: 0, nightmare: 0 };
      }
      if (this.stats.winsByDifficulty[difficulty] !== undefined) {
        this.stats.winsByDifficulty[difficulty]++;
      }
      
      // Check unscathed battle
      if (!this.currentStats.tookDamage) {
        this.stats.unscathedBattles++;
      }
      
      // Check low HP win
      if (window.gameState) {
        const hpPercent = window.gameState.playerHp / window.gameState.playerMaxHp;
        if (hpPercent < 0.1) {
          this.stats.lowHpWins++;
        }
      }
    } else {
      this.stats.totalLosses++;
    }
    this.saveStats();
    this.saveCurrentStats();
  }

  onDamageDealt(amount) {
    this.stats.totalDamageDealt += amount;
    this.currentStats.damageDealt += amount;
    if (this.currentStats.damageDealt > this.stats.maxDamageInOneRun) {
      this.stats.maxDamageInOneRun = this.currentStats.damageDealt;
    }
    this.saveStats();
    this.saveCurrentStats();
  }

  onHealing(amount) {
    this.stats.totalHealing += amount;
    this.currentStats.healing += amount;
    this.saveStats();
    this.saveCurrentStats();
  }

  onRelicAcquired(relicId) {
    this.stats.totalRelicsCollected++;
    this.currentStats.relicsCollected++;
    this.relicUnlocks[relicId] = true;
    if (window.gameState && window.gameState.relics) {
      const relicCount = window.gameState.relics.length;
      if (relicCount > this.currentStats.maxRelicsHeld) {
        this.currentStats.maxRelicsHeld = relicCount;
      }
      if (relicCount > this.stats.maxRelicsHeld) {
        this.stats.maxRelicsHeld = relicCount;
      }
    }
    this.saveStats();
    this.saveCurrentStats();
    this.saveRelicUnlocks();
  }

  onCardUsed(cardId) {
    this.currentStats.cardsUsed++;
    this.stats.totalCardsUsed++;
    this.saveStats();
    this.saveCurrentStats();
  }

  onBossKill(bossId) {
    if (bossId === 'ancientDragon') {
      if (!this.stats.bossKills) this.stats.bossKills = {};
      this.stats.bossKills.ancientDragon = 1;
    } else if (bossId === 'abyssLord') {
      if (!this.stats.bossKills) this.stats.bossKills = {};
      this.stats.bossKills.abyssLord = 1;
    }
    this.saveStats();
  }

  onChapterComplete(difficulty) {
    // Unlock next difficulty
    if (difficulty === 'normal') {
      this.unlockDifficulty('hard');
    } else if (difficulty === 'hard') {
      this.unlockDifficulty('nightmare');
    }
  }

  onGameStart() {
    this.currentStats = {
      battleCount: 0,
      damageDealt: 0,
      healing: 0,
      relicsCollected: 0,
      cardsUsed: 0,
      maxRelicsHeld: 0,
      battleStartHp: 0,
      tookDamage: false
    };
    this.saveCurrentStats();
  }

  addPlaytime(seconds) {
    this.stats.totalPlaytime += seconds;
    this.saveStats();
  }

  onPlayerDamaged(amount) {
    if (amount > 0) {
      this.currentStats.tookDamage = true;
      this.saveCurrentStats();
    }
  }

  onNoExtraCardWin() {
    this.stats.noExtraCardWins++;
    this.saveStats();
  }

  // ===== DIFFICULTY =====
  getDifficulty(difficultyKey) {
    return DIFFICULTY_SETTINGS[difficultyKey];
  }

  isDifficultyUnlocked(difficultyKey) {
    const settings = DIFFICULTY_SETTINGS[difficultyKey];
    if (!settings) return false;
    if (!settings.locked) return true;
    return this.chapterUnlocks[difficultyKey] === true;
  }

  unlockDifficulty(difficultyKey) {
    this.chapterUnlocks[difficultyKey] = true;
    this.saveChapterUnlocks();
  }

  // ===== UI: ACHIEVEMENT POPUP =====
  showAchievementPopup(achievement) {
    const container = document.getElementById('achievement-popup-container');
    if (!container) return;
    
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
      <div class="achievement-popup-icon">🏆</div>
      <div class="achievement-popup-content">
        <div class="achievement-popup-title">成就解锁</div>
        <div class="achievement-popup-name">${achievement.name}</div>
        <div class="achievement-popup-desc">${achievement.desc}</div>
      </div>
    `;
    container.appendChild(popup);
    
    // Trigger animation
    requestAnimationFrame(() => {
      popup.classList.add('show');
    });
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 300);
    }, 3000);
  }

  // ===== UI: STATS PANEL =====
  showStatsPanel() {
    // Remove existing panel
    const existing = document.getElementById('meta-stats-panel');
    if (existing) existing.remove();
    
    const stats = this.getStats();
    const playtimeHours = Math.floor(stats.totalPlaytime / 3600);
    const playtimeMinutes = Math.floor((stats.totalPlaytime % 3600) / 60);
    
    const panel = document.createElement('div');
    panel.id = 'meta-stats-panel';
    panel.className = 'meta-modal-overlay';
    panel.innerHTML = `
      <div class="meta-modal-content">
        <h2 class="meta-modal-title">📊 游戏统计</h2>
        <div class="meta-modal-close" onclick="document.getElementById('meta-stats-panel').remove()">✕</div>
        <div class="meta-stats-grid">
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.totalBattles}</div>
            <div class="meta-stat-label">总战斗次数</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.totalWins}</div>
            <div class="meta-stat-label">总胜利</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.totalLosses}</div>
            <div class="meta-stat-label">总失败</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.totalBattles > 0 ? Math.round(stats.totalWins / stats.totalBattles * 100) : 0}%</div>
            <div class="meta-stat-label">胜率</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.totalDamageDealt}</div>
            <div class="meta-stat-label">累计伤害</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.totalHealing}</div>
            <div class="meta-stat-label">累计治疗</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.totalRelicsCollected}</div>
            <div class="meta-stat-label">获得遗物</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.totalCardsUsed}</div>
            <div class="meta-stat-label">使用卡牌</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${playtimeHours}小时${playtimeMinutes}分</div>
            <div class="meta-stat-label">游戏时长</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.winsByDifficulty?.easy || 0}</div>
            <div class="meta-stat-label">简单难度胜</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.winsByDifficulty?.normal || 0}</div>
            <div class="meta-stat-label">普通难度胜</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.winsByDifficulty?.hard || 0}</div>
            <div class="meta-stat-label">困难难度胜</div>
          </div>
          <div class="meta-stat-item">
            <div class="meta-stat-value">${stats.winsByDifficulty?.nightmare || 0}</div>
            <div class="meta-stat-label">噩梦难度胜</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    
    // Click outside to close
    panel.addEventListener('click', (e) => {
      if (e.target === panel) panel.remove();
    });
  }

  // ===== UI: ACHIEVEMENTS PANEL =====
  showAchievementsPanel() {
    // Remove existing panel
    const existing = document.getElementById('meta-achievements-panel');
    if (existing) existing.remove();
    
    const unlockedCount = this.getUnlockedAchievements().length;
    const totalCount = ACHIEVEMENTS.length;
    
    const panel = document.createElement('div');
    panel.id = 'meta-achievements-panel';
    panel.className = 'meta-modal-overlay';
    
    let achievementsHtml = '';
    for (const ach of this.achievements) {
      const isSecret = ach.secret && !ach.unlocked;
      const name = isSecret ? '???' : ach.name;
      const desc = isSecret ? '隐藏成就' : ach.desc;
      const statusClass = ach.unlocked ? 'unlocked' : 'locked';
      const icon = ach.unlocked ? '🏆' : '🔒';
      
      achievementsHtml += `
        <div class="achievement-item ${statusClass}">
          <div class="achievement-icon">${icon}</div>
          <div class="achievement-info">
            <div class="achievement-name">${name}</div>
            <div class="achievement-desc">${desc}</div>
          </div>
        </div>
      `;
    }
    
    panel.innerHTML = `
      <div class="meta-modal-content achievements-panel">
        <h2 class="meta-modal-title">🏆 成就 (${unlockedCount}/${totalCount})</h2>
        <div class="meta-modal-close" onclick="document.getElementById('meta-achievements-panel').remove()">✕</div>
        <div class="achievements-list">
          ${achievementsHtml}
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    
    // Click outside to close
    panel.addEventListener('click', (e) => {
      if (e.target === panel) panel.remove();
    });
  }

  // ===== UI: DIFFICULTY SELECT =====
  showDifficultySelect() {
    const container = document.getElementById('difficulty-select-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (const [key, settings] of Object.entries(DIFFICULTY_SETTINGS)) {
      const isUnlocked = this.isDifficultyUnlocked(key);
      const isSelected = window.selectedDifficulty === key;
      
      const btn = document.createElement('button');
      btn.className = `difficulty-btn ${key} ${isUnlocked ? '' : 'locked'} ${isSelected ? 'selected' : ''}`;
      btn.disabled = !isUnlocked;
      btn.innerHTML = `
        <span class="difficulty-label">${settings.label}</span>
        ${!isUnlocked ? '<span class="difficulty-lock">🔒</span>' : ''}
      `;
      btn.onclick = () => {
        if (isUnlocked) {
          window.selectedDifficulty = key;
          this.showDifficultySelect();
        }
      };
      container.appendChild(btn);
    }
  }
}

// Export to window
window.metaManager = new MetaManager();
window.selectedDifficulty = 'normal';

// Initialize difficulty select when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.metaManager) {
    window.metaManager.showDifficultySelect();
  }
});
