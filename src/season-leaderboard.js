/**
 * Season Leaderboard (Iteration 5/9)
 * 赛季积分排行榜 + 排名变化追踪 + 奖励门槛计算
 */

class SeasonLeaderboard {
  constructor(options = {}) {
    this.seasonId = options.seasonId || 'default';
    this.rankings = [];
    this.playerRanks = new Map();
    this.previousRanks = new Map();
  }

  /**
   * 注册玩家
   * @param {string} playerId - 玩家ID
   * @param {string} name - 玩家名称
   */
  registerPlayer(playerId, name) {
    if (this.playerRanks.has(playerId)) return;

    const entry = {
      playerId,
      name: name || playerId,
      score: 0,
      rank: 0,
      previousRank: 0,
      lastUpdate: Date.now()
    };

    this.playerRanks.set(playerId, entry);
    this.updateRankings();
  }

  /**
   * 更新玩家分数
   * @param {string} playerId - 玩家ID
   * @param {number} points - 分数增量
   */
  updateScore(playerId, points) {
    if (!this.playerRanks.has(playerId)) {
      this.registerPlayer(playerId);
    }

    const entry = this.playerRanks.get(playerId);
    entry.previousRank = entry.rank;
    entry.score += points;
    entry.lastUpdate = Date.now();

    this.updateRankings();
  }

  /**
   * 获取玩家分数
   * @param {string} playerId - 玩家ID
   * @returns {number}
   */
  getScore(playerId) {
    const entry = this.playerRanks.get(playerId);
    return entry ? entry.score : 0;
  }

  /**
   * 获取玩家排名
   * @param {string} playerId - 玩家ID
   * @returns {number}
   */
  getRank(playerId) {
    const entry = this.playerRanks.get(playerId);
    return entry ? entry.rank : 0;
  }

  /**
   * 获取排行榜
   * @returns {object[]}
   */
  getRankings() {
    return [...this.rankings];
  }

  /**
   * 获取前N名玩家
   * @param {number} count - 数量
   * @returns {object[]}
   */
  getTopPlayers(count) {
    return this.rankings.slice(0, count);
  }

  /**
   * 获取玩家信息
   * @param {string} playerId - 玩家ID
   * @returns {object|null}
   */
  getPlayerInfo(playerId) {
    return this.playerRanks.get(playerId) || null;
  }

  /**
   * 获取玩家名称
   * @param {string} playerId - 玩家ID
   * @returns {string}
   */
  getPlayerName(playerId) {
    const entry = this.playerRanks.get(playerId);
    return entry ? entry.name : playerId;
  }

  /**
   * 计算奖励门槛分数
   * @param {number} percentile - 百分比 (0-100)
   * @returns {number}
   */
  calculateRewardThreshold(percentile) {
    if (this.rankings.length === 0) return 0;

    const index = Math.floor(this.rankings.length * (1 - percentile / 100));
    if (index >= this.rankings.length) return this.rankings[this.rankings.length - 1].score;
    if (index < 0) return this.rankings[0].score;

    return this.rankings[index].score;
  }

  /**
   * 获取达到门槛的玩家
   * @param {number} threshold - 门槛分数
   * @returns {object[]}
   */
  getPlayersAtThreshold(threshold) {
    return this.rankings.filter(p => p.score >= threshold);
  }

  /**
   * 追踪排名变化
   * @param {string} playerId - 玩家ID
   * @returns {number} 排名变化 (负数表示下降)
   */
  trackRankChange(playerId) {
    const entry = this.playerRanks.get(playerId);
    if (!entry) return 0;

    const change = entry.previousRank - entry.rank;
    entry.previousRank = entry.rank;
    return change;
  }

  /**
   * 获取排名变化
   * @param {string} playerId - 玩家ID
   * @returns {number}
   */
  getRankChange(playerId) {
    const entry = this.playerRanks.get(playerId);
    if (!entry) return 0;
    return entry.previousRank - entry.rank;
  }

  /**
   * 重置排行榜
   */
  resetLeaderboard() {
    this.rankings = [];
    this.playerRanks.clear();
    this.previousRanks.clear();
  }

  /**
   * 获取总玩家数
   * @returns {number}
   */
  getTotalPlayers() {
    return this.playerRanks.size;
  }

  /**
   * 获取玩家百分位
   * @param {string} playerId - 玩家ID
   * @returns {number} 百分位 (0-100)
   */
  getPercentile(playerId) {
    const entry = this.playerRanks.get(playerId);
    if (!entry || entry.rank === 0) return 0;

    const rank = entry.rank;
    const total = this.getTotalPlayers();
    return Math.round((1 - rank / total) * 100);
  }

  /**
   * 更新排行榜
   */
  updateRankings() {
    this.rankings = Array.from(this.playerRanks.values())
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    for (const ranked of this.rankings) {
      const entry = this.playerRanks.get(ranked.playerId);
      entry.rank = ranked.rank;
    }
  }
}

module.exports = { SeasonLeaderboard };