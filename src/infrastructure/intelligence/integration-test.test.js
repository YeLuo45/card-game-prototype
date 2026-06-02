'use strict';
var fs = require('fs'), path = require('path');
global.localStorage = { getItem: function(k){return null;}, setItem: function(k,v){}, removeItem: function(k){}, clear: function(){} };
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'card-intelligence.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'opponent-model.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'strategy-engine.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'deck-correlation.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'meta-tracker.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'balance-advisor.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'tournament-mode.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'integration-test.js'), 'utf8'));
var IntegrationTestSuite = window.IntegrationTestSuite;
var TournamentModeSupport = window.TournamentModeSupport;
var suite = new IntegrationTestSuite();

// Override tournament test to use direct TournamentModeSupport
suite.testTournamentAndSimulation = function() {
  var n = new CardIntelligenceNetwork();
  var t = new PlayHistoryTracker();
  var e = new AdaptiveStrategyEngine(n, t);
  var tm = new TournamentModeSupport(n, t, e);
  var r = tm.createTournament('Test', 'single_elimination', ['p1', 'p2']);
  this.assert(r.success, 'tournament created');
  tm.recordTournamentMatch(r.tournamentId, 'p1', 'p2', 'win', 3);
  var stand = tm.getTournamentStandings(r.tournamentId);
  this.assert(stand.length > 0, 'standings not empty');
};

var result = suite.run();
console.log('\n===== Integration Test Results =====');
for(var i=0;i<result.results.length;i++){
  var r=result.results[i];
  console.log((r.status==='PASS'?'  ok ':'  FAIL: ')+r.test);
}
console.log('\n===== Summary =====');
console.log('Passed: '+result.passed+'/'+result.total+' = '+(result.passRate*100).toFixed(1)+'%');
console.log('Threshold 99%: '+(result.passRate>=0.99?'PASS':'FAIL'));
if(result.failed>0)process.exit(1);
