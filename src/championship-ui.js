/**
 * Championship UI (Iteration 9/9)
 * 锦标赛界面：赛程展示、冠军殿堂
 */

class ChampionshipUI {
  constructor(options = {}) {
    this.activeTournament = null;
    this.view = 'schedule';
    this.viewOptions = {
      showSchedule: true,
      showChampionHall: true,
      showBracket: true
    };
    this.theme = options.theme || 'default';
  }

  /**
   * 渲染赛程页面
   * @param {object[]} tournaments - 锦标赛列表
   * @returns {string} HTML
   */
  renderSchedule(tournaments) {
    let html = `<div class="championship-schedule">`;
    html += `<div class="schedule-header">`;
    html += `<h2>Tournament Schedule</h2>`;
    html += `</div>`;
    html += `<div class="schedule-list">`;

    if (tournaments.length === 0) {
      html += `<div class="no-tournaments">No upcoming tournaments</div>`;
    } else {
      for (const tournament of tournaments) {
        html += this.renderTournamentCard(tournament);
      }
    }

    html += `</div>`;
    html += `</div>`;
    return html;
  }

  /**
   * 渲染锦标赛卡片
   * @param {object} tournament - 锦标赛
   * @returns {string} HTML
   */
  renderTournamentCard(tournament) {
    const statusClass = tournament.status || 'pending';
    const statusText = tournament.status || 'Pending';

    let html = `<div class="tournament-card status-${statusClass}" data-tournament-id="${tournament.id}">`;
    html += `<div class="tournament-header">`;
    html += `<h3 class="tournament-name">${tournament.name}</h3>`;
    html += `<span class="tournament-status">${statusText}</span>`;
    html += `</div>`;
    html += `<div class="tournament-info">`;
    html += `<span class="tournament-type">${tournament.type || 'elimination'}</span>`;
    html += `<span class="tournament-participants">${tournament.participantCount || 0}/${tournament.maxParticipants || 8}</span>`;
    html += `</div>`;

    if (tournament.status === 'pending') {
      html += `<button class="btn-join" data-action="join" data-tournament="${tournament.id}">Join</button>`;
    } else if (tournament.status === 'active') {
      html += `<button class="btn-view" data-action="view" data-tournament="${tournament.id}">View</button>`;
    }

    html += `</div>`;
    return html;
  }

  /**
   * 渲染冠军殿堂
   * @param {object[]} champions - 冠军列表
   * @returns {string} HTML
   */
  renderChampionHall(champions) {
    let html = `<div class="champion-hall">`;
    html += `<div class="hall-header">`;
    html += `<h2>Champion Hall</h2>`;
    html += `</div>`;
    html += `<div class="champion-list">`;

    if (champions.length === 0) {
      html += `<div class="no-champions">No champions yet</div>`;
    } else {
      for (const champion of champions) {
        html += this.renderChampionEntry(champion);
      }
    }

    html += `</div>`;
    html += `</div>`;
    return html;
  }

  /**
   * 渲染冠军条目
   * @param {object} champion - 冠军信息
   * @returns {string} HTML
   */
  renderChampionEntry(champion) {
    const titleIcon = this.getTitleIcon(champion.title);
    const titleColor = this.getTitleColor(champion.title);

    let html = `<div class="champion-entry" data-player-id="${champion.playerId}">`;
    html += `<div class="champion-icon" style="color: ${titleColor}">${titleIcon}</div>`;
    html += `<div class="champion-info">`;
    html += `<span class="champion-name">${champion.playerId}</span>`;
    html += `<span class="champion-title" style="color: ${titleColor}">${titleIcon} ${champion.title} Champion</span>`;
    html += `</div>`;
    html += `<div class="champion-tournament">${champion.tournamentName || 'Unknown'}</div>`;
    html += `</div>`;
    return html;
  }

  /**
   * 渲染 bracket
   * @param {object} bracketData - bracket 数据
   * @returns {string} HTML
   */
  renderBracket(bracketData) {
    let html = `<div class="tournament-bracket">`;
    html += `<div class="bracket-header">`;
    html += `<h2>Tournament Bracket</h2>`;
    html += `</div>`;

    if (!bracketData.rounds || bracketData.rounds.length === 0) {
      html += `<div class="no-bracket">Bracket not available</div>`;
    } else {
      html += `<div class="bracket-rounds">`;
      for (let i = 0; i < bracketData.rounds.length; i++) {
        html += `<div class="bracket-round" data-round="${i}">`;
        html += `<div class="round-header">Round ${i + 1}</div>`;
        html += `<div class="round-matches">`;
        for (const match of bracketData.rounds[i]) {
          html += this.renderMatch(match);
        }
        html += `</div>`;
        html += `</div>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  /**
   * 渲染比赛
   * @param {object} match - 比赛
   * @returns {string} HTML
   */
  renderMatch(match) {
    const winnerClass = match.winner ? 'match-winner' : '';
    const loserClass = match.loser ? 'match-loser' : '';

    let html = `<div class="bracket-match" data-match-id="${match.id}">`;
    html += `<div class="match-player ${winnerClass}">${match.player1 || 'TBD'}</div>`;
    html += `<div class="match-vs">vs</div>`;
    html += `<div class="match-player ${loserClass}">${match.player2 || 'TBD'}</div>`;
    html += `</div>`;
    return html;
  }

  /**
   * 渲染锦标赛详情
   * @param {object} tournament - 锦标赛
   * @returns {string} HTML
   */
  renderTournamentDetails(tournament) {
    let html = `<div class="tournament-details">`;
    html += `<div class="details-header">`;
    html += `<h2>${tournament.name}</h2>`;
    html += `<span class="details-status">${tournament.status || 'Unknown'}</span>`;
    html += `</div>`;
    html += `<div class="details-info">`;
    html += `<div class="info-row"><span>Type:</span><span>${tournament.type || 'elimination'}</span></div>`;
    html += `<div class="info-row"><span>Participants:</span><span>${tournament.participantCount || 0}/${tournament.maxParticipants || 8}</span></div>`;
    html += `</div>`;
    html += `</div>`;
    return html;
  }

  /**
   * 设置当前锦标赛
   * @param {object} tournament - 锦标赛
   */
  setActiveTournament(tournament) {
    this.activeTournament = tournament;
  }

  /**
   * 切换视图
   * @param {string} viewName - 视图名称
   */
  switchView(viewName) {
    this.view = viewName;
  }

  /**
   * 获取当前视图
   * @returns {string}
   */
  getActiveView() {
    return this.view;
  }

  /**
   * 获取称号图标
   * @param {string} title - 称号
   * @returns {string}
   */
  getTitleIcon(title) {
    const icons = {
      bronze: '♠',
      silver: '♣',
      gold: '♥',
      diamond: '◆',
      master: '★'
    };
    return icons[title] || '?';
  }

  /**
   * 获取称号颜色
   * @param {string} title - 称号
   * @returns {string}
   */
  getTitleColor(title) {
    const colors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      diamond: '#B9F2FF',
      master: '#FF6B00'
    };
    return colors[title] || '#888888';
  }

  /**
   * 渲染主界面
   * @returns {string} HTML
   */
  render() {
    switch (this.view) {
      case 'champion-hall':
        return this.renderChampionHall([]);
      case 'bracket':
        return this.renderBracket({ rounds: [] });
      case 'schedule':
      default:
        return this.renderSchedule([]);
    }
  }
}

module.exports = { ChampionshipUI };