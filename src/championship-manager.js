/**
 * Championship Manager (Iteration 9/9)
 * 锦标赛管理：赛程/资格验证/奖金积分计算
 */

class ChampionshipManager {
  constructor(options = {}) {
    this.seasonId = options.seasonId || 'default';
    this.tournaments = [];
    this.currentTournament = null;
    this.participants = new Map();
    this.bonusConfig = {
      1: 1000,  // Winner
      2: 500,   // Runner-up
      3: 300,   // Semi-finalist
      4: 200,   // Quarter-finalist
      5: 100,   // Top 8
      6: 50,    // Top 16
      7: 25,    // Top 32
      8: 10     // Participation
    };
  }

  /**
   * 创建锦标赛
   * @param {object} config - 锦标赛配置
   * @returns {object} 锦标赛对象
   */
  createTournament(config) {
    const tournament = {
      id: `tournament_${Date.now()}_${this.tournaments.length}`,
      name: config.name || 'Tournament',
      type: config.type || 'elimination',
      maxParticipants: config.maxParticipants || 8,
      minParticipants: config.minParticipants || 2,
      status: 'pending',
      createdAt: Date.now(),
      startTime: config.startTime || null,
      prizes: config.prizes || []
    };

    this.tournaments.push(tournament);
    this.participants.set(tournament.id, new Map());
    return tournament;
  }

  /**
   * 注册参赛者
   * @param {string} tournamentId - 锦标赛ID
   * @param {string} playerId - 玩家ID
   * @param {string} name - 玩家名称
   * @returns {boolean} 是否成功
   */
  registerParticipant(tournamentId, playerId, name) {
    const tournament = this.getTournament(tournamentId);
    if (!tournament) return false;
    if (tournament.status !== 'pending') return false;

    const tournamentParticipants = this.participants.get(tournamentId);
    if (tournamentParticipants.has(playerId)) return false;
    if (tournamentParticipants.size >= tournament.maxParticipants) return false;

    tournamentParticipants.set(playerId, {
      playerId,
      name: name || playerId,
      registeredAt: Date.now(),
      eliminated: false,
      finalPlacement: null
    });

    return true;
  }

  /**
   * 验证参赛资格
   * @param {string} tournamentId - 锦标赛ID
   * @param {string} playerId - 玩家ID
   * @returns {boolean} 是否有资格
   */
  validateQualification(tournamentId, playerId) {
    const tournament = this.getTournament(tournamentId);
    if (!tournament) return false;
    if (tournament.status !== 'pending') return false;

    const tournamentParticipants = this.participants.get(tournamentId);
    return tournamentParticipants.has(playerId);
  }

  /**
   * 获取参赛者数量
   * @param {string} tournamentId - 锦标赛ID
   * @returns {number}
   */
  getParticipantCount(tournamentId) {
    const tournamentParticipants = this.participants.get(tournamentId);
    return tournamentParticipants ? tournamentParticipants.size : 0;
  }

  /**
   * 获取锦标赛状态
   * @param {string} tournamentId - 锦标赛ID
   * @returns {string}
   */
  getTournamentStatus(tournamentId) {
    const tournament = this.getTournament(tournamentId);
    return tournament ? tournament.status : null;
  }

  /**
   * 开始锦标赛
   * @param {string} tournamentId - 锦标赛ID
   * @returns {boolean} 是否成功
   */
  startTournament(tournamentId) {
    const tournament = this.getTournament(tournamentId);
    if (!tournament) return false;
    if (tournament.status !== 'pending') return false;

    const count = this.getParticipantCount(tournamentId);
    if (count < tournament.minParticipants) return false;

    tournament.status = 'active';
    tournament.startTime = Date.now();
    this.currentTournament = tournament;

    return true;
  }

  /**
   * 完成锦标赛
   * @param {string} tournamentId - 锦标赛ID
   */
  completeTournament(tournamentId) {
    const tournament = this.getTournament(tournamentId);
    if (!tournament) return;

    tournament.status = 'completed';
    tournament.completedAt = Date.now();

    if (this.currentTournament && this.currentTournament.id === tournamentId) {
      this.currentTournament = null;
    }
  }

  /**
   * 计算奖金积分
   * @param {string} tournamentId - 锦标赛ID
   * @param {number} placement - 名次
   * @returns {number} 奖金积分
   */
  calculateBonusPoints(tournamentId, placement) {
    if (placement < 1 || placement > 8) return 0;
    return this.bonusConfig[placement] || 0;
  }

  /**
   * 获取锦标赛
   * @param {string} tournamentId - 锦标赛ID
   * @returns {object|null}
   */
  getTournament(tournamentId) {
    return this.tournaments.find(t => t.id === tournamentId) || null;
  }

  /**
   * 获取参赛者列表
   * @param {string} tournamentId - 锦标赛ID
   * @returns {object[]}
   */
  getParticipants(tournamentId) {
    const tournamentParticipants = this.participants.get(tournamentId);
    if (!tournamentParticipants) return [];
    return Array.from(tournamentParticipants.values());
  }

  /**
   * 获取所有锦标赛
   * @returns {object[]}
   */
  getAllTournaments() {
    return [...this.tournaments];
  }

  /**
   * 获取进行中的锦标赛
   * @returns {object[]}
   */
  getActiveTournaments() {
    return this.tournaments.filter(t => t.status === 'active');
  }

  /**
   * 获取待开始的锦标赛
   * @returns {object[]}
   */
  getPendingTournaments() {
    return this.tournaments.filter(t => t.status === 'pending');
  }

  /**
   * 获取已完成的锦标赛
   * @returns {object[]}
   */
  getCompletedTournaments() {
    return this.tournaments.filter(t => t.status === 'completed');
  }

  /**
   * 淘汰参赛者
   * @param {string} tournamentId - 锦标赛ID
   * @param {string} playerId - 玩家ID
   * @param {number} placement - 最终名次
   */
  eliminateParticipant(tournamentId, playerId, placement) {
    const tournamentParticipants = this.participants.get(tournamentId);
    if (!tournamentParticipants) return;

    const participant = tournamentParticipants.get(playerId);
    if (!participant) return;

    participant.eliminated = true;
    participant.finalPlacement = placement;
  }

  /**
   * 重置管理器
   */
  reset() {
    this.tournaments = [];
    this.currentTournament = null;
    this.participants.clear();
  }
}

module.exports = { ChampionshipManager };