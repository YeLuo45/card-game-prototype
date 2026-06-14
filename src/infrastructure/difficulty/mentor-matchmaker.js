// V364 MentorMatchmaker: 高玩↔新手配对 + 教学卡组推荐 + 评分系统
'use strict';
(function () {
  function MentorMatchmaker(options) {
    this.players = {};
    this.matches = [];
    this.skillGapMin = (options && options.skillGapMin) || 400;
  }
  MentorMatchmaker.prototype.registerPlayer = function (id, profile) {
    if (!id || !profile) return false;
    this.players[id] = profile;
    return true;
  };
  MentorMatchmaker.prototype.match = function (menteeId) {
    var mentee = this.players[menteeId];
    if (!mentee || !mentee.seekingMentor) return null;
    var bestMentor = null; var bestScore = -Infinity;
    var self = this;
    Object.keys(this.players).forEach(function (id) {
      if (id === menteeId) return;
      var p = self.players[id];
      if (!p.willingToTeach) return;
      var gap = p.skill - mentee.skill;
      if (gap < self.skillGapMin) return;
      var archetypeMatch = p.archetype === mentee.archetype ? 50 : 0;
      var score = gap + archetypeMatch;
      if (score > bestScore) { bestScore = score; bestMentor = id; }
    });
    if (!bestMentor) return null;
    var match = { menteeId: menteeId, mentorId: bestMentor, skillGap: self.players[bestMentor].skill - mentee.skill, matchId: 'm_' + Date.now() };
    self.matches.push(match);
    return match;
  };
  MentorMatchmaker.prototype.getRecommendation = function (menteeId) {
    var m = this.players[menteeId];
    if (!m) return [];
    if (m.archetype === 'aggressive') return ['berserk_tutor', 'execute_basics'];
    if (m.archetype === 'defensive') return ['block_mastery', 'armor_guide'];
    if (m.archetype === 'economist') return ['gold_management', 'shop_rotation'];
    return ['fundamentals_pack'];
  };
  MentorMatchmaker.prototype.getReport = function () { return { playerCount: Object.keys(this.players).length, matchCount: this.matches.length }; };
  if (typeof window !== 'undefined') window.MentorMatchmaker = MentorMatchmaker;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { MentorMatchmaker: MentorMatchmaker };
})();
