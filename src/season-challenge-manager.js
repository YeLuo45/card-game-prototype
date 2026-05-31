/**
 * Season Challenge Manager (Iteration 5/9)
 * 管理赛季挑战列表（每日/每周/赛季）+ 追踪挑战进度 + 验证完成条件
 */

class SeasonChallengeManager {
  constructor(options = {}) {
    this.seasonDays = options.seasonDays || 30;
    this.seasonStartTime = options.seasonStartTime || Date.now();
    this.challenges = [];
    this.progress = new Map();
    this.claimedRewards = new Set();
    this.eventListeners = new Map();
  }

  /**
   * 添加挑战
   * @param {object} challenge - 挑战对象
   */
  addChallenge(challenge) {
    const entry = {
      id: challenge.id,
      type: challenge.type || 'daily',
      title: challenge.title || '',
      description: challenge.description || '',
      target: challenge.target || 1,
      current: 0,
      rewards: challenge.rewards || [],
      points: challenge.points || 0,
      timestamp: Date.now()
    };

    this.challenges.push(entry);
    this.progress.set(entry.id, 0);
  }

  /**
   * 更新挑战进度
   * @param {string} challengeId - 挑战ID
   * @param {number} amount - 增量
   */
  updateProgress(challengeId, amount) {
    if (!this.progress.has(challengeId)) return;

    const challenge = this.getChallengeById(challengeId);
    if (!challenge) return;

    const current = this.progress.get(challengeId);
    const newProgress = Math.min(current + amount, challenge.target);
    this.progress.set(challengeId, newProgress);

    if (newProgress >= challenge.target && current < challenge.target) {
      this.emit('challengeCompleted', {
        challengeId,
        type: 'completed'
      });
    }
  }

  /**
   * 获取进度
   * @param {string} challengeId - 挑战ID
   * @returns {number} 当前进度
   */
  getProgress(challengeId) {
    return this.progress.get(challengeId) || 0;
  }

  /**
   * 是否已完成
   * @param {string} challengeId - 挑战ID
   * @returns {boolean}
   */
  isCompleted(challengeId) {
    const challenge = this.getChallengeById(challengeId);
    if (!challenge) return false;
    return this.getProgress(challengeId) >= challenge.target;
  }

  /**
   * 获取完成百分比
   * @param {string} challengeId - 挑战ID
   * @returns {number} 百分比 (0-100)
   */
  getCompletionPercentage(challengeId) {
    const challenge = this.getChallengeById(challengeId);
    if (!challenge) return 0;

    const current = this.getProgress(challengeId);
    return Math.min(Math.round((current / challenge.target) * 100), 100);
  }

  /**
   * 获取特定类型挑战
   * @param {string} type - 挑战类型
   * @returns {object[]} 挑战列表
   */
  getChallengesByType(type) {
    return this.challenges.filter(c => c.type === type);
  }

  /**
   * 获取活跃挑战
   * @param {boolean} includeCompleted - 是否包含已完成
   * @returns {object[]} 挑战列表
   */
  getActiveChallenges(includeCompleted = true) {
    if (includeCompleted) return [...this.challenges];
    return this.challenges.filter(c => !this.isCompleted(c.id));
  }

  /**
   * 领取奖励
   * @param {string} challengeId - 挑战ID
   * @returns {object[]|null} 奖励列表
   */
  claimReward(challengeId) {
    if (!this.isCompleted(challengeId)) return null;
    if (this.isClaimed(challengeId)) return null;

    const challenge = this.getChallengeById(challengeId);
    if (!challenge) return null;

    this.claimedRewards.add(challengeId);
    return challenge.rewards;
  }

  /**
   * 是否已领取
   * @param {string} challengeId - 挑战ID
   * @returns {boolean}
   */
  isClaimed(challengeId) {
    return this.claimedRewards.has(challengeId);
  }

  /**
   * 重置每日挑战
   */
  resetDailyChallenges() {
    const daily = this.getChallengesByType('daily');
    for (const challenge of daily) {
      this.progress.delete(challenge.id);
      this.claimedRewards.delete(challenge.id);
    }
    this.challenges = this.challenges.filter(c => c.type !== 'daily');
  }

  /**
   * 重置每周挑战
   */
  resetWeeklyChallenges() {
    const weekly = this.getChallengesByType('weekly');
    for (const challenge of weekly) {
      this.progress.delete(challenge.id);
      this.claimedRewards.delete(challenge.id);
    }
    this.challenges = this.challenges.filter(c => c.type !== 'weekly');
  }

  /**
   * 根据ID获取挑战
   * @param {string} challengeId - 挑战ID
   * @returns {object|null}
   */
  getChallengeById(challengeId) {
    return this.challenges.find(c => c.id === challengeId) || null;
  }

  /**
   * 计算赛季积分
   * @returns {number} 总积分
   */
  calculateSeasonPoints() {
    let total = 0;
    for (const challenge of this.challenges) {
      if (challenge.type === 'seasonal' && this.isClaimed(challenge.id)) {
        total += challenge.points || 0;
      }
    }
    return total;
  }

  /**
   * 获取赛季剩余时间（毫秒）
   * @returns {number}
   */
  getSeasonTimeRemaining() {
    const seasonDuration = this.seasonDays * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - this.seasonStartTime;
    return Math.max(0, seasonDuration - elapsed);
  }

  /**
   * 注册事件监听器
   * @param {string} event - 事件名
   * @param {function} callback - 回调
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * 触发事件
   * @param {string} event - 事件名
   * @param {object} data - 数据
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        callback(data);
      }
    }
  }
}

module.exports = { SeasonChallengeManager };