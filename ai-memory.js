/**
 * V79 AIMemory - AI对手五层记忆系统
 * 五层架构: L0 Meta Rules | L1 Insight Index | L2 Global Facts | L3 Skills/SOPs | L4 Session Archive
 */
class AIMemory {
  constructor() {
    this.STORAGE_KEYS = {
      L1_INDEX: 'cg_l1_player_style',
      L2_FACTS: 'cg_l2_card_priorities',
      L3_SOPS: 'cg_l3_player_sops'
    };
    this.DB_NAME = 'card-game-prototype';
    this.L4_STORE = 'session_archives';
    this._db = null;
    this._initDB();
  }

  // ===== L0: Meta Rules (固定规则，不变) =====
  static META_RULES = [
    'cannot_play_card_if_not_in_hand',
    'must_have_valid_play_or_pass',
    'energy_constraint',
    'health_cannot_exceed_max',
    'shield_absorbs_damage_first'
  ];

  static getMetaRules() {
    return [...this.META_RULES];
  }

  static validatePlay(card, hand, energy) {
    if (!hand.includes(card)) return { valid: false, reason: 'card_not_in_hand' };
    if ((card.cost || 0) > energy) return { valid: false, reason: 'insufficient_energy' };
    return { valid: true };
  }

  // ===== L1: Player Style Insight Index =====
  analyzePlayerStyle(gameHistory) {
    if (!gameHistory || gameHistory.length === 0) return { style: 'balanced', confidence: 0.5 };
    
    let aggressiveScore = 0;
    let defensiveScore = 0;
    let comboScore = 0;
    let totalScore = 0;

    for (const game of gameHistory) {
      // 激进风格: 频繁攻击，快速击杀
      if (game.quickVictory || game.avgDamagePerTurn > 10) aggressiveScore += 2;
      if (game.cardsPlayedPerTurn > 2) aggressiveScore++;
      
      // 防御风格: 多防御牌，护盾积累
      if (game.totalShield > 20) defensiveScore++;
      if (game.defendActions > game.attackActions) defensiveScore++;
      
      // 连击型: 使用combo序列
      if (game.comboChains > 0) comboScore += game.comboChains;
      if (game.powerCardUsage > 2) comboScore++;
    }

    totalScore = aggressiveScore + defensiveScore + comboScore;
    if (totalScore === 0) return { style: 'balanced', confidence: 0.5 };

    const scores = { aggressive: aggressiveScore, defensive: defensiveScore, combo: comboScore, balanced: 1 };
    const maxStyle = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    const confidence = Math.min(0.95, scores[maxStyle] / totalScore + 0.3);

    return { style: maxStyle === 'balanced' ? 'balanced' : maxStyle, confidence };
  }

  getPlayerStyle() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.L1_INDEX);
      return data ? JSON.parse(data) : { style: 'balanced', confidence: 0.5, updatedAt: null };
    } catch { return { style: 'balanced', confidence: 0.5 }; }
  }

  savePlayerStyle(styleData) {
    try {
      const data = { ...styleData, updatedAt: Date.now() };
      localStorage.setItem(this.STORAGE_KEYS.L1_INDEX, JSON.stringify(data));
    } catch (e) { console.warn('AIMemory L1 save failed:', e); }
  }

  // ===== L2: Card Priority Facts =====
  updateCardPriorities(cardUsageStats) {
    if (!cardUsageStats || typeof cardUsageStats !== 'object') return;
    try {
      const existing = this.getCardPriorities();
      // 合并统计，更新优先级
      for (const [cardId, stats] of Object.entries(cardUsageStats)) {
        if (existing[cardId]) {
          existing[cardId].playCount += stats.playCount || 0;
          existing[cardId].winCount += stats.winCount || 0;
          existing[cardId].priority = existing[cardId].playCount > 0 
            ? existing[cardId].winCount / existing[cardId].playCount 
            : 0.5;
        } else {
          existing[cardId] = {
            playCount: stats.playCount || 0,
            winCount: stats.winCount || 0,
            priority: stats.winCount > 0 && stats.playCount > 0 
              ? stats.winCount / stats.playCount 
              : 0.5
          };
        }
      }
      localStorage.setItem(this.STORAGE_KEYS.L2_FACTS, JSON.stringify(existing));
    } catch (e) { console.warn('AIMemory L2 save failed:', e); }
  }

  getCardPriorities() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.L2_FACTS);
      return data ? JSON.parse(data) : {};
    } catch { return {}; }
  }

  getCardPriority(cardId) {
    const priorities = this.getCardPriorities();
    return priorities[cardId]?.priority || 0.5;
  }

  // ===== L3: Player SOPs (Skills/Patterns) =====
  recordPlayerCombo(comboSequence) {
    if (!comboSequence || !Array.isArray(comboSequence) || comboSequence.length < 2) return;
    try {
      const sops = this.getPlayerSOPs();
      const patternKey = comboSequence.join('->');
      
      const existing = sops.find(s => s.patternKey === patternKey);
      if (existing) {
        existing.usageCount++;
        existing.lastUsed = Date.now();
        // 更新胜率
        if (comboSequence.winRate !== undefined) {
          existing.winRate = (existing.winRate * (existing.usageCount - 1) + comboSequence.winRate) / existing.usageCount;
        }
      } else {
        sops.push({
          patternKey,
          pattern: comboSequence.sequence || comboSequence,
          usageCount: 1,
          winRate: comboSequence.winRate || 0.5,
          lastUsed: Date.now(),
          createdAt: Date.now()
        });
      }
      
      // 只保留最近50个SOP
      if (sops.length > 50) sops.shift();
      localStorage.setItem(this.STORAGE_KEYS.L3_SOPS, JSON.stringify(sops));
    } catch (e) { console.warn('AIMemory L3 save failed:', e); }
  }

  getPlayerSOPs() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.L3_SOPS);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  }

  matchPlayerSOP(currentHand, recentPlayed = []) {
    if (!currentHand || currentHand.length === 0) return null;
    const sops = this.getPlayerSOPs();
    
    // 匹配最近的出牌序列
    for (const sop of sops) {
      if (sop.usageCount < 2) continue; // 至少使用2次才可靠
      const pattern = sop.pattern;
      if (recentPlayed.length >= pattern.length - 1) {
        const recent = [...recentPlayed].slice(-(pattern.length - 1));
        if (this._arraysEqual(recent, pattern.slice(0, -1))) {
          return { ...sop, recommendedResponse: pattern[pattern.length - 1] };
        }
      }
    }
    return null;
  }

  _arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // ===== L4: Session Archive (IndexedDB) =====
  async _initDB() {
    if (typeof indexedDB === 'undefined') return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { this._db = request.result; resolve(); };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.L4_STORE)) {
          db.createObjectStore(this.L4_STORE, { keyPath: 'sessionId' });
        }
      };
    });
  }

  async archiveSession(gameResult) {
    if (!gameResult) return;
    try {
      await this._ensureDB();
      const session = {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        playerDeck: gameResult.playerDeck || [],
        enemyId: gameResult.enemyId,
        enemyType: gameResult.enemyType,
        win: gameResult.win,
        turns: gameResult.turns,
        damageDealt: gameResult.damageDealt,
        damageTaken: gameResult.damageTaken,
        cardsPlayed: gameResult.cardsPlayed,
        maxCombo: gameResult.maxCombo,
        features: this._extractFeatures(gameResult)
      };
      
      return new Promise((resolve, reject) => {
        const tx = this._db.transaction(this.L4_STORE, 'readwrite');
        const store = tx.objectStore(this.L4_STORE);
        const request = store.put(session);
        request.onsuccess = () => resolve(session.sessionId);
        request.onerror = () => reject(request.error);
      });
    } catch (e) { console.warn('AIMemory L4 archive failed:', e); }
  }

  async _ensureDB() {
    if (!this._db) await this._initDB();
  }

  _extractFeatures(gameResult) {
    return {
      isAggressive: gameResult.turns < 10,
      hasCombo: gameResult.maxCombo > 2,
      usesPowerCards: gameResult.cardsPlayed > 15,
      damagePerTurn: gameResult.turns > 0 ? gameResult.damageDealt / gameResult.turns : 0,
      defenseoriented: gameResult.damageTaken < gameResult.damageDealt * 0.5
    };
  }

  async findSimilarSessions(currentSituation, limit = 5) {
    try {
      await this._ensureDB();
      return new Promise((resolve, reject) => {
        const tx = this._db.transaction(this.L4_STORE, 'readonly');
        const store = tx.objectStore(this.L4_STORE);
        const request = store.getAll();
        request.onsuccess = () => {
          const sessions = request.result || [];
          // 根据当前局面特征找相似对局
          const scored = sessions.map(s => ({
            session: s,
            similarity: this._calcSimilarity(s.features, currentSituation)
          })).filter(s => s.similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
          resolve(scored);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) { console.warn('AIMemory L4 query failed:', e); return []; }
  }

  _calcSimilarity(featuresA, featuresB) {
    let score = 0;
    if (featuresA.isAggressive === featuresB.isAggressive) score++;
    if (featuresA.hasCombo === featuresB.hasCombo) score++;
    if (featuresA.usesPowerCards === featuresB.usesPowerCards) score++;
    const dmgDiff = Math.abs(featuresA.damagePerTurn - featuresB.damagePerTurn);
    if (dmgDiff < 2) score++;
    return score / 4;
  }

  async getSessionCount() {
    try {
      await this._ensureDB();
      return new Promise((resolve, reject) => {
        const tx = this._db.transaction(this.L4_STORE, 'readonly');
        const store = tx.objectStore(this.L4_STORE);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch { return 0; }
  }

  // ===== Memory Integration with Game =====
  getMemoryBonus(memoryType, context = {}) {
    const style = this.getPlayerStyle();
    
    switch (memoryType) {
      case 'l1':
        // L1风格加成
        if (style.style === 'aggressive') return { holdDefend: true, preferAttack: true };
        if (style.style === 'defensive') return { preserveHealth: true, preferDefend: true };
        if (style.style === 'combo') return { lookForCombo: true };
        return {};
        
      case 'l2':
        // L2卡牌优先级
        return { cardPriorities: this.getCardPriorities() };
        
      case 'l3':
        // L3 SOP匹配
        const matchedSOP = this.matchPlayerSOP(context.currentHand, context.recentPlayed);
        return matchedSOP ? { matchedSOP } : {};
        
      case 'l4':
        // L4相似对局需要异步获取
        return { pendingAsync: true, context };
        
      default:
        return {};
    }
  }

  // 获取记忆状态摘要
  getMemoryStatus() {
    const l1 = this.getPlayerStyle();
    const l2 = this.getCardPriorities();
    const l3 = this.getPlayerSOPs();
    const cardCount = Object.keys(l2).length;
    const sopCount = l3.length;
    
    return {
      l0Active: true,
      l1Style: l1.style || 'balanced',
      l1Confidence: l1.confidence || 0.5,
      l2CardCount: cardCount,
      l3SopCount: sopCount,
      l4Pending: 'call getSessionCount() for async count'
    };
  }

  // 重置所有记忆
  resetMemory() {
    try {
      localStorage.removeItem(this.STORAGE_KEYS.L1_INDEX);
      localStorage.removeItem(this.STORAGE_KEYS.L2_FACTS);
      localStorage.removeItem(this.STORAGE_KEYS.L3_SOPS);
    } catch (e) {}
    // L4 IndexedDB 需要单独清空
    try {
      this._ensureDB().then(() => {
        if (this._db) {
          const tx = this._db.transaction(this.L4_STORE, 'readwrite');
          tx.objectStore(this.L4_STORE).clear();
        }
      });
    } catch (e) {}
    return true;
  }
}

// 导出
if (typeof window !== 'undefined') window.AIMemory = AIMemory;
if (typeof module !== 'undefined' && module.exports) module.exports = { AIMemory };