/**
 * Tournament Bracket Generator (Iteration 9/9)
 * 淘汰赛/循环赛 bracket 生成、轮次管理、结果录入
 */

class TournamentBracketGenerator {
  constructor(options = {}) {
    this.bracket = [];
    this.currentRound = 0;
    this.participants = [];
    this.matchResults = new Map();
    this.winner = null;
    this.type = 'elimination';
  }

  /**
   * 生成淘汰赛 bracket
   * @param {string[]} participants - 参赛者列表
   * @returns {object[]} 轮次数组
   */
  generateEliminationBracket(participants) {
    this.type = 'elimination';
    this.participants = [...participants];
    this.bracket = [];
    this.currentRound = 0;
    this.matchResults.clear();
    this.winner = null;

    // Pad to power of 2
    const paddedParticipants = this.padParticipants(participants);
    const numRounds = Math.log2(paddedParticipants.length);
    const matchesPerRound = paddedParticipants.length / 2;

    // Generate rounds
    let roundIndex = 0;
    let currentParticipants = [...paddedParticipants];

    while (roundIndex < numRounds) {
      const roundMatches = [];
      const matchesInThisRound = currentParticipants.length / 2;

      for (let i = 0; i < matchesInThisRound; i++) {
        const match = {
          id: `${roundIndex}_${i}`,
          round: roundIndex,
          player1: currentParticipants[i * 2],
          player2: currentParticipants[i * 2 + 1],
          winner: null,
          loser: null,
          completed: false
        };
        roundMatches.push(match);
      }

      this.bracket.push(roundMatches);
      roundIndex++;

      // Next round participants are winners
      currentParticipants = roundMatches.map(m => m.id + '_winner');
    }

    return this.bracket;
  }

  /**
   * 生成循环赛 bracket
   * @param {string[]} participants - 参赛者列表
   * @returns {object[]} 每轮比赛数组
   */
  generateRoundRobinBracket(participants) {
    this.type = 'roundrobin';
    this.participants = [...participants];
    this.bracket = [];
    this.currentRound = 0;
    this.matchResults.clear();
    this.winner = null;

    const n = participants.length;
    if (n < 2) return this.bracket;

    // Round-robin using circle method
    const rounds = [];
    const players = [...participants];

    for (let round = 0; round < n - 1; round++) {
      const roundMatches = [];

      for (let i = 0; i < n / 2; i++) {
        const player1 = players[i];
        const player2 = players[n - 1 - i];

        if (player1 && player2) {
          roundMatches.push({
            id: `${round}_${i}`,
            round,
            player1,
            player2,
            winner: null,
            completed: false
          });
        }
      }

      rounds.push(roundMatches);

      // Rotate players (keep first player fixed)
      const lastPlayer = players.pop();
      players.splice(1, 0, lastPlayer);
    }

    this.bracket = rounds;
    return this.bracket;
  }

  /**
   * 填充参赛者到2的幂
   * @param {string[]} participants - 参赛者列表
   * @returns {string[]}
   */
  padParticipants(participants) {
    const n = participants.length;
    if (n === 0) return [];

    // Find next power of 2
    let size = 1;
    while (size < n) {
      size *= 2;
    }

    const padded = [...participants];
    while (padded.length < size) {
      padded.push(`bye_${padded.length}`);
    }

    return padded;
  }

  /**
   * 进入下一轮
   */
  advanceRound() {
    if (this.currentRound < this.bracket.length - 1) {
      this.currentRound++;
      return true;
    }
    return false;
  }

  /**
   * 获取当前轮比赛
   * @returns {object[]}
   */
  getCurrentRoundMatches() {
    if (this.bracket.length === 0) return [];
    return this.bracket[this.currentRound] || [];
  }

  /**
   * 记录比赛结果
   * @param {number} matchIndex - 比赛索引
   * @param {string} winnerId - 胜者ID
   * @param {string} loserId - 败者ID
   * @returns {boolean}
   */
  recordResult(matchIndex, winnerId, loserId) {
    if (this.currentRound >= this.bracket.length) return false;

    const roundMatches = this.bracket[this.currentRound];
    if (matchIndex >= roundMatches.length) return false;

    const match = roundMatches[matchIndex];
    match.winner = winnerId;
    match.loser = loserId;
    match.completed = true;

    this.matchResults.set(match.id, {
      winner: winnerId,
      loser: loserId,
      timestamp: Date.now()
    });

    // Check if tournament is complete (finals)
    if (this.type === 'elimination' && this.currentRound === this.bracket.length - 1) {
      this.winner = winnerId;
    }

    return true;
  }

  /**
   * 获取比赛结果
   * @param {number} matchIndex - 比赛索引
   * @returns {object|null}
   */
  getMatchResult(matchIndex) {
    if (this.currentRound >= this.bracket.length) return null;

    const roundMatches = this.bracket[this.currentRound];
    if (matchIndex >= roundMatches.length) return null;

    const match = roundMatches[matchIndex];
    if (!match.completed) return null;

    return {
      winner: match.winner,
      loser: match.loser
    };
  }

  /**
   * 获取比赛信息
   * @param {number} roundIndex - 轮次索引
   * @param {number} matchIndex - 比赛索引
   * @returns {object|null}
   */
  getMatch(roundIndex, matchIndex) {
    if (roundIndex >= this.bracket.length) return null;
    const round = this.bracket[roundIndex];
    if (matchIndex >= round.length) return null;
    return round[matchIndex];
  }

  /**
   * 获取冠军
   * @returns {string|null}
   */
  getWinner() {
    if (this.type === 'roundrobin') {
      return this.calculateRoundRobinWinner();
    }
    return this.winner;
  }

  /**
   * 计算循环赛冠军
   * @returns {string|null}
   */
  calculateRoundRobinWinner() {
    if (this.bracket.length === 0) return null;

    const wins = new Map();

    for (const round of this.bracket) {
      for (const match of round) {
        if (match.completed && match.winner) {
          wins.set(match.winner, (wins.get(match.winner) || 0) + 1);
        }
      }
    }

    if (wins.size === 0) return null;

    let maxWins = 0;
    let champion = null;

    for (const [player, winCount] of wins) {
      if (winCount > maxWins) {
        maxWins = winCount;
        champion = player;
      }
    }

    return champion;
  }

  /**
   * 获取循环赛积分
   * @returns {Map}
   */
  getRoundRobinStandings() {
    const standings = new Map();

    for (const participant of this.participants) {
      standings.set(participant, { wins: 0, losses: 0 });
    }

    for (const round of this.bracket) {
      for (const match of round) {
        if (match.completed) {
          standings.get(match.winner).wins++;
          if (match.loser) {
            standings.get(match.loser).losses++;
          }
        }
      }
    }

    return standings;
  }

  /**
   * 重置 bracket
   */
  reset() {
    this.bracket = [];
    this.currentRound = 0;
    this.participants = [];
    this.matchResults.clear();
    this.winner = null;
  }
}

module.exports = { TournamentBracketGenerator };