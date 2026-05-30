/**
 * V102 Replay Analysis & AI Coach System (Direction C)
 * 核心模块: ReplayStorage | ReplayAnalyzer | DeckAdvisorAgent | OpponentModelAgent
 * 
 * 设计来源: thunderbolt offline-first | generic-agent L0-L4 五层记忆 | chatdev multi-agent
 */

class ReplayStorage {
  constructor() {
    this.REPLAY_PREFIX = 'replay_';
    this.INDEX_KEY = 'replay_index';
    this.MAX_REPLAYS = 100;
  }

  /**
   * 保存回放到 localStorage
   * @param {string} replayId - 回放ID
   * @param {object} gameState - 游戏状态
   * @returns {boolean} 保存是否成功
   */
  saveReplay(replayId, gameState) {
    if (!replayId || !gameState) return false;
    
    try {
      // 构建回放数据
      const replayData = {
        replayId,
        timestamp: Date.now(),
        gameState: this._sanitizeGameState(gameState),
        metadata: {
          version: 'V102',
          playerHealth: gameState.playerHealth,
          enemyHealth: gameState.enemyHealth,
          turnCount: gameState.turn || 0,
          outcome: gameState.outcome || 'unknown'
        }
      };

      // 保存回放
      localStorage.setItem(this.REPLAY_PREFIX + replayId, JSON.stringify(replayData));
      
      // 更新索引
      this._updateIndex(replayId);
      
      return true;
    } catch (e) {
      console.warn('[ReplayStorage] saveReplay failed:', e);
      return false;
    }
  }

  /**
   * 加载回放
   * @param {string} replayId - 回放ID
   * @returns {object|null} 回放数据或null
   */
  loadReplay(replayId) {
    if (!replayId) return null;
    
    try {
      const data = localStorage.getItem(this.REPLAY_PREFIX + replayId);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('[ReplayStorage] loadReplay failed:', e);
      return null;
    }
  }

  /**
   * 列出回放列表
   * @param {object} filter - 过滤条件 { outcome, fromDate, toDate, deckId }
   * @returns {Array} 回放列表
   */
  listReplays(filter = {}) {
    try {
      const index = this._getIndex();
      const replays = [];

      for (const replayId of index) {
        const replay = this.loadReplay(replayId);
        if (!replay) continue;

        // 应用过滤器
        if (filter.outcome && replay.metadata?.outcome !== filter.outcome) continue;
        if (filter.fromDate && replay.timestamp < filter.fromDate) continue;
        if (filter.toDate && replay.timestamp > filter.toDate) continue;
        if (filter.deckId && replay.gameState?.playerDeck?.id !== filter.deckId) continue;

        replays.push({
          replayId: replay.replayId,
          timestamp: replay.timestamp,
          outcome: replay.metadata?.outcome,
          turnCount: replay.metadata?.turnCount,
          playerHealth: replay.metadata?.playerHealth,
          enemyHealth: replay.metadata?.enemyHealth
        });
      }

      // 按时间倒序
      return replays.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.warn('[ReplayStorage] listReplays failed:', e);
      return [];
    }
  }

  /**
   * 删除回放
   * @param {string} replayId - 回放ID
   * @returns {boolean} 删除是否成功
   */
  deleteReplay(replayId) {
    if (!replayId) return false;

    try {
      // 删除回放数据
      localStorage.removeItem(this.REPLAY_PREFIX + replayId);
      
      // 更新索引
      this._removeFromIndex(replayId);
      
      return true;
    } catch (e) {
      console.warn('[ReplayStorage] deleteReplay failed:', e);
      return false;
    }
  }

  /**
   * 清空所有回放
   * @returns {boolean} 清空是否成功
   */
  clearAll() {
    try {
      const index = this._getIndex();
      for (const replayId of index) {
        localStorage.removeItem(this.REPLAY_PREFIX + replayId);
      }
      localStorage.removeItem(this.INDEX_KEY);
      return true;
    } catch (e) {
      console.warn('[ReplayStorage] clearAll failed:', e);
      return false;
    }
  }

  /**
   * 获取回放总数
   * @returns {number} 回放数量
   */
  getReplayCount() {
    return this._getIndex().length;
  }

  _getIndex() {
    try {
      const data = localStorage.getItem(this.INDEX_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _updateIndex(replayId) {
    const index = this._getIndex();
    
    // 如果已存在，先移除
    const existingIdx = index.indexOf(replayId);
    if (existingIdx !== -1) {
      index.splice(existingIdx, 1);
    }

    // 添加到开头
    index.unshift(replayId);

    // 限制最大数量
    while (index.length > this.MAX_REPLAYS) {
      const oldId = index.pop();
      localStorage.removeItem(this.REPLAY_PREFIX + oldId);
    }

    localStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
  }

  _removeFromIndex(replayId) {
    const index = this._getIndex();
    const idx = index.indexOf(replayId);
    if (idx !== -1) {
      index.splice(idx, 1);
      localStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
    }
  }

  _sanitizeGameState(gameState) {
    // 深拷贝并清理敏感数据
    const sanitized = JSON.parse(JSON.stringify(gameState));
    // 移除可能过大的数据
    if (sanitized.hand) {
      sanitized.hand = sanitized.hand.slice(-10); // 只保留最近10张手牌
    }
    return sanitized;
  }
}

/**
 * ReplayAnalyzer - 回放分析器
 * 使用 L0-L4 记忆模式分析回放找出失误和改进建议
 */
class ReplayAnalyzer {
  constructor(replayStorage) {
    this.storage = replayStorage || new ReplayStorage();
    this.MISTAKE_THRESHOLD = 0.7; // 失误率阈值
  }

  /**
   * 分析单个回放
   * @param {string} replayId - 回放ID
   * @returns {object} 分析结果
   */
  analyzeReplay(replayId) {
    const replay = this.storage.loadReplay(replayId);
    if (!replay) return null;

    const gameState = replay.gameState;
    
    // 分析失误
    const mistakes = this.findMistakes(replay);
    
    // 生成改进建议
    const improvements = this.suggestImprovements(replay);
    
    // 计算总体评分
    const score = this._calculateScore(mistakes, improvements);

    return {
      replayId,
      timestamp: replay.timestamp,
      score,
      mistakes,
      improvements,
      summary: this._generateSummary(score, mistakes, improvements),
      keyEvents: this._extractKeyEvents(gameState)
    };
  }

  /**
   * 找出失误点
   * @param {object} replay - 回放数据
   * @returns {Array} 失误列表
   */
  findMistakes(replay) {
    if (!replay || !replay.gameState) return [];

    const mistakes = [];
    const gameState = replay.gameState;

    // 1. 检查血量管理失误
    const hpMistakes = this._analyzeHealthManagement(gameState);
    mistakes.push(...hpMistakes);

    // 2. 检查能量使用失误
    const energyMistakes = this._analyzeEnergyUsage(gameState);
    mistakes.push(...energyMistakes);

    // 3. 检查卡牌选择失误
    const cardMistakes = this._analyzeCardChoice(gameState);
    mistakes.push(...cardMistakes);

    // 4. 检查节奏控制失误
    const tempoMistakes = this._analyzeTempoControl(gameState);
    mistakes.push(...tempoMistakes);

    return mistakes;
  }

  /**
   * 生成改进建议
   * @param {object} replay - 回放数据
   * @returns {Array} 改进建议列表
   */
  suggestImprovements(replay) {
    if (!replay || !replay.gameState) return [];

    const improvements = [];
    const gameState = replay.gameState;

    // 基于失误生成建议
    const mistakes = this.findMistakes(replay);
    
    for (const mistake of mistakes) {
      const suggestion = this._mistakeToSuggestion(mistake);
      if (suggestion) {
        improvements.push(suggestion);
      }
    }

    // 基于游戏结果生成通用建议
    const generalSuggestions = this._generateGeneralSuggestions(gameState);
    improvements.push(...generalSuggestions);

    // 去重
    const unique = [];
    const seen = new Set();
    for (const imp of improvements) {
      const key = imp.type + imp.message;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(imp);
      }
    }

    return unique;
  }

  _analyzeHealthManagement(gameState) {
    const mistakes = [];
    
    // 检查是否在可以击杀对手时没有击杀
    if (gameState.enemyHealth <= 5 && gameState.playerEnergy >= 3) {
      // 可能错失击杀机会
    }

    // 检查是否过度掉血
    if (gameState.playerHealth < gameState.enemyHealth && gameState.turn > 5) {
      mistakes.push({
        type: 'health_management',
        severity: 'medium',
        turn: gameState.turn || 0,
        message: '血量管理不佳，当前血量低于对手且回合较晚',
        suggestion: '考虑更积极的进攻，缩短对局'
      });
    }

    // 检查是否浪费护盾
    if (gameState.shield && gameState.shield > 10 && gameState.enemyIntent === 'attack') {
      // 护盾充足但对手在攻击，可能过度防御
    }

    return mistakes;
  }

  _analyzeEnergyUsage(gameState) {
    const mistakes = [];

    // 检查能量溢出
    if (gameState.energy && gameState.energy >= 2 && gameState.energy == gameState.maxEnergy) {
      // 满能量未使用
    }

    // 检查能量浪费
    if (gameState.turn > 3 && gameState.energy == gameState.maxEnergy) {
      mistakes.push({
        type: 'energy_waste',
        severity: 'low',
        turn: gameState.turn,
        message: '能量未充分利用',
        suggestion: '尝试规划更平滑的能量曲线'
      });
    }

    return mistakes;
  }

  _analyzeCardChoice(gameState) {
    const mistakes = [];

    // 检查是否使用了低优先级卡牌
    if (gameState.lastPlayedCard && gameState.lastPlayedCard.cost > 2) {
      // 高费卡使用
    }

    // 检查出牌序列
    if (gameState.playedCards && gameState.playedCards.length > 3) {
      const sequence = gameState.playedCards.slice(-3);
      // 分析序列是否合理
    }

    return mistakes;
  }

  _analyzeTempoControl(gameState) {
    const mistakes = [];

    // 检查节奏是否过慢
    if (gameState.turn > 10 && gameState.playerHealth > 50) {
      mistakes.push({
        type: 'tempo',
        severity: 'medium',
        turn: gameState.turn,
        message: '对局节奏过慢',
        suggestion: '考虑加快节奏，在优势时扩大优势'
      });
    }

    // 检查是否错失终结机会
    if (gameState.turn > 15 && gameState.enemyHealth < 10 && gameState.playerHealth > 20) {
      mistakes.push({
        type: 'finish',
        severity: 'high',
        turn: gameState.turn,
        message: '错失终结对手的机会',
        suggestion: '在对手血量低时集中火力尽快击杀'
      });
    }

    return mistakes;
  }

  _mistakeToSuggestion(mistake) {
    const map = {
      'health_management': {
        type: 'strategy',
        priority: 'high',
        message: mistake.suggestion || '优化血量管理，在保持安全的同时给对手压力'
      },
      'energy_waste': {
        type: 'efficiency',
        priority: 'medium',
        message: '优化能量曲线，避免能量溢出'
      },
      'tempo': {
        type: 'strategy',
        priority: 'medium',
        message: '调整节奏，在优势时扩大优势'
      },
      'finish': {
        type: 'skill',
        priority: 'high',
        message: '练习终结对手的时机判断'
      }
    };

    return map[mistake.type] || null;
  }

  _generateGeneralSuggestions(gameState) {
    const suggestions = [];

    // 基于游戏结果
    if (gameState.outcome === 'loss' && gameState.playerHealth <= 0) {
      suggestions.push({
        type: 'survival',
        priority: 'high',
        message: '存活能力需要加强，考虑增加防御手段'
      });
    }

    if (gameState.outcome === 'win' && gameState.turn > 15) {
      suggestions.push({
        type: 'efficiency',
        priority: 'medium',
        message: '对局时间过长，提升斩杀效率'
      });
    }

    return suggestions;
  }

  _calculateScore(mistakes, improvements) {
    // 基础分数
    let score = 100;

    // 扣分
    for (const mistake of mistakes) {
      switch (mistake.severity) {
        case 'high': score -= 15; break;
        case 'medium': score -= 8; break;
        case 'low': score -= 3; break;
      }
    }

    // 加分（好的改进建议）
    score += Math.min(improvements.length * 2, 10);

    return Math.max(0, Math.min(100, score));
  }

  _generateSummary(score, mistakes, improvements) {
    const mistakeCount = mistakes.length;
    const highSeverityCount = mistakes.filter(m => m.severity === 'high').length;

    if (score >= 90) return 'Excellent performance';
    if (score >= 75) return 'Good performance with minor mistakes';
    if (score >= 60) return 'Average performance, room for improvement';
    if (highSeverityCount > 0) return 'Needs significant improvement';
    return 'Below average performance';
  }

  _extractKeyEvents(gameState) {
    const events = [];
    
    if (gameState.turn) {
      events.push({ turn: gameState.turn, event: 'game_progress' });
    }
    
    if (gameState.playerHealth && gameState.enemyHealth) {
      events.push({
        turn: gameState.turn || 0,
        event: 'health_check',
        playerHealth: gameState.playerHealth,
        enemyHealth: gameState.enemyHealth
      });
    }

    return events;
  }

  /**
   * 批量分析多个回放
   * @param {Array<string>} replayIds - 回放ID列表
   * @returns {Array} 分析结果列表
   */
  analyzeMultiple(replayIds) {
    const results = [];
    for (const replayId of replayIds) {
      const result = this.analyzeReplay(replayId);
      if (result) results.push(result);
    }
    return results;
  }

  /**
   * 获取总体统计
   * @param {Array} analysisResults - 分析结果列表
   * @returns {object} 统计数据
   */
  getStats(analysisResults) {
    if (!analysisResults || analysisResults.length === 0) {
      return { count: 0, avgScore: 0, commonMistakes: [] };
    }

    const scores = analysisResults.map(r => r.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // 统计常见失误
    const mistakeCounts = {};
    for (const result of analysisResults) {
      for (const mistake of result.mistakes) {
        mistakeCounts[mistake.type] = (mistakeCounts[mistake.type] || 0) + 1;
      }
    }

    const commonMistakes = Object.entries(mistakeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      count: analysisResults.length,
      avgScore: Math.round(avgScore * 10) / 10,
      commonMistakes
    };
  }
}

/**
 * DeckAdvisorAgent - 卡组顾问AI Agent
 * 使用 L0-L4 记忆模式分析卡组优劣势和策略建议
 */
class DeckAdvisorAgent {
  constructor(aiMemory) {
    this.memory = aiMemory || null;
    this.DECK_ANALYSIS_KEY = 'deck_advisor_analysis';
  }

  /**
   * 分析卡组优劣势
   * @param {string} deckId - 卡组ID
   * @returns {object} 分析结果
   */
  analyzeDeck(deckId) {
    if (!deckId) return null;

    // 获取卡组数据
    const deckData = this._getDeckData(deckId);
    if (!deckData) return null;

    // 分析优势
    const strengths = this._analyzeStrengths(deckData);
    
    // 分析劣势
    const weaknesses = this._analyzeWeaknesses(deckData);
    
    // 获取卡组记忆
    const memoryData = this._getDeckMemory(deckId);

    const result = {
      deckId,
      timestamp: Date.now(),
      strengths,
      weaknesses,
      winRate: deckData.winRate || 0,
      playCount: deckData.playCount || 0,
      recommendedStrategy: this._generateStrategy(deckData, strengths, weaknesses),
      memoryAnalysis: memoryData
    };

    // 存储分析结果
    this._saveAnalysis(deckId, result);

    return result;
  }

  /**
   * 针对对手卡组生成策略
   * @param {string} playerDeckId - 玩家卡组ID
   * @param {string} opponentDeckId - 对手卡组ID
   * @returns {object} 策略建议
   */
  suggestMatchupStrategy(playerDeckId, opponentDeckId) {
    const playerDeck = this._getDeckData(playerDeckId);
    const opponentDeck = this._getDeckData(opponentDeckId);

    if (!playerDeck || !opponentDeck) {
      return this._defaultStrategy();
    }

    // 分析对手卡组类型
    const opponentType = this._classifyDeck(opponentDeck);
    
    // 生成针对性策略
    const strategy = this._generateMatchupStrategy(playerDeck, opponentDeck, opponentType);

    // 获取对手历史行为
    const opponentHistory = this._getOpponentHistory(opponentDeckId);
    if (opponentHistory && opponentHistory.length > 0) {
      // 结合对手历史调整策略
      strategy.adaptedFromHistory = this._adaptFromHistory(opponentHistory);
    }

    return strategy;
  }

  /**
   * 获取卡组分析历史
   * @param {string} deckId - 卡组ID
   * @returns {Array} 历史分析列表
   */
  getAnalysisHistory(deckId) {
    try {
      const key = this.DECK_ANALYSIS_KEY + '_' + deckId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _getDeckData(deckId) {
    // 从localStorage获取卡组数据
    try {
      const key = 'metagame_deck_' + deckId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  _getDeckMemory(deckId) {
    if (!this.memory) return null;
    
    return {
      l2Priorities: this.memory.getCardPriorities(),
      l3SOPs: this.memory.getPlayerSOPs()
    };
  }

  _analyzeStrengths(deckData) {
    const strengths = [];

    if (deckData.winRate > 0.6) {
      strengths.push('高胜率卡组');
    }

    if (deckData.avgDamage > 15) {
      strengths.push('高伤害输出');
    }

    if (deckData.avgTurns < 12) {
      strengths.push('快速结束战斗');
    }

    return strengths;
  }

  _analyzeWeaknesses(deckData) {
    const weaknesses = [];

    if (deckData.winRate < 0.4) {
      weaknesses.push('胜率偏低');
    }

    if (deckData.avgTurns > 18) {
      weaknesses.push('对局时间过长');
    }

    return weaknesses;
  }

  _classifyDeck(deckData) {
    // 根据数据分类卡组
    if (deckData.avgDamage > 15) return 'aggro';
    if (deckData.avgTurns > 15) return 'control';
    if (deckData.winRate > 0.5) return 'tempo';
    return 'balanced';
  }

  _generateStrategy(deckData, strengths, weaknesses) {
    const deckType = this._classifyDeck(deckData);

    const strategies = {
      aggro: '快速进攻，在对手站稳之前建立优势',
      control: '稳健防守，等待对手犯错后反击',
      tempo: '保持节奏优势，灵活切换攻守',
      balanced: '根据对手调整策略，保持资源平衡'
    };

    return {
      primary: strategies[deckType] || strategies.balanced,
      strengths: strengths.slice(0, 2),
      weaknesses: weaknesses.slice(0, 2),
      keyCards: this._identifyKeyCards(deckData)
    };
  }

  _generateMatchupStrategy(playerDeck, opponentDeck, opponentType) {
    // 针对不同对手类型生成策略
    const strategies = {
      aggro: {
        recommendation: '防御优先，保护血量',
        keepResources: true,
        winCondition: '拖入中后期，利用资源优势取胜'
      },
      control: {
        recommendation: '保持压力，不给对手喘息机会',
        keepResources: false,
        winCondition: '快速击杀，避免被消耗'
      },
      tempo: {
        recommendation: '节奏对抗，尝试取得先手',
        keepResources: false,
        winCondition: '保持节奏优势到最后'
      },
      balanced: {
        recommendation: '稳健策略，控场优先',
        keepResources: true,
        winCondition: '稳扎稳打，积累优势'
      }
    };

    const baseStrategy = strategies[opponentType] || strategies.balanced;

    // 计算优劣对位
    const matchupAdvantage = this._calculateMatchup(playerDeck, opponentDeck);

    return {
      ...baseStrategy,
      matchupAdvantage,
      sideBoardTips: this._generateSideboardTips(opponentType)
    };
  }

  _calculateMatchup(playerDeck, opponentDeck) {
    // 简化的优劣计算
    const playerType = this._classifyDeck(playerDeck);
    
    // aggro vs control 劣势, control vs aggro 优势
    if (playerType === 'aggro' && this._classifyDeck(opponentDeck) === 'control') {
      return 'unfavorable';
    }
    if (playerType === 'control' && this._classifyDeck(opponentDeck) === 'aggro') {
      return 'favorable';
    }
    
    return 'neutral';
  }

  _generateSideboardTips(opponentType) {
    const tips = {
      aggro: ['预留足够的防御卡', '考虑带治疗或护盾卡'],
      control: ['准备去除关键卡牌的手段', '带一些穿透伤害卡'],
      tempo: ['注意节奏控制', '保持手牌优势'],
      balanced: ['灵活调整策略', '观察对手出牌模式']
    };

    return tips[opponentType] || tips.balanced;
  }

  _getOpponentHistory(opponentDeckId) {
    if (!this.memory) return [];

    try {
      const sops = this.memory.getPlayerSOPs();
      return sops.filter(s => s.opponentId === opponentDeckId);
    } catch {
      return [];
    }
  }

  _adaptFromHistory(opponentHistory) {
    if (!opponentHistory || opponentHistory.length === 0) return null;

    // 分析对手历史行为模式
    const patterns = {};
    for (const history of opponentHistory) {
      const pattern = history.patternKey;
      patterns[pattern] = (patterns[pattern] || 0) + history.usageCount;
    }

    const mostCommon = Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      likelyPlayPattern: mostCommon ? mostCommon[0] : null,
      confidence: mostCommon ? mostCommon[1] / opponentHistory.length : 0
    };
  }

  _identifyKeyCards(deckData) {
    // 简化实现，实际应分析卡组构成
    return [];
  }

  _saveAnalysis(deckId, result) {
    try {
      const key = this.DECK_ANALYSIS_KEY + '_' + deckId;
      const history = this.getAnalysisHistory(deckId);
      history.push(result);
      
      // 只保留最近10次分析
      if (history.length > 10) history.shift();
      
      localStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
      console.warn('[DeckAdvisorAgent] _saveAnalysis failed:', e);
    }
  }

  _defaultStrategy() {
    return {
      recommendation: '稳健策略',
      keepResources: true,
      winCondition: '积累优势，稳扎稳打',
      matchupAdvantage: 'unknown'
    };
  }
}

/**
 * OpponentModelAgent - 对手建模AI Agent
 * 建模对手行为模式，预测对手下一步
 */
class OpponentModelAgent {
  constructor(aiMemory) {
    this.memory = aiMemory || null;
    this.MODEL_PREFIX = 'opponent_model_';
    this.TENDENCY_KEY = 'opponent_tendencies';
  }

  /**
   * 建模对手行为模式
   * @param {Array} opponentHistory - 对手历史对局
   * @returns {object} 对手模型
   */
  modelOpponent(opponentHistory) {
    if (!opponentHistory || opponentHistory.length === 0) {
      return this._defaultModel();
    }

    // 分析对手风格
    const style = this._analyzeOpponentStyle(opponentHistory);
    
    // 分析对手卡组
    const deckType = this._analyzeOpponentDeckType(opponentHistory);
    
    // 分析对手倾向
    const tendencies = this._analyzeTendencies(opponentHistory);
    
    // 计算可信度
    const confidence = this._calculateModelConfidence(opponentHistory);

    const model = {
      style,
      deckType,
      tendencies,
      confidence,
      sampleSize: opponentHistory.length,
      lastUpdated: Date.now()
    };

    // 存储模型
    this._saveModel(opponentHistory[0]?.opponentId || 'unknown', model);

    return model;
  }

  /**
   * 预测对手下一步
   * @param {object} gameState - 当前游戏状态
   * @returns {object} 预测结果
   */
  predictNextMove(gameState) {
    if (!gameState || !gameState.opponentId) {
      return this._defaultPrediction();
    }

    const model = this._loadModel(gameState.opponentId);
    if (!model) {
      return this._defaultPrediction();
    }

    // 基于模型和当前状态预测
    const prediction = {
      likelyAction: this._predictAction(model, gameState),
      confidence: model.confidence,
      reasoning: this._buildReasoning(model, gameState),
      recommendedResponse: this._getRecommendedResponse(model, gameState)
    };

    return prediction;
  }

  /**
   * 获取对手倾向
   * @param {string} opponentId - 对手ID
   * @returns {object} 对手倾向数据
   */
  getOpponentTendencies(opponentId) {
    try {
      const key = this.TENDENCY_KEY + '_' + opponentId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : this._defaultTendencies();
    } catch {
      return this._defaultTendencies();
    }
  }

  /**
   * 更新对手模型
   * @param {string} opponentId - 对手ID
   * @param {object} newData - 新对局数据
   */
  updateModel(opponentId, newData) {
    if (!opponentId || !newData) return;

    const existingHistory = this._loadHistory(opponentId);
    existingHistory.push(newData);
    
    // 只保留最近20场对局
    while (existingHistory.length > 20) {
      existingHistory.shift();
    }

    this._saveHistory(opponentId, existingHistory);
    
    // 重新建模
    if (existingHistory.length >= 3) {
      this.modelOpponent(existingHistory);
    }
  }

  _analyzeOpponentStyle(history) {
    let aggressiveScore = 0;
    let defensiveScore = 0;
    let comboScore = 0;

    for (const game of history) {
      if (game.quickVictory) aggressiveScore += 2;
      if (game.avgDamagePerTurn > 10) aggressiveScore++;
      if (game.totalShield > 20) defensiveScore++;
      if (game.comboChains > 0) comboScore += game.comboChains;
    }

    const total = aggressiveScore + defensiveScore + comboScore;
    if (total === 0) return 'balanced';

    if (aggressiveScore / total > 0.5) return 'aggressive';
    if (defensiveScore / total > 0.5) return 'defensive';
    if (comboScore / total > 0.5) return 'combo';
    return 'balanced';
  }

  _analyzeOpponentDeckType(history) {
    // 基于游戏特征分析对手卡组类型
    const avgDamage = history.reduce((sum, g) => sum + (g.avgDamagePerTurn || 0), 0) / history.length;
    const avgTurns = history.reduce((sum, g) => sum + (g.turns || 0), 0) / history.length;

    if (avgTurns < 10 && avgDamage > 12) return 'aggro';
    if (avgTurns > 15) return 'control';
    return 'midrange';
  }

  _analyzeTendencies(history) {
    const tendencies = {
      firstActionBias: 0.5,
      attackWhenLow: 0.5,
      savePowerCards: 0.5,
      predictablePatterns: []
    };

    // 分析出牌序列模式
    const patterns = [];
    for (const game of history) {
      if (game.playedCards && game.playedCards.length > 0) {
        patterns.push(game.playedCards.join('->'));
      }
    }

    // 找出重复模式
    const patternCounts = {};
    for (const pattern of patterns) {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    }

    const repeatedPatterns = Object.entries(patternCounts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pattern]) => pattern);

    tendencies.predictablePatterns = repeatedPatterns;
    tendencies.patternReliability = repeatedPatterns.length > 0 
      ? repeatedPatterns.reduce((sum, p) => sum + patternCounts[p], 0) / history.length 
      : 0;

    return tendencies;
  }

  _calculateModelConfidence(history) {
    // 样本越多，可信度越高
    const sizeFactor = Math.min(history.length / 10, 1);
    
    // 一致性影响可信度
    const styles = history.map(g => this._analyzeOpponentStyle([g]));
    const uniqueStyles = new Set(styles).size;
    const consistencyFactor = 1 - (uniqueStyles - 1) / 3;

    return Math.max(0.3, Math.min(0.95, sizeFactor * 0.6 + consistencyFactor * 0.4));
  }

  _predictAction(model, gameState) {
    const { style, tendencies } = model;

    // 基于风格和倾向预测
    if (style === 'aggressive' && gameState.enemyHealth < 15) {
      return 'final_push';
    }

    if (style === 'defensive' && gameState.playerHealth > 30) {
      return 'setup_defense';
    }

    // 检查可预测模式
    if (tendencies.predictablePatterns.length > 0 && gameState.turn > 1) {
      // 预测下一步可能的序列
      const recentActions = gameState.recentActions || [];
      for (const pattern of tendencies.predictablePatterns) {
        const patternParts = pattern.split('->');
        if (patternParts.length > recentActions.length) {
          const prefix = patternParts.slice(0, recentActions.length).join('->');
          if (prefix === recentActions.join('->')) {
            return 'pattern_predictable:' + patternParts[recentActions.length];
          }
        }
      }
    }

    // 默认预测
    return 'standard_play';
  }

  _buildReasoning(model, gameState) {
    return `对手风格: ${model.style}, 可信度: ${Math.round(model.confidence * 100)}%`;
  }

  _getRecommendedResponse(model, gameState) {
    // 基于对手模型生成推荐响应
    const responses = {
      aggressive: '保持血量优势，诱使对手进入不利局面',
      defensive: '保持压力，不给对手积累防御的机会',
      combo: '打乱对手节奏，阻止combo完成',
      balanced: '稳健应对，观察对手出牌模式'
    };

    return responses[model.style] || responses.balanced;
  }

  _loadModel(opponentId) {
    try {
      const key = this.MODEL_PREFIX + opponentId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  _saveModel(opponentId, model) {
    try {
      const key = this.MODEL_PREFIX + opponentId;
      localStorage.setItem(key, JSON.stringify(model));
      
      // 同时更新倾向数据
      const tendenciesKey = this.TENDENCY_KEY + '_' + opponentId;
      localStorage.setItem(tendenciesKey, JSON.stringify(model.tendencies));
    } catch (e) {
      console.warn('[OpponentModelAgent] _saveModel failed:', e);
    }
  }

  _loadHistory(opponentId) {
    try {
      const key = 'opponent_history_' + opponentId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _saveHistory(opponentId, history) {
    try {
      const key = 'opponent_history_' + opponentId;
      localStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
      console.warn('[OpponentModelAgent] _saveHistory failed:', e);
    }
  }

  _defaultModel() {
    return {
      style: 'balanced',
      deckType: 'midrange',
      tendencies: this._defaultTendencies(),
      confidence: 0.3,
      sampleSize: 0
    };
  }

  _defaultPrediction() {
    return {
      likelyAction: 'unknown',
      confidence: 0,
      reasoning: '对手数据不足',
      recommendedResponse: '稳健策略，观察后再做判断'
    };
  }

  _defaultTendencies() {
    return {
      firstActionBias: 0.5,
      attackWhenLow: 0.5,
      savePowerCards: 0.5,
      predictablePatterns: []
    };
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.ReplayStorage = ReplayStorage;
  window.ReplayAnalyzer = ReplayAnalyzer;
  window.DeckAdvisorAgent = DeckAdvisorAgent;
  window.OpponentModelAgent = OpponentModelAgent;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReplayStorage, ReplayAnalyzer, DeckAdvisorAgent, OpponentModelAgent };
}