// ===== V84 AI对手五层记忆系统 (Direction B) =====
// 基于 generic-agent-design L0-L4 分层记忆架构
// L0: 瞬时记忆（当前对局）
// L1: 情景记忆（最近20局）
// L2: 语义记忆（卡牌知识库）
// L3: 程序记忆（出牌模式）
// L4: 元记忆（学习策略）

class AIMemory {
  constructor() {
    this.L0 = {};  // 当前对局瞬时状态
    this.L1 = [];  // 最近情景（Array of match records）
    this.L2 = { entries: {} };  // 语义记忆（卡牌→效果关联）
    this.L3 = { patterns: {} };  // 程序记忆（出牌模式）
    this.L4 = {};  // 元记忆（学习参数）
    this.maxL1 = 20;  // 保留最近20局
    this.initialized = false;
    this._init();
  }

  _init() {
    // 初始化 L4 元记忆参数
    if (!this.L4.learningRate) this.L4.learningRate = 0.1;
    if (!this.L4.adaptationRate) this.L4.adaptationRate = 0.05;
    if (!this.L4.totalMatches) this.L4.totalMatches = 0;
    if (!this.L4.winRate) this.L4.winRate = 0.5;
    if (!this.L4.opponentProfiles) this.L4.opponentProfiles = {};
    this.initialized = true;

    // 尝试从 IndexedDB 加载持久化数据
    this._loadFromDB().catch(() => {});
  }

  // ========== L0: 瞬时记忆 ==========
  captureL0(gameState, action) {
    this.L0 = {
      timestamp: Date.now(),
      playerHp: gameState.playerHp || 0,
      playerMaxHp: gameState.playerMaxHp || 80,
      playerShield: gameState.playerShield || 0,
      energy: gameState.energy || 0,
      maxEnergy: gameState.maxEnergy || 3,
      turn: gameState.turn || 1,
      handSize: gameState.hand ? gameState.hand.length : 0,
      drawPileSize: gameState.drawPile ? gameState.drawPile.length : 0,
      discardPileSize: gameState.discardPile ? gameState.discardPile.length : 0,
      gold: gameState.gold || 0,
      relicCount: gameState.relics ? gameState.relics.length : 0,
      enemyHp: gameState.enemyHp || 0,
      enemyMaxHp: gameState.enemyMaxHp || 0,
      enemyArmor: gameState.enemyArmor || 0,
      playerDebuffs: gameState.playerDebuffs || [],
      enemyDebuffs: gameState.enemyDebuffs || [],
      action: action || 'unknown',
      hpRatio: gameState.playerHp / gameState.playerMaxHp,
      enemyHpRatio: gameState.enemyHp / (gameState.enemyMaxHp || 1)
    };
    return this.L0;
  }

  getL0() { return this.L0; }

  // ========== L1: 情景记忆 ==========
  archiveSession(result) {
    if (!this.initialized) return;
    if (!result) return;
    
    const session = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      victory: !!result.victory,
      chapter: result.chapter || (typeof chapterState !== 'undefined' ? chapterState.currentChapter : 1),
      floor: result.floor || (typeof gameState !== 'undefined' ? gameState.currentFloor : 1),
      finalHp: result.finalHp || (typeof gameState !== 'undefined' ? gameState.playerHp : 0),
      maxHp: result.maxHp || (typeof gameState !== 'undefined' ? gameState.playerMaxHp : 80),
      gold: result.gold || (typeof gameState !== 'undefined' ? gameState.gold : 0),
      relicsGained: result.relicsGained || [],
      enemyName: result.enemyName || (typeof gameState !== 'undefined' && gameState.enemy ? gameState.enemy.name : 'Unknown'),
      enemyType: this._classifyEnemy(result.enemyName || (typeof gameState !== 'undefined' && gameState.enemy ? gameState.enemy.name : '')),
      keyEvents: result.keyEvents || [],
      keyCards: result.keyCards || [],
      comboCount: result.comboCount || 0,
      performance: this._calcPerformance(result),
      finalL0: this.L0 ? { ...this.L0 } : {},
      damageDealt: result.damageDealt || 0,
      damageTaken: result.damageTaken || 0,
      cardsPlayed: result.cardsPlayed || 0
    };

    this.L1.unshift(session);
    if (this.L1.length > this.maxL1) {
      this.L1 = this.L1.slice(0, this.maxL1);
    }

    this._updateL4(session);
    this._extractPatternsFromL1();
    this._saveToDB().catch(() => {});
  }

  _classifyEnemy(name) {
    if (!name) return 'unknown';
    const n = name.toString().toLowerCase();
    if (n.includes('boss') || n.includes('首领') || n.includes('古')) return 'boss';
    if (n.includes('elite') || n.includes('精英') || n.includes('精英')) return 'elite';
    if (n.includes('slime') || n.includes('史莱姆') || n.includes('果冻')) return 'slime';
    if (n.includes('ghost') || n.includes('幽灵') || n.includes('幽灵')) return 'ghost';
    if (n.includes('demon') || n.includes('恶魔')) return 'demon';
    if (n.includes('dragon') || n.includes('龙')) return 'dragon';
    return 'normal';
  }

  _calcPerformance(result) {
    let score = result.victory ? 0.7 : 0.3;
    const hpRatio = (result.finalHp || 0) / (result.maxHp || 80);
    score += result.victory ? hpRatio * 0.3 : hpRatio * -0.1;
    return Math.max(0, Math.min(1, score));
  }

  getL1(filter = {}) {
    let results = [...this.L1];
    if (filter.enemyType) {
      results = results.filter(s => s.enemyType === filter.enemyType);
    }
    if (filter.victory !== undefined) {
      results = results.filter(s => s.victory === filter.victory);
    }
    if (filter.recentN) {
      results = results.slice(0, filter.recentN);
    }
    return results;
  }

  // ========== L2: 语义记忆（卡牌知识库） ==========
  learnCardRelation(cardA, cardB, relationType, strength = 0.5) {
    const key = `${cardA}_${cardB}`;
    if (!this.L2.entries[key]) {
      this.L2.entries[key] = { cards: [cardA, cardB], relations: {} };
    }
    if (!this.L2.entries[key].relations[relationType]) {
      this.L2.entries[key].relations[relationType] = [];
    }
    this.L2.entries[key].relations[relationType].push({
      strength,
      timestamp: Date.now()
    });
    this._normalizeRelations(key);
    this._saveToDB().catch(() => {});
  }

  _normalizeRelations(key) {
    const entry = this.L2.entries[key];
    for (const type in entry.relations) {
      const relations = entry.relations[type];
      if (relations.length > 1) {
        const avg = relations.reduce((s, r) => s + r.strength, 0) / relations.length;
        entry.relations[type] = [{ strength: avg, timestamp: Date.now() }];
      }
    }
  }

  getL2(cardId) {
    const related = [];
    for (const key in this.L2.entries) {
      if (key.includes(cardId)) {
        const entry = this.L2.entries[key];
        for (const type in entry.relations) {
          const strength = entry.relations[type][0]?.strength || 0;
          const otherCard = entry.cards[0] === cardId ? entry.cards[1] : entry.cards[0];
          related.push({ card: otherCard, relation: type, strength });
        }
      }
    }
    return related.sort((a, b) => b.strength - a.strength);
  }

  // ========== L3: 程序记忆（出牌模式） ==========
  _extractPatternsFromL1() {
    if (this.L1.length < 3) return;

    const recentMatches = this.L1.slice(0, 10);
    for (const match of recentMatches) {
      if (!match.keyCards || match.keyCards.length === 0) continue;
      if (!match.finalL0 || !match.finalL0.hpRatio) continue;
      
      const hpRatio = match.finalL0.hpRatio;
      const hpBucket = Math.floor(hpRatio * 10);
      const action = match.victory ? 'win' : 'lose';
      
      for (const card of match.keyCards.slice(0, 3)) {
        const patternKey = `hp_${hpBucket}_${action}_${card}`;
        if (!this.L3.patterns[patternKey]) {
          this.L3.patterns[patternKey] = { count: 0, successes: 0, card, hpBucket, action };
        }
        this.L3.patterns[patternKey].count++;
        if (match.victory) this.L3.patterns[patternKey].successes++;
      }
    }

    for (const key in this.L3.patterns) {
      const p = this.L3.patterns[key];
      p.successRate = p.count > 0 ? p.successes / p.count : 0.5;
    }
  }

  getL3(context = {}) {
    const hpRatio = context.hpRatio || 0.5;
    const hpBucket = Math.floor(hpRatio * 10);
    
    let matched = [];
    for (const key in this.L3.patterns) {
      if (key.includes(`hp_${hpBucket}`)) {
        matched.push({ key, ...this.L3.patterns[key] });
      }
    }
    return matched.sort((a, b) => (b.successRate * b.count) - (a.successRate * a.count));
  }

  // ========== L4: 元记忆（学习策略） ==========
  _updateL4(session) {
    this.L4.totalMatches = (this.L4.totalMatches || 0) + 1;
    
    const totalWins = this.L1.filter(s => s.victory).length;
    this.L4.winRate = totalWins / this.L4.totalMatches;

    const enemyType = session.enemyType || 'normal';
    if (!this.L4.opponentProfiles[enemyType]) {
      this.L4.opponentProfiles[enemyType] = { wins: 0, total: 0, winRate: 0, avgHp: 50 };
    }
    const profile = this.L4.opponentProfiles[enemyType];
    profile.total++;
    if (session.victory) profile.wins++;
    profile.winRate = profile.total > 0 ? profile.wins / profile.total : 0;
    profile.avgHp = session.finalHp || 50;
  }

  getL4(enemyType) {
    const base = {
      totalMatches: this.L4.totalMatches || 0,
      winRate: this.L4.winRate || 0.5,
      learningRate: this.L4.learningRate || 0.1,
      adaptationRate: this.L4.adaptationRate || 0.05
    };
    if (enemyType && this.L4.opponentProfiles?.[enemyType]) {
      return { ...base, ...this.L4.opponentProfiles[enemyType] };
    }
    return base;
  }

  // ========== AI 对手决策辅助 ==========
  getDecisionAdvice(context = {}) {
    const hpRatio = context.hpRatio !== undefined ? context.hpRatio : 0.5;
    const enemyHpRatio = context.enemyHpRatio !== undefined ? context.enemyHpRatio : 1;
    const energy = context.energy !== undefined ? context.energy : 3;
    const enemyType = context.enemyType || 'normal';

    let aggression = 0.5;
    if (hpRatio > 0.7 && energy >= 2) aggression = 0.8;
    if (hpRatio < 0.3) aggression = 0.3;
    if (enemyHpRatio < 0.2) aggression = 0.9;

    const L3Patterns = this.getL3({ hpRatio });
    if (L3Patterns.length > 0) {
      const topPattern = L3Patterns[0];
      if (topPattern.successRate > 0.7) {
        aggression = aggression * 0.7 + (topPattern.action === 'win' ? 0.75 : 0.45) * 0.3;
      }
    }

    const L4Info = this.getL4(enemyType);
    if (enemyType === 'boss' && L4Info.winRate < 0.4) {
      aggression = Math.min(aggression, 0.5);
    }

    return {
      aggression: Math.max(0, Math.min(1, aggression)),
      recommendedAction: aggression > 0.6 ? 'attack' : 'defend',
      confidence: L3Patterns.length > 2 ? 'high' : 'medium',
      patterns: L3Patterns.slice(0, 3),
      opponentAnalysis: L4Info,
      turn: context.turn || 1
    };
  }

  // ========== 持久化 (IndexedDB) ==========
  async _loadFromDB() {
    if (!window.indexedDB) return;
    
    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open('AIMemoryDB', 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('memory')) {
            resolve();
            return;
          }
          const tx = db.transaction('memory', 'readonly');
          const store = tx.objectStore('memory');
          const getReq = store.get('aiMemory');
          getReq.onsuccess = () => {
            if (getReq.result && getReq.result.data) {
              const data = getReq.result.data;
              this.L0 = data.L0 || {};
              this.L1 = data.L1 || [];
              this.L2 = data.L2 || { entries: {} };
              this.L3 = data.L3 || { patterns: {} };
              this.L4 = data.L4 || {};
              console.log('[AIMemory] Loaded from IndexedDB, L1:', this.L1.length, 'L3 patterns:', Object.keys(this.L3.patterns || {}).length);
            }
            resolve();
          };
          getReq.onerror = () => reject(getReq.error);
        };
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('memory')) {
            db.createObjectStore('memory', { keyPath: 'id' });
          }
        };
      } catch(e) {
        reject(e);
      }
    });
  }

  async _saveToDB() {
    if (!window.indexedDB) return;
    
    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open('AIMemoryDB', 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('memory', 'readwrite');
          let store;
          try {
            store = tx.objectStore('memory');
          } catch(e) {
            resolve();
            return;
          }
          store.put({
            id: 'aiMemory',
            data: {
              L0: this.L0,
              L1: this.L1,
              L2: this.L2,
              L3: this.L3,
              L4: this.L4
            },
            timestamp: Date.now()
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('memory')) {
            db.createObjectStore('memory', { keyPath: 'id' });
          }
        };
      } catch(e) {
        reject(e);
      }
    });
  }

  // ========== 调试/统计 ==========
  getStats() {
    return {
      L1Count: this.L1.length,
      L2Relations: Object.keys(this.L2.entries || {}).length,
      L3Patterns: Object.keys(this.L3.patterns || {}).length,
      L4: {
        totalMatches: this.L4.totalMatches || 0,
        winRate: this.L4.winRate || 0,
        opponentTypes: Object.keys(this.L4.opponentProfiles || {}).length
      }
    };
  }

  clear() {
    this.L0 = {};
    this.L1 = [];
    this.L2 = { entries: {} };
    this.L3 = { patterns: {} };
    this.L4 = { learningRate: 0.1, adaptationRate: 0.05, totalMatches: 0, winRate: 0.5, opponentProfiles: {} };
    this._saveToDB().catch(() => {});
    console.log('[AIMemory] Cleared all memory');
  }
}

// 导出
window.AIMemory = AIMemory;

// ===== 增强的 getAISessionResult (V84) =====
// 替代原来的 getGameResult，提供更丰富的会话数据
window.getAISessionResult = function(win) {
  // 计算关键卡牌（使用频率最高的卡牌）
  const cardCounts = {};
  let maxCombo = 0;
  let currentCombo = 0;
  let keyCards = [];
  
  if (window.gameState && window.gameState.battleLog) {
    for (const entry of window.gameState.battleLog) {
      const playedMatch = entry.message.match(/(?:使用|打出)\s*["']?([^"'\s]+)/);
      if (playedMatch) {
        const cardName = playedMatch[1];
        cardCounts[cardName] = (cardCounts[cardName] || 0) + 1;
      }
      if (entry.message.includes('连击') || entry.message.includes('combo')) {
        currentCombo++;
        maxCombo = Math.max(maxCombo, currentCombo);
      } else {
        currentCombo = 0;
      }
    }
  }
  
  // 提取前3张关键卡牌
  keyCards = Object.entries(cardCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(e => e[0]);

  let damageDealt = 0, damageTaken = 0, cardsPlayed = 0;
  if (window.gameState && window.gameState.battleLog) {
    for (const entry of window.gameState.battleLog) {
      const dmgMatch = entry.message.match(/造成\s*(\d+)\s*伤害/);
      if (dmgMatch) damageDealt += parseInt(dmgMatch[1]);
      const takenMatch = entry.message.match(/受到\s*(\d+)\s*伤害/);
      if (takenMatch) damageTaken += parseInt(takenMatch[1]);
      if (entry.message.includes('使用') || entry.message.includes('打出')) cardsPlayed++;
    }
  }

  return {
    victory: win,
    chapter: typeof chapterState !== 'undefined' ? chapterState.currentChapter : 1,
    floor: window.gameState ? window.gameState.currentFloor : 1,
    finalHp: window.gameState ? window.gameState.playerHp : 0,
    maxHp: window.gameState ? window.gameState.playerMaxHp : 80,
    gold: window.gameState ? window.gameState.gold : 0,
    relicsGained: window.gameState && window.gameState.relics ? window.gameState.relics.slice(-3) : [],
    enemyName: window.gameState && window.gameState.enemy ? window.gameState.enemy.name : 'Unknown',
    keyEvents: [],
    keyCards: keyCards,
    comboCount: maxCombo,
    damageDealt,
    damageTaken,
    cardsPlayed
  };
};

// ===== 集成：拦截原有 archiveSession 调用，使用增强数据 =====
// patch archiveSession 入口点，在 V83/V84 迭代中已通过 try-catch 调用 window.aiMemory.archiveSession
// 现在 window.getAISessionResult 提供更丰富的数据，无需修改原有调用点

// ===== V86 Dream Memory 梦境记忆系统 (Direction A) =====
// 基于 nanobot-design Dream Memory + generic-agent-design L0-L4

class DreamManager {
  constructor(aiMemory) {
    this.aiMemory = aiMemory;
    this.dreams = [];
    this.maxDreams = 50;
    this.dbName = 'DreamDB';
    this.storeName = 'dreams';
    this._loadFromDB().catch(() => {});
  }

  generateDreamSummary(gameId) {
    const sessions = this.aiMemory.getL1({ recentN: 10 });
    if (sessions.length === 0) return null;
    let targetSession = sessions.find(s => s.id == gameId) || sessions[0];
    const emotions = this._analyzeEmotion(targetSession);
    const archetype = this._analyzeArchetype(targetSession);
    const keyDecisions = this._extractKeyDecisions(targetSession);
    const title = this._generateTitle(targetSession, emotions);
    const summary = this._generateSummary(targetSession, emotions, archetype);
    return {
      id: `dream_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      gameId: targetSession.id,
      playerId: 'player1',
      timestamp: Date.now(),
      title,
      summary,
      keyDecisions,
      emotion: emotions.primary,
      archetype,
      session: targetSession
    };
  }

  _analyzeEmotion(session) {
    const hpRatio = (session.finalHp || 0) / (session.maxHp || 1);
    const victory = session.victory;
    const comboCount = session.comboCount || 0;
    let primary = 'neutral', secondary = 'neutral';
    if (victory && hpRatio > 0.7) { primary = 'exciting'; secondary = 'strategic'; }
    else if (victory && hpRatio < 0.3) { primary = 'tense'; secondary = 'exciting'; }
    else if (!victory && hpRatio > 0.5) { primary = 'strategic'; secondary = 'defensive'; }
    else if (!victory) { primary = 'defensive'; secondary = 'tense'; }
    else if (comboCount >= 5) { primary = 'exciting'; secondary = 'strategic'; }
    return { primary, secondary };
  }

  _analyzeArchetype(session) {
    const keyCards = session.keyCards || [];
    const damageDealt = session.damageDealt || 0;
    const damageTaken = session.damageTaken || 0;
    if (keyCards.some(c => c.includes('攻击') || c.includes('Strike') || c.includes('strike'))) return 'aggressive';
    if (keyCards.some(c => c.includes('防御') || c.includes('Defend') || c.includes('defend'))) return 'defensive';
    if (keyCards.some(c => c.includes('抽牌') || c.includes('Draw') || c.includes('draw'))) return 'control';
    if (damageDealt > damageTaken * 2) return 'aggressive';
    if (damageTaken > damageDealt) return 'defensive';
    return 'balanced';
  }

  _extractKeyDecisions(session) {
    const decisions = [];
    const finalL0 = session.finalL0 || {};
    const hpRatio = (session.finalHp || 0) / (session.maxHp || 1);
    const turn = finalL0.turn || 10;
    if (hpRatio < 0.3 && session.victory) {
      decisions.push({ turn: Math.floor(turn * 0.7), context: 'HP危险但最终获胜', aiDecision: '在低HP情况下做出了关键防守决策', outcome: '惊险逆转' });
    }
    if ((session.comboCount || 0) >= 3) {
      decisions.push({ turn: Math.floor(turn * 0.5), context: `发动了${session.comboCount}连击`, aiDecision: '识别到连击机会，优先打出高伤害组合', outcome: `造成${session.damageDealt || 0}伤害` });
    }
    if (session.victory && hpRatio > 0.8) {
      decisions.push({ turn: Math.floor(turn * 0.6), context: '保持高HP获胜', aiDecision: '全程保持进攻压力，零伤亡通关', outcome: '完美胜利' });
    }
    if (decisions.length === 0) {
      decisions.push({ turn: Math.floor(turn / 2), context: '常规对局', aiDecision: '根据当前局势做出标准决策', outcome: session.victory ? '获胜' : '失败' });
    }
    return decisions;
  }

  _generateTitle(session, emotions) {
    const hpRatio = Math.round(((session.finalHp || 0) / (session.maxHp || 1)) * 100);
    if (emotions.primary === 'exciting' && session.victory) return `高压下的完美斩获 (HP:${hpRatio}%)`;
    if (emotions.primary === 'tense' && session.victory) return `绝处逢生的逆转胜利 (HP:${hpRatio}%)`;
    if (emotions.primary === 'defensive' && !session.victory) return `防守策略的沉痛代价 (HP:${hpRatio}%)`;
    if (emotions.primary === 'exciting' && !session.victory) return `激战中的遗憾落败 (HP:${hpRatio}%)`;
    if (emotions.primary === 'strategic') return `策略性胜利：HP${hpRatio}%`;
    return `对局回顾：HP${hpRatio}%`;
  }

  _generateSummary(session, emotions, archetype) {
    const enemy = session.enemyName || 'Unknown';
    const victory = session.victory ? '获胜' : '失败';
    const hpPercent = Math.round(((session.finalHp || 0) / (session.maxHp || 1)) * 100);
    const archetypeNames = { aggressive: '进攻型', defensive: '防守型', control: '控制型', balanced: '均衡型' };
    let summary = `${enemy}对局，${victory}。最终HP${hpPercent}%，流派${archetypeNames[archetype] || archetype}。`;
    if ((session.comboCount || 0) >= 3) summary += `发动${session.comboCount}连击。`;
    if (emotions.primary === 'exciting') summary += '整局充满紧张感。';
    else if (emotions.primary === 'strategic') summary += '展现了清晰的策略思维。';
    else if (emotions.primary === 'defensive') summary += '防守策略执行得当。';
    return summary;
  }

  async saveDream(dream) {
    this.dreams.unshift(dream);
    if (this.dreams.length > this.maxDreams) this.dreams = this.dreams.slice(0, this.maxDreams);
    await this._saveToDB();
    return dream;
  }

  getDreamFragments(playerId = 'player1', limit = 10) {
    return this.dreams.slice(0, limit).map(d => ({
      id: d.id, gameId: d.gameId, timestamp: d.timestamp, title: d.title, summary: d.summary, emotion: d.emotion, archetype: d.archetype
    }));
  }

  getDreamDetail(fragmentId) {
    const dream = this.dreams.find(d => d.id === fragmentId);
    return dream || null;
  }

  async generateFromSessions() {
    const sessions = this.aiMemory.getL1({ recentN: 5 });
    for (const session of sessions) {
      const exists = this.dreams.some(d => d.gameId === session.id);
      if (!exists) {
        const dream = this.generateDreamSummary(session.id);
        if (dream) await this.saveDream(dream);
      }
    }
  }

  async pruneOldDreams(maxFragments = 50) {
    if (this.dreams.length <= maxFragments) return;
    this.dreams = this.dreams.slice(0, maxFragments);
    await this._saveToDB();
  }

  getStats() {
    return {
      dreamCount: this.dreams.length,
      emotionDistribution: this.dreams.reduce((acc, d) => { acc[d.emotion] = (acc[d.emotion] || 0) + 1; return acc; }, {}),
      archetypeDistribution: this.dreams.reduce((acc, d) => { acc[d.archetype] = (acc[d.archetype] || 0) + 1; return acc; }, {})
    };
  }

  async _loadFromDB() {
    if (!window.indexedDB) return;
    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(this.dbName, 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(this.storeName)) { resolve(); return; }
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const getReq = store.get('dreams');
          getReq.onsuccess = () => {
            if (getReq.result && getReq.result.data) { this.dreams = getReq.result.data; console.log('[DreamManager] Loaded', this.dreams.length, 'dreams'); }
            resolve();
          };
          getReq.onerror = () => reject(getReq.error);
        };
        req.onupgradeneeded = (e) => { const db = e.target.result; if (!db.objectStoreNames.contains(this.storeName)) db.createObjectStore(this.storeName, { keyPath: 'id' }); };
      } catch(e) { reject(e); }
    });
  }

  async _saveToDB() {
    if (!window.indexedDB) return;
    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(this.dbName, 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(this.storeName, 'readwrite');
          let store;
          try { store = tx.objectStore(this.storeName); } catch(e) { resolve(); return; }
          store.put({ id: 'dreams', data: this.dreams, timestamp: Date.now() });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        req.onupgradeneeded = (e) => { const db = e.target.result; if (!db.objectStoreNames.contains(this.storeName)) db.createObjectStore(this.storeName, { keyPath: 'id' }); };
      } catch(e) { reject(e); }
    });
  }
}

window.DreamManager = DreamManager;