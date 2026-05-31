/**
 * Challenge UI (Iteration 5/9)
 * 挑战列表展示 + 进度追踪 + 奖励领取界面
 */

class ChallengeUI {
  constructor(challengeManager) {
    this.manager = challengeManager;
    this.filteredType = 'all';
    this.rendered = false;
    this.modalShown = false;
    this.notification = null;
    this.lastUpdated = null;
    this.animationActive = false;
    this.challengeCards = new Map();
  }

  /**
   * 渲染挑战界面
   * @returns {string} HTML
   */
  render() {
    const challenges = this.getFilteredChallenges();
    const html = this.renderChallengeList(challenges);
    this.rendered = true;
    this.lastUpdated = Date.now();
    return html;
  }

  /**
   * 渲染挑战列表
   * @param {object[]} challenges - 挑战列表
   * @returns {string} HTML
   */
  renderChallengeList(challenges) {
    if (challenges.length === 0) {
      return '<div class="no-challenges">No challenges available</div>';
    }

    let html = '<div class="challenge-list">';
    for (const challenge of challenges) {
      html += this.renderChallengeCard(challenge);
    }
    html += '</div>';
    return html;
  }

  /**
   * 渲染单个挑战卡片
   * @param {object} challenge - 挑战对象
   * @returns {string} HTML
   */
  renderChallengeCard(challenge) {
    const progress = this.manager.getProgress(challenge.id);
    const percentage = this.manager.getCompletionPercentage(challenge.id);
    const isCompleted = this.manager.isCompleted(challenge.id);
    const isClaimed = this.manager.isClaimed(challenge.id);
    const icon = this.getChallengeIcon(challenge.type);

    const statusClass = isClaimed ? 'claimed' : isCompleted ? 'completed' : 'active';
    const progressBar = this.renderProgressBar(percentage);
    const rewardSection = this.renderRewardSection(challenge.rewards || []);

    return `
      <div class="challenge-card ${statusClass}" data-challenge-id="${challenge.id}">
        <div class="challenge-header">
          <span class="challenge-icon">${icon}</span>
          <span class="challenge-title">${challenge.title}</span>
        </div>
        <div class="challenge-description">${challenge.description || ''}</div>
        <div class="challenge-progress">
          <div class="progress-text">${progress}/${challenge.target}</div>
          ${progressBar}
        </div>
        <div class="challenge-rewards">${rewardSection}</div>
        ${this.renderClaimButton(challenge.id, isCompleted, isClaimed)}
      </div>
    `;
  }

  /**
   * 渲染进度条
   * @param {number} percentage - 百分比
   * @returns {string} HTML
   */
  renderProgressBar(percentage) {
    const capped = Math.min(percentage, 100);
    return `
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${capped}%"></div>
        <div class="progress-label">${capped}%</div>
      </div>
    `;
  }

  /**
   * 渲染奖励区域
   * @param {object[]} rewards - 奖励列表
   * @returns {string} HTML
   */
  renderRewardSection(rewards) {
    if (!rewards || rewards.length === 0) {
      return '<div class="no-rewards">No rewards</div>';
    }

    let html = '<div class="reward-items">';
    for (const reward of rewards) {
      const icon = this.getRewardIcon(reward);
      html += `<span class="reward-item" title="${reward.id}">${icon}</span>`;
    }
    html += '</div>';
    return html;
  }

  /**
   * 渲染领取按钮
   * @param {string} challengeId - 挑战ID
   * @param {boolean} isCompleted - 是否完成
   * @param {boolean} isClaimed - 是否已领取
   * @returns {string} HTML
   */
  renderClaimButton(challengeId, isCompleted, isClaimed) {
    if (isClaimed) {
      return '<button class="claim-btn claimed" disabled>Claimed</button>';
    }
    if (!isCompleted) {
      return '<button class="claim-btn" disabled>Locked</button>';
    }
    return `<button class="claim-btn available" data-challenge-id="${challengeId}">Claim</button>`;
  }

  /**
   * 根据类型筛选挑战
   * @param {string} type - 类型 (daily/weekly/seasonal/all)
   */
  filterByType(type) {
    this.filteredType = type;
  }

  /**
   * 获取筛选后的挑战列表
   * @returns {object[]}
   */
  getFilteredChallenges() {
    if (this.filteredType === 'all') {
      return this.manager.getActiveChallenges(true);
    }
    return this.manager.getChallengesByType(this.filteredType);
  }

  /**
   * 显示奖励领取弹窗
   * @param {string} challengeId - 挑战ID
   * @returns {boolean} 是否显示成功
   */
  showClaimModal(challengeId) {
    const challenge = this.manager.getChallengeById(challengeId);
    if (!challenge) return false;

    const isCompleted = this.manager.isCompleted(challengeId);
    if (!isCompleted) return false;

    const rewards = this.manager.claimReward(challengeId);
    if (!rewards) return false;

    this.modalShown = true;
    return true;
  }

  /**
   * 隐藏弹窗
   */
  hideModal() {
    this.modalShown = false;
  }

  /**
   * 更新挑战显示
   * @param {string} challengeId - 挑战ID
   */
  updateChallengeDisplay(challengeId) {
    this.lastUpdated = Date.now();
    const card = this.challengeCards.get(challengeId);
    if (card) {
      const challenge = this.manager.getChallengeById(challengeId);
      if (challenge) {
        const newHtml = this.renderChallengeCard(challenge);
        return newHtml;
      }
    }
    return null;
  }

  /**
   * 获取挑战图标
   * @param {string} type - 类型
   * @returns {string} emoji
   */
  getChallengeIcon(type) {
    switch (type) {
      case 'daily':
        return '📅';
      case 'weekly':
        return '📆';
      case 'seasonal':
        return '🏆';
      default:
        return '⭐';
    }
  }

  /**
   * 获取奖励图标
   * @param {object} reward - 奖励
   * @returns {string} emoji
   */
  getRewardIcon(reward) {
    switch (reward.type) {
      case 'card':
        return '🃏';
      case 'material':
        return '💎';
      case 'title':
        return '👑';
      default:
        return '🎁';
    }
  }

  /**
   * 动画进度更新
   * @param {string} challengeId - 挑战ID
   * @param {number} fromValue - 起始值
   * @param {number} toValue - 结束值
   */
  animateProgress(challengeId, fromValue, toValue) {
    this.animationActive = true;
    setTimeout(() => {
      this.animationActive = false;
    }, 500);
  }

  /**
   * 显示通知
   * @param {string} message - 消息
   * @param {string} type - 类型 (success/error/info)
   */
  showNotification(message, type = 'info') {
    this.notification = { message, type };
    setTimeout(() => {
      this.clearNotification();
    }, 3000);
  }

  /**
   * 清除通知
   */
  clearNotification() {
    this.notification = null;
  }

  /**
   * 刷新UI
   */
  refreshUI() {
    this.render();
  }

  /**
   * 获取统计数据
   * @returns {object}
   */
  getStats() {
    const challenges = this.manager.getActiveChallenges(true);
    const completed = challenges.filter(c => this.manager.isCompleted(c.id)).length;
    const claimed = challenges.filter(c => this.manager.isClaimed(c.id)).length;

    return {
      total: challenges.length,
      completed,
      claimed,
      active: completed - claimed
    };
  }
}

module.exports = { ChallengeUI };