// V366 CrossPlayerBalancer: PvP 公平度评分 + match-making 难度均衡
'use strict';
(function () {
  function CrossPlayerBalancer(options) {
    this.players = {};
    this.matches = {};
    this.fairnessWindow = 200;
  }
  CrossPlayerBalancer.prototype.registerPlayer = function (p) {
    if (!p || !p.id) return false;
    this.players[p.id] = p;
    return true;
  };
  CrossPlayerBalancer.prototype.findFairMatch = function (playerId) {
    var me = this.players[playerId];
    if (!me) return null;
    var bestId = null; var bestGap = Infinity;
    var self = this;
    Object.keys(this.players).forEach(function (id) {
      if (id === playerId) return;
      var gap = Math.abs(self.players[id].skill - me.skill);
      if (gap < bestGap) { bestGap = gap; bestId = id; }
    });
    if (!bestId) return null;
    var matchId = 'match_' + playerId + '_' + bestId;
    var match = { matchId: matchId, players: [playerId, bestId], skillGap: bestGap, ts: Date.now() };
    self.matches[matchId] = match;
    return match;
  };
  CrossPlayerBalancer.prototype.getFairness = function (matchId) {
    var m = this.matches[matchId];
    if (!m) return 0;
    if (m.skillGap === 0) return 1.0;
    return Math.max(0, 1 - (m.skillGap / this.fairnessWindow));
  };
  CrossPlayerBalancer.prototype.getReport = function () {
    var self = this;
    return { playerCount: Object.keys(self.players).length, matchCount: Object.keys(self.matches).length };
  };
  if (typeof window !== 'undefined') window.CrossPlayerBalancer = CrossPlayerBalancer;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { CrossPlayerBalancer: CrossPlayerBalancer };
})();
