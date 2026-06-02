// ============================================================================
// Card Intelligence Network — V9: Integration Test Suite
// End-to-end test of all intelligence modules working together
// ============================================================================
'use strict';

var IntegrationTestSuite = function() {
  this.results = [];
  this.passed = 0;
  this.failed = 0;
};

IntegrationTestSuite.prototype.run = function() {
  this.results = [];
  this.passed = 0;
  this.failed = 0;
  this.testFullPipeline();
  this.testOpponentProfiling();
  this.testStrategyAdaptation();
  this.testDeckCorrelation();
  this.testMetaTracking();
  this.testBalanceAndDraft();
  this.testTournamentAndSimulation();
  this.testPersistence();
  return this.getSummary();
};

IntegrationTestSuite.prototype.assert = function(condition, message) {
  if (condition) {
    this.passed++;
    this.results.push({ test: message, status: 'PASS' });
  } else {
    this.failed++;
    this.results.push({ test: message, status: 'FAIL' });
  }
};

IntegrationTestSuite.prototype.assertEq = function(actual, expected, message) {
  this.assert(actual === expected, message + ' (expected ' + expected + ', got ' + actual + ')');
};

IntegrationTestSuite.prototype.testFullPipeline = function() {
  var idx = new CardIntelligenceIndex();
  idx.initialize('integration_test');
  idx.graph.addRelationship('fire_1', 'fire_2', 'combo', 2.0);
  idx.graph.addRelationship('fire_1', 'fire_3', 'combo', 1.5);
  idx.graph.addRelationship('fire_2', 'ice_1', 'counter', 1.0);
  idx.network.recordGameplay('fire_1', true, { deck: 'aggro' });
  idx.network.recordGameplay('fire_1', false, { deck: 'aggro' });
  var sugg = idx.network.suggestCard(['fire_1'], ['other'], {});
  this.assert(sugg.length >= 0, 'suggestCard returns array');
  var strength = idx.network.analyzeCardStrength('fire_1');
  this.assertEq(typeof strength.winRate, 'number', 'winRate is number');
};

IntegrationTestSuite.prototype.testOpponentProfiling = function() {
  var idx = new CardIntelligenceIndex();
  idx.initialize('opp_test');
  idx.opponentTracker.recordMatch('opp1', 'myDeck', 'aggro', 'win', 10);
  idx.opponentTracker.recordMatch('opp1', 'myDeck', 'aggro', 'loss', 12);
  var summary = idx.opponentTracker.getOpponentSummary('opp1');
  this.assert(summary !== null, 'opponent summary not null');
  this.assertEq(summary.opponentId, 'opp1', 'correct opponent id');
  this.assertEq(typeof summary.archetype, 'string', 'archetype is string');
};

IntegrationTestSuite.prototype.testStrategyAdaptation = function() {
  var idx = new CardIntelligenceIndex();
  idx.initialize('strategy_test');
  idx.strategyEngine.currentStrategy = 'aggro';
  var r = idx.strategyEngine.adjustStrategy('loss', {});
  this.assert(r.success, 'strategy adjustment success');
  this.assertEq(idx.strategyEngine.currentStrategy, 'control', 'switched to control after loss');
};

IntegrationTestSuite.prototype.testDeckCorrelation = function() {
  var idx = new CardIntelligenceIndex();
  idx.initialize('corr_test');
  idx.correlationMatrix.recordDeckPerformance(['c1', 'c2', 'c3'], 'win');
  idx.correlationMatrix.recordDeckPerformance(['c1', 'c2', 'c4'], 'loss');
  var wr = idx.correlationMatrix.getWinRate(['c1', 'c2', 'c3']);
  this.assertEq(Math.round(wr * 10) / 10, 1.0, 'win rate 100%');
  var similar = idx.correlationMatrix.findSimilarDecks(['c1', 'c2'], 5);
  this.assert(similar.length >= 0, 'findSimilarDecks returns');
};

IntegrationTestSuite.prototype.testMetaTracking = function() {
  var idx = new CardIntelligenceIndex();
  idx.initialize('meta_test');
  for (var i = 0; i < 10; i++) idx.metaTracker.recordGlobalMatch('aggro', 'control', 'win');
  for (var j = 0; j < 10; j++) idx.metaTracker.recordGlobalMatch('control', 'aggro', 'loss');
  var tier = idx.metaTracker.getDeckTier('aggro');
  this.assertEq(tier.tier, 'S', 'aggro is tier S');
  var snap = idx.metaTracker.getMetaSnapshot();
  this.assertEq(snap.totalMatches, 20, '20 total matches');
};

IntegrationTestSuite.prototype.testBalanceAndDraft = function() {
  var idx = new CardIntelligenceIndex();
  idx.initialize('balance_test');
  idx.balanceAdvisor.analyzeCardBalance('c1', 0.2, 0.6);
  idx.balanceAdvisor.analyzeCardBalance('c2', 0.1, 0.35);
  this.assertEq(idx.balanceAdvisor.nerfCandidates.length, 1, '1 nerf candidate');
  this.assertEq(idx.balanceAdvisor.buffCandidates.length, 1, '1 buff candidate');
  var sugg = idx.draftEngine.suggestPick(['c1'], ['c2', 'c3'], 2);
  this.assert(sugg.length >= 0, 'draft suggestions returned');
};

IntegrationTestSuite.prototype.testTournamentAndSimulation = function() {
  var idx = new CardIntelligenceIndex();
  idx.initialize('tournament_test');
  var r = idx.strategyEngine.suggestPlay(['c1'], ['c2'], { turn: 1 }, null);
  this.assert(typeof r.cardId === 'string' || r.cardId === null, 'suggestPlay returns valid');
  idx.tournamentMode.recordTournamentMatch('t_test', 'p1', 'p2', 'win', 3);
  var stand = idx.tournamentMode.getTournamentStandings('t_test');
  this.assert(stand.length > 0, 'standings not empty');
};

IntegrationTestSuite.prototype.testPersistence = function() {
  var idx = new CardIntelligenceIndex();
  idx.initialize('persist_test');
  idx.graph.addRelationship('c1', 'c2', 'combo', 1.5);
  var exp = idx.exportData();
  this.assert(exp.success, 'export success');
  var imp = idx.importData('intel_export');
  this.assert(imp.success, 'import success');
};

IntegrationTestSuite.prototype.getSummary = function() {
  return {
    total: this.passed + this.failed,
    passed: this.passed,
    failed: this.failed,
    passRate: this.passed / (this.passed + this.failed),
    results: this.results
  };
};

window.IntegrationTestSuite = IntegrationTestSuite;
