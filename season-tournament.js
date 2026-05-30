/**
 * V102 Season Tournament Expansion
 * 锦标赛系统：TournamentBracket | ELORating | SeasonTournament
 * 
 * 概念：扩展赛季锦标赛功能，增加锦标赛bracket、选手ELO积分、淘汰赛制
 * 设计来源：generic-agent Self-Evolution | thunderbolt feedback loops | chatdev multi-agent
 */

// ===== TournamentBracket - 锦标赛Bracket管理 =====
//import { ELORating } from './season-tournament.js';

class TournamentBracket {
  constructor() {
    this.brackets = new Map(); // tournamentId -> bracket data
    this.MATCH_STATUS = {
      PENDING: 'pending',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed'
    };
  }

  /**
   * 创建锦标赛bracket
   * @param {string} tournamentId - 锦标赛ID
   * @param {array} players - 玩家列表 [{ id, name, seed }]
   * @param {string} bracketType - bracket类型 'single_elimination' | 'double_elimination'
   * @returns {object} 创建的bracket结构
   */
  createBracket(tournamentId, players, bracketType = 'single_elimination') {
    if (!tournamentId || !players || players.length < 2) {
      return null;
    }

    // 确保玩家数量是2的幂
    const playerCount = this._nextPowerOfTwo(players.length);
    const seededPlayers = this._seedPlayers(players, playerCount);

    const bracket = {
      id: tournamentId,
      type: bracketType,
      status: 'created',
      createdAt: Date.now(),
      players: seededPlayers,
      rounds: this._generateRounds(seededPlayers, bracketType),
      winners: [],
      losers: [],
      champion: null,
      matches: new Map() // matchId -> match data
    };

    // 初始化所有比赛
    this._initializeMatches(bracket);
    this.brackets.set(tournamentId, bracket);
    return bracket;
  }

  /**
   * 获取bracket
   * @param {string} tournamentId - 锦标赛ID
   * @returns {object|null} bracket数据
   */
  getBracket(tournamentId) {
    return this.brackets.get(tournamentId) || null;
  }

  /**
   * 获取锦标赛的所有比赛
   * @param {string} tournamentId - 锦标赛ID
   * @returns {array} 比赛列表
   */
  getMatches(tournamentId) {
    const bracket = this.brackets.get(tournamentId);
    if (!bracket) return [];
    return Array.from(bracket.matches.values());
  }

  /**
   * 获取特定轮次的比赛
   * @param {string} tournamentId - 锦标赛ID
   * @param {number} round - 轮次编号
   * @returns {array} 该轮次的比赛列表
   */
  getMatchesByRound(tournamentId, round) {
    const bracket = this.brackets.get(tournamentId);
    if (!bracket) return [];
    return Array.from(bracket.matches.values()).filter(m => m.round === round);
  }

  /**
   * 模拟比赛
   * @param {string} tournamentId - 锦标赛ID
   * @param {string} matchId - 比赛ID
   * @param {object} options - 模拟选项 { winnerId, randomSeed }
   * @returns {object|null} 比赛结果
   */
  simulateMatch(tournamentId, matchId, options = {}) {
    const bracket = this.brackets.get(tournamentId);
    if (!bracket) return null;

    const match = bracket.matches.get(matchId);
    if (!match || match.status === this.MATCH_STATUS.COMPLETED) {
      return null;
    }

    const { player1, player2 } = match;
    if (!player1 || !player2) return null;

    // 确定胜者
    let winner;
    if (options.winnerId) {
      winner = options.winnerId === player1.id ? player1 : player2;
    } else {
      // 随机决定，使用seed保证可复现性
      const seed = options.randomSeed || Date.now();
      winner = this._determineWinner(player1, player2, seed);
    }

    const loser = winner.id === player1.id ? player2 : player1;

    // 更新比赛状态
    match.status = this.MATCH_STATUS.COMPLETED;
    match.winner = winner;
    match.loser = loser;
    match.completedAt = Date.now();

    // 记录结果到bracket
    if (!bracket.results) bracket.results = [];
    bracket.results.push({
      matchId,
      winner: winner.id,
      loser: loser.id,
      round: match.round,
      timestamp: Date.now()
    });

    // 更新选手胜负记录
    this._updatePlayerMatchRecord(bracket, winner.id, true);
    this._updatePlayerMatchRecord(bracket, loser.id, false);

    // 处理晋级
    this.advanceWinners(tournamentId, matchId, winner);

    return {
      matchId,
      winner: winner.id,
      loser: loser.id,
      winnerName: winner.name,
      loserName: loser.name
    };
  }

  /**
   * 晋级胜者到下一轮
   * @param {string} tournamentId - 锦标赛ID
   * @param {string} matchId - 比赛ID
   * @param {object} winner - 胜者玩家对象
   */
  advanceWinners(tournamentId, matchId, winner) {
    const bracket = this.brackets.get(tournamentId);
    if (!bracket) return;

    const match = bracket.matches.get(matchId);
    if (!match) return;

    // 查找下一轮的对手
    const nextMatchId = match.nextMatchId;
    if (nextMatchId) {
      const nextMatch = bracket.matches.get(nextMatchId);
      if (nextMatch) {
        // 根据nextSlot决定放置位置
        // nextSlot=1 → player1, nextSlot=2 → player2
        if (match.nextSlot === 1) {
          nextMatch.player1 = winner;
        } else {
          nextMatch.player2 = winner;
        }
        
        // 如果双方都有了，开始下一轮比赛
        if (nextMatch.player1 && nextMatch.player2) {
          nextMatch.status = this.MATCH_STATUS.IN_PROGRESS;
        }
      }
    } else {
      // 没有下一轮，这是决赛
      bracket.champion = winner;
      bracket.status = 'completed';
      bracket.completedAt = Date.now();
      bracket.winners.push(winner);
    }
  }

  /**
   * 获取冠军
   * @param {string} tournamentId - 锦标赛ID
   * @returns {object|null} 冠军信息
   */
  getChampion(tournamentId) {
    const bracket = this.brackets.get(tournamentId);
    if (!bracket) return null;
    return bracket.champion;
  }

  /**
   * 获取当前轮次
   * @param {string} tournamentId - 锦标赛ID
   * @returns {number} 当前轮次编号
   */
  getCurrentRound(tournamentId) {
    const bracket = this.brackets.get(tournamentId);
    if (!bracket) return -1;

    let currentRound = bracket.rounds.length;
    for (const match of bracket.matches.values()) {
      if (match.status === this.MATCH_STATUS.COMPLETED && match.round < currentRound) {
        currentRound = match.round - 1;
      }
    }
    return currentRound > 0 ? currentRound : 1;
  }

  /**
   * 删除锦标赛
   * @param {string} tournamentId - 锦标赛ID
   */
  deleteBracket(tournamentId) {
    this.brackets.delete(tournamentId);
  }

  // ===== 私有辅助方法 =====

  /**
   * 获取下一个2的幂
   * @param {number} n
   * @returns {number}
   */
  _nextPowerOfTwo(n) {
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  }

  /**
   * 种子玩家（填充bye）
   * @param {array} players
   * @param {number} targetCount
   * @returns {array}
   */
  _seedPlayers(players, targetCount) {
    // 按种子排序
    const sorted = [...players].sort((a, b) => (a.seed || 999) - (b.seed || 999));
    
    // 填充bye（虚拟对手）
    while (sorted.length < targetCount) {
      sorted.push({
        id: 'bye_' + sorted.length,
        name: 'BYE',
        isBye: true
      });
    }
    
    return sorted;
  }

  /**
   * 生成轮次结构
   * @param {array} players
   * @param {string} bracketType
   * @returns {array}
   */
  _generateRounds(players, bracketType) {
    const rounds = [];
    const numRounds = Math.log2(players.length);
    let matchIdCounter = 1;

    for (let r = 1; r <= numRounds; r++) {
      const numMatchesInRound = players.length / Math.pow(2, r);
      const round = {
        round: r,
        numMatches: numMatchesInRound,
        matches: []
      };

      for (let m = 0; m < numMatchesInRound; m++) {
        const matchId = 'M' + (matchIdCounter++);
        round.matches.push(matchId);
      }
      rounds.push(round);
    }

    return rounds;
  }

  /**
   * 初始化所有比赛
   * @param {object} bracket
   */
  _initializeMatches(bracket) {
    const players = bracket.players;
    const numRounds = bracket.rounds.length;
    let matchIdCounter = 1;

    // 第一轮：两两配对
    const firstRound = bracket.rounds[0];
    const firstRoundMatches = [];

    for (let i = 0; i < firstRound.numMatches; i++) {
      const matchId = 'M' + (matchIdCounter++);
      const player1 = players[i * 2];
      const player2 = players[i * 2 + 1];

      const match = {
        id: matchId,
        round: 1,
        player1,
        player2,
        status: player1.isBye || player2.isBye 
          ? this.MATCH_STATUS.COMPLETED 
          : (player1 && player2 ? this.MATCH_STATUS.IN_PROGRESS : this.MATCH_STATUS.PENDING),
        winner: player1.isBye ? player2 : (player2.isBye ? player1 : null),
        loser: player1.isBye ? player1 : (player2.isBye ? player2 : null),
        nextMatchId: null,
        nextSlot: 0
      };

      // 处理bye
      if (player1.isBye || player2.isBye) {
        match.completedAt = Date.now();
        if (!bracket.results) bracket.results = [];
        const winner = player1.isBye ? player2 : player1;
        const loser = player1.isBye ? player1 : player2;
        bracket.results.push({
          matchId,
          winner: winner.id,
          loser: loser.id,
          round: 1,
          timestamp: Date.now()
        });
        this._updatePlayerMatchRecord(bracket, winner.id, true);
        bracket.winners.push(winner);
      }

      firstRoundMatches.push(match);
      bracket.matches.set(matchId, match);
    }

    // 后续轮次：链接到下一轮
    for (let r = 0; r < numRounds - 1; r++) {
      const currentRoundMatches = r === 0 ? firstRoundMatches : 
        bracket.rounds[r].matches.map(mid => bracket.matches.get(mid));
      const nextRoundMatches = [];

      for (let i = 0; i < currentRoundMatches.length; i += 2) {
        const matchId = 'M' + (matchIdCounter++);
        const upperMatch = currentRoundMatches[i];
        const lowerMatch = currentRoundMatches[i + 1];

        const match = {
          id: matchId,
          round: r + 2,
          player1: upperMatch?.winner || null,
          player2: lowerMatch?.winner || null,
          status: (upperMatch?.winner && lowerMatch?.winner) 
            ? this.MATCH_STATUS.IN_PROGRESS 
            : this.MATCH_STATUS.PENDING,
          nextMatchId: null,
          nextSlot: 0
        };

        // 链接上一轮的比赛
        upperMatch.nextMatchId = matchId;
        upperMatch.nextSlot = 1;
        lowerMatch.nextMatchId = matchId;
        lowerMatch.nextSlot = 2;

        nextRoundMatches.push(match);
        bracket.matches.set(matchId, match);
      }
    }

    // 设置最后一轮的nextMatchId为null（决赛）
    const lastRound = bracket.rounds[bracket.rounds.length - 1];
    const finalMatchId = lastRound.matches[0];
    if (finalMatchId) {
      const finalMatch = bracket.matches.get(finalMatchId);
      if (finalMatch) {
        finalMatch.nextMatchId = null;
      }
    }
  }

  /**
   * 确定比赛胜者（基于seed和随机性）
   * @param {object} player1
   * @param {object} player2
   * @param {number} seed
   * @returns {object} 胜者
   */
  _determineWinner(player1, player2, seed) {
    // 简单伪随机：基于seed和玩家ID生成确定性结果
    // 实际应用中应该调用外部ELO系统
    const hash = this._simpleHash(seed + player1.id.charCodeAt(0) + player2.id.charCodeAt(0));
    return hash % 2 === 0 ? player1 : player2;
  }

  /**
   * 简单哈希函数
   * @param {number} n
   * @returns {number}
   */
  _simpleHash(n) {
    let x = n;
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = (x >> 16) ^ x;
    return Math.abs(x);
  }

  /**
   * 更新玩家比赛记录
   * @param {object} bracket
   * @param {string} playerId
   * @param {boolean} won
   */
  _updatePlayerMatchRecord(bracket, playerId, won) {
    if (!bracket.playerRecords) bracket.playerRecords = {};
    if (!bracket.playerRecords[playerId]) {
      bracket.playerRecords[playerId] = { wins: 0, losses: 0 };
    }
    if (won) {
      bracket.playerRecords[playerId].wins++;
    } else {
      bracket.playerRecords[playerId].losses++;
    }
  }
}

// ===== ELORating - ELO积分系统 =====
//import { TournamentBracket } from './season-tournament.js';

class ELORating {
  constructor() {
    this.DEFAULT_INITIAL_RATING = 1500;
    this.DEFAULT_K_FACTOR = 32;
    this.RATING_KEY_PREFIX = 'elo_rating_';
    this.ratings = new Map(); // 内存缓存
  }

  /**
   * 计算新ELO评分
   * @param {string} playerId - 玩家ID
   * @param {string} opponentId - 对手ID
   * @param {string} result - 结果 'win' | 'loss' | 'draw'
   * @param {object} options - 选项 { kFactor, expectedScore }
   * @returns {object} 新旧评分信息
   */
  calculateNewRating(playerId, opponentId, result, options = {}) {
    if (!playerId || !opponentId || !result) return null;

    const playerRating = this.getPlayerRating(playerId);
    const opponentRating = this.getPlayerRating(opponentId);
    const kFactor = options.kFactor || this.DEFAULT_K_FACTOR;

    // 计算期望分数
    const expectedScore = this._calculateExpectedScore(playerRating, opponentRating);
    
    // 实际分数
    let actualScore;
    switch (result) {
      case 'win': actualScore = 1; break;
      case 'loss': actualScore = 0; break;
      case 'draw': actualScore = 0.5; break;
      default: return null;
    }

    // 计算新评分
    const ratingChange = Math.round(kFactor * (actualScore - expectedScore));
    const newRating = playerRating + ratingChange;

    // 保存新评分
    this._savePlayerRating(playerId, newRating);

    return {
      playerId,
      previousRating: playerRating,
      newRating,
      ratingChange,
      opponentId,
      opponentRating,
      expectedScore: expectedScore.toFixed(2),
      actualScore,
      result
    };
  }

  /**
   * 批量计算ELO（用于锦标赛）
   * @param {array} matches - 比赛列表 [{ winnerId, loserId, isDraw }]
   * @returns {array} 所有评分变化
   */
  calculateBatchRatings(matches) {
    const results = [];
    for (const match of matches) {
      const result = match.isDraw ? 'draw' : 'win';
      const ratingChange = this.calculateNewRating(match.winnerId, match.loserId, result);
      if (ratingChange) {
        results.push(ratingChange);
      }
    }
    return results;
  }

  /**
   * 获取玩家ELO评分
   * @param {string} playerId - 玩家ID
   * @returns {number} 当前评分
   */
  getPlayerRating(playerId) {
    if (!playerId) return this.DEFAULT_INITIAL_RATING;

    // 先检查内存缓存
    if (this.ratings.has(playerId)) {
      return this.ratings.get(playerId);
    }

    // 从localStorage加载
    try {
      const data = localStorage.getItem(this.RATING_KEY_PREFIX + playerId);
      return data ? parseInt(data, 10) : this.DEFAULT_INITIAL_RATING;
    } catch {
      return this.DEFAULT_INITIAL_RATING;
    }
  }

  /**
   * 设置玩家ELO评分
   * @param {string} playerId - 玩家ID
   * @param {number} rating - 评分值
   */
  setPlayerRating(playerId, rating) {
    if (!playerId) return false;
    this._savePlayerRating(playerId, rating);
    return true;
  }

  /**
   * 获取排行榜
   * @param {number} limit - 返回数量限制
   * @returns {array} 排名列表 [{ rank, playerId, rating }]
   */
  getTopPlayers(limit = 10) {
    const allRatings = [];

    // 从localStorage收集所有评分
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.RATING_KEY_PREFIX)) {
          const playerId = key.replace(this.RATING_KEY_PREFIX, '');
          const rating = parseInt(localStorage.getItem(key), 10);
          allRatings.push({ playerId, rating });
        }
      }
    } catch (e) {
      console.warn('[ELORating] getTopPlayers failed:', e);
    }

    // 添加内存缓存中的数据
    for (const [playerId, rating] of this.ratings) {
      if (!allRatings.find(r => r.playerId === playerId)) {
        allRatings.push({ playerId, rating });
      }
    }

    // 排序并限制数量
    allRatings.sort((a, b) => b.rating - a.rating);
    return allRatings.slice(0, limit).map((r, index) => ({
      rank: index + 1,
      playerId: r.playerId,
      rating: r.rating
    }));
  }

  /**
   * 获取玩家的排名
   * @param {string} playerId - 玩家ID
   * @returns {number} 排名（1为最高）
   */
  getPlayerRank(playerId) {
    const topPlayers = this.getTopPlayers(9999);
    const index = topPlayers.findIndex(p => p.playerId === playerId);
    return index >= 0 ? index + 1 : -1;
  }

  /**
   * 重置玩家评分
   * @param {string} playerId - 玩家ID
   */
  resetPlayerRating(playerId) {
    if (playerId) {
      this.ratings.delete(playerId);
      localStorage.removeItem(this.RATING_KEY_PREFIX + playerId);
    }
  }

  /**
   * 重置所有评分
   */
  resetAllRatings() {
    this.ratings.clear();
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.RATING_KEY_PREFIX)) {
          keys.push(key);
        }
      }
    } catch (e) {
      console.warn('[ELORating] resetAllRatings failed:', e);
    }
    keys.forEach(key => localStorage.removeItem(key));
  }

  // ===== 私有辅助方法 =====

  /**
   * 计算期望分数（ELO公式）
   * @param {number} playerRating
   * @param {number} opponentRating
   * @returns {number}
   */
  _calculateExpectedScore(playerRating, opponentRating) {
    const exponent = (opponentRating - playerRating) / 400;
    return 1 / (1 + Math.pow(10, exponent));
  }

  /**
   * 保存玩家评分
   * @param {string} playerId
   * @param {number} rating
   */
  _savePlayerRating(playerId, rating) {
    const validatedRating = Math.max(100, Math.round(rating)); // ELO最低100
    this.ratings.set(playerId, validatedRating);
    try {
      localStorage.setItem(this.RATING_KEY_PREFIX + playerId, validatedRating.toString());
    } catch (e) {
      console.warn('[ELORating] _savePlayerRating failed:', e);
    }
  }
}

// ===== SeasonTournament - 赛季锦标赛系统 =====
//import { TournamentBracket } from './TournamentBracket';
//import { ELORating } from './ELORating';

class SeasonTournament {
  constructor(seasonManager, eloRating, tournamentBracket) {
    this.seasonMgr = seasonManager || null;
    this.eloRating = eloRating || new ELORating();
    this.bracket = tournamentBracket || new TournamentBracket();
    this.TOURNAMENT_KEY = 'season_tournament_';
    this.participants = new Map(); // tournamentId -> Set of playerIds
  }

  /**
   * 注册锦标赛
   * @param {string} tournamentId - 锦标赛ID
   * @param {string} playerId - 玩家ID
   * @param {object} playerInfo - 玩家信息 { name, deckId }
   * @returns {boolean} 是否注册成功
   */
  registerForTournament(tournamentId, playerId, playerInfo = {}) {
    if (!tournamentId || !playerId) return false;

    if (!this.participants.has(tournamentId)) {
      this.participants.set(tournamentId, new Set());
    }

    const participants = this.participants.get(tournamentId);
    if (participants.has(playerId)) {
      return false; // 已注册
    }

    participants.add(playerId);

    // 保存玩家信息到localStorage
    try {
      const key = this.TOURNAMENT_KEY + tournamentId + '_player_' + playerId;
      const data = {
        playerId,
        name: playerInfo.name || playerId,
        deckId: playerInfo.deckId || null,
        registeredAt: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('[SeasonTournament] registerForTournament failed:', e);
    }

    return true;
  }

  /**
   * 获取锦标赛的注册玩家
   * @param {string} tournamentId - 锦标赛ID
   * @returns {array} 玩家列表
   */
  getRegisteredPlayers(tournamentId) {
    if (!tournamentId) return [];

    const players = [];

    // 首先从localStorage读取所有注册的玩家
    try {
      const prefix = this.TOURNAMENT_KEY + tournamentId + '_player_';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const data = localStorage.getItem(key);
          if (data) {
            players.push(JSON.parse(data));
          }
        }
      }
    } catch (e) {
      console.warn('[SeasonTournament] getRegisteredPlayers failed:', e);
    }

    return players;
  }

  /**
   * 开始锦标赛
   * @param {string} tournamentId - 锦标赛ID
   * @param {object} options - 选项 { bracketType, seed }
   * @returns {object|null} bracket数据
   */
  startTournament(tournamentId, options = {}) {
    if (!tournamentId) return null;

    const players = this.getRegisteredPlayers(tournamentId);
    if (players.length < 2) {
      return null; // 需要至少2个玩家
    }

    // 创建bracket
    const bracketType = options.bracketType || 'single_elimination';
    const bracket = this.bracket.createBracket(tournamentId, players, bracketType);

    if (bracket) {
      // 保存到localStorage
      try {
        localStorage.setItem(
          this.TOURNAMENT_KEY + tournamentId + '_bracket',
          JSON.stringify({ ...bracket, matches: Array.from(bracket.matches.entries()) })
        );
      } catch (e) {
        console.warn('[SeasonTournament] startTournament save failed:', e);
      }
    }

    return bracket;
  }

  /**
   * 记录比赛结果
   * @param {string} tournamentId - 锦标赛ID
   * @param {string} playerId - 玩家ID
   * @param {string} opponentId - 对手ID
   * @param {string} result - 结果 'win' | 'loss' | 'draw'
   * @returns {object|null} 结果
   */
  recordMatchResult(tournamentId, playerId, opponentId, result) {
    if (!tournamentId || !playerId || !opponentId || !result) {
      return null;
    }

    // 更新ELO
    const eloResult = this.eloRating.calculateNewRating(playerId, opponentId, result);

    if (eloResult) {
      // 同时更新对手的ELO（镜像）
      const opponentResult = result === 'win' ? 'loss' : (result === 'loss' ? 'win' : 'draw');
      this.eloRating.calculateNewRating(opponentId, playerId, opponentResult);
    }

    return eloResult;
  }

  /**
   * 分发锦标赛奖励
   * @param {string} tournamentId - 锦标赛ID
   * @param {object} options - 选项 { rewardMultiplier }
   * @returns {array} 奖励详情列表
   */
  distributeTournamentRewards(tournamentId, options = {}) {
    if (!tournamentId) return [];

    const bracket = this.bracket.getBracket(tournamentId);
    if (!bracket || !bracket.champion) {
      return [];
    }

    const rewards = [];
    const multiplier = options.rewardMultiplier || 1;

    // 计算奖励
    const ranking = this._calculateTournamentRanking(tournamentId);

    ranking.forEach((entry, index) => {
      const rank = index + 1;
      const baseReward = this._getBaseRewardForRank(rank);
      const reward = {
        playerId: entry.playerId,
        rank,
        rating: this.eloRating.getPlayerRating(entry.playerId),
        baseReward,
        totalReward: Math.round(baseReward * multiplier),
        distributed: false
      };
      rewards.push(reward);
    });

    // 保存奖励记录
    try {
      localStorage.setItem(
        this.TOURNAMENT_KEY + tournamentId + '_rewards',
        JSON.stringify(rewards)
      );
    } catch (e) {
      console.warn('[SeasonTournament] distributeTournamentRewards failed:', e);
    }

    return rewards;
  }

  /**
   * 获取锦标赛历史
   * @param {string} playerId - 玩家ID（可选）
   * @returns {array} 锦标赛列表
   */
  getTournamentHistory(playerId = null) {
    const tournaments = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.TOURNAMENT_KEY) && key.includes('_bracket')) {
          const tournamentId = key.replace(this.TOURNAMENT_KEY, '').replace('_bracket', '');
          const data = localStorage.getItem(key);
          if (data) {
            const bracket = JSON.parse(data);
            // 如果指定了playerId，检查是否参与了该锦标赛
            if (!playerId || this._playerInTournament(tournamentId, playerId)) {
              tournaments.push({
                id: tournamentId,
                champion: bracket.champion,
                status: bracket.status,
                completedAt: bracket.completedAt,
                createdAt: bracket.createdAt
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[SeasonTournament] getTournamentHistory failed:', e);
    }

    return tournaments.sort((a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt));
  }

  /**
   * 获取玩家的ELO评分历史
   * @param {string} playerId - 玩家ID
   * @returns {array} 评分变化历史
   */
  getPlayerRatingHistory(playerId) {
    if (!playerId) return [];

    const history = [];
    try {
      const key = this.RATING_KEY_PREFIX + playerId + '_history';
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn('[SeasonTournament] getPlayerRatingHistory failed:', e);
    }
    return history;
  }

  /**
   * 获取玩家的比赛记录
   * @param {string} playerId - 玩家ID
   * @returns {array} 比赛记录
   */
  getPlayerMatchHistory(playerId) {
    if (!playerId) return [];

    const matches = [];
    try {
      const key = 'elo_match_' + playerId;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('[SeasonTournament] getPlayerMatchHistory failed:', e);
    }
    return matches;
  }

  /**
   * 重置锦标赛数据
   * @param {string} tournamentId - 锦标赛ID
   */
  resetTournament(tournamentId) {
    if (!tournamentId) return;

    this.bracket.deleteBracket(tournamentId);
    this.participants.delete(tournamentId);

    // 清理localStorage
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(tournamentId)) {
          keys.push(key);
        }
      }
    } catch (e) {
      console.warn('[SeasonTournament] resetTournament failed:', e);
    }
    keys.forEach(key => localStorage.removeItem(key));
  }

  // ===== 私有辅助方法 =====

  /**
   * 计算锦标赛排名
   * @param {string} tournamentId
   * @returns {array}
   */
  _calculateTournamentRanking(tournamentId) {
    const bracket = this.bracket.getBracket(tournamentId);
    if (!bracket) return [];

    const ranking = [];

    // 收集所有参与者
    const players = this.getRegisteredPlayers(tournamentId);
    for (const player of players) {
      const playerId = player.playerId;
      const rating = this.eloRating.getPlayerRating(playerId);
      const record = bracket.playerRecords?.[playerId] || { wins: 0, losses: 0 };
      ranking.push({
        playerId,
        rating,
        wins: record.wins,
        losses: record.losses
      });
    }

    // 按ELO排序（如果有记录），否则按胜场
    ranking.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.rating - a.rating;
    });

    return ranking;
  }

  /**
   * 获取排名的基础奖励
   * @param {number} rank
   * @returns {number}
   */
  _getBaseRewardForRank(rank) {
    const baseRewards = {
      1: 1000,  // 冠军
      2: 500,   // 亚军
      3: 250,   // 季军
      4: 100    // 第四名
    };
    return baseRewards[rank] || 50;
  }

  /**
   * 检查玩家是否参与了锦标赛
   * @param {string} tournamentId
   * @param {string} playerId
   * @returns {boolean}
   */
  _playerInTournament(tournamentId, playerId) {
    const key = this.TOURNAMENT_KEY + tournamentId + '_player_' + playerId;
    return localStorage.getItem(key) !== null;
  }
}

// ===== 集成SeasonManager的SeasonTournament =====

/**
 * SeasonTournamentWithSeasonManager - 集成SeasonManager的完整赛季锦标赛
 */
class SeasonTournamentWithSeasonManager extends SeasonTournament {
  constructor(seasonManager) {
    super(seasonManager, new ELORating(), new TournamentBracket());
    this.seasonMgr = seasonManager;
  }

  /**
   * 在当前赛季注册锦标赛
   * @param {string} playerId - 玩家ID
   * @param {object} playerInfo - 玩家信息
   * @returns {object} 结果 { success, tournamentId }
   */
  registerForCurrentSeason(playerId, playerInfo = {}) {
    const season = this.seasonMgr?.getCurrentSeason();
    if (!season) {
      return { success: false, error: 'No active season' };
    }

    const tournamentId = season.id + '_tournament_' + Date.now();
    const success = this.registerForTournament(tournamentId, playerId, playerInfo);

    return {
      success,
      tournamentId: success ? tournamentId : null,
      seasonId: season.id
    };
  }

  /**
   * 在当前赛季开始锦标赛
   * @param {string} tournamentId - 锦标赛ID
   * @param {object} options - 选项
   * @returns {object} 结果
   */
  startTournamentInCurrentSeason(tournamentId, options = {}) {
    const season = this.seasonMgr?.getCurrentSeason();
    if (!season) {
      return { success: false, error: 'No active season' };
    }

    const bracket = this.startTournament(tournamentId, options);
    return {
      success: !!bracket,
      bracket
    };
  }

  /**
   * 获取当前赛季的锦标赛列表
   * @returns {array}
   */
  getCurrentSeasonTournaments() {
    const season = this.seasonMgr?.getCurrentSeason();
    if (!season) return [];

    return this.getTournamentHistory().filter(t => 
      t.id.startsWith(season.id)
    );
  }
}

// 导出给测试使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    TournamentBracket, 
    ELORating, 
    SeasonTournament,
    SeasonTournamentWithSeasonManager
  };
}