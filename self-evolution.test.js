'use strict';
const { CardGameMCPServer } = require('./card-game-mcp.js');

let passed = 0, failed = 0;
function assert(c, msg) {
  if (c) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ ${msg}`); }
}

console.log('\n=== Self-Evolution Tests (V89) ===\n');

const server = new CardGameMCPServer();
server.version = '1.1.0'; // Reset for this test

// === Self-Evolution Tests ===

console.log('Test 1: Server has evolutionLog and tuningParams');
assert(Array.isArray(server.evolutionLog), 'evolutionLog is array');
assert(typeof server.tuningParams === 'object', 'tuningParams is object');
assert(server.evolutionLog.length === 0, 'evolutionLog starts empty');

// Test 2: analyzePerformance - empty sessions
console.log('\nTest 2: analyzePerformance with empty sessions');
const emptyAnalysis = server._buildTools().analyzePerformance.handler({ sessions: [] });
assert(emptyAnalysis.error !== undefined, 'error when no sessions');

// Test 3: analyzePerformance - all victories
console.log('\nTest 3: analyzePerformance all victories');
const victoriesSessions = [
  { sessionId: 's1', outcome: 'victory', hpRatio: 0.8, damageDealt: 120 },
  { sessionId: 's2', outcome: 'victory', hpRatio: 0.6, damageDealt: 80 },
  { sessionId: 's3', outcome: 'victory', hpRatio: 0.9, damageDealt: 150 },
  { sessionId: 's4', outcome: 'victory', hpRatio: 0.7, damageDealt: 100 }
];
const analysisVictories = server._buildTools().analyzePerformance.handler({ sessions: victoriesSessions });
assert(analysisVictories.totalSessions === 4, 'totalSessions 4');
assert(analysisVictories.winRate === 1.0, 'winRate 1.0 (100% victories)');
assert(analysisVictories.avgDamageDealt === 113, 'avgDamageDealt 113');
assert(analysisVictories.avgSurvivalHpRatio === 0.75, 'avgSurvivalHpRatio 0.75');
assert(analysisVictories.survivability === 1.0, 'survivability 1.0');
assert(Array.isArray(analysisVictories.recommendations), 'recommendations is array');

// Test 4: analyzePerformance - all defeats
console.log('\nTest 4: analyzePerformance all defeats');
const defeatSessions = [
  { sessionId: 's1', outcome: 'defeat', hpRatio: 0.1, damageDealt: 40 },
  { sessionId: 's2', outcome: 'defeat', hpRatio: 0.05, damageDealt: 30 }
];
const analysisDefeats = server._buildTools().analyzePerformance.handler({ sessions: defeatSessions });
assert(analysisDefeats.winRate === 0, 'winRate 0');
assert(analysisDefeats.totalSessions === 2, 'totalSessions 2');
assert(analysisDefeats.survivability === 1.0, 'survivability 1.0 (all survived even in defeat)');

// Test 5: analyzePerformance - mixed
console.log('\nTest 5: analyzePerformance mixed');
const mixedSessions = [
  { sessionId: 's1', outcome: 'victory', hpRatio: 0.8, damageDealt: 100 },
  { sessionId: 's2', outcome: 'defeat', hpRatio: 0.1, damageDealt: 50 },
  { sessionId: 's3', outcome: 'victory', hpRatio: 0.5, damageDealt: 70 },
  { sessionId: 's4', outcome: 'defeat', hpRatio: 0.2, damageDealt: 45 }
];
const analysisMixed = server._buildTools().analyzePerformance.handler({ sessions: mixedSessions });
assert(analysisMixed.totalSessions === 4, 'totalSessions 4');
assert(analysisMixed.winRate === 0.5, 'winRate 0.5 (50%)');
assert(analysisMixed.avgSurvivalHpRatio === 0.4, 'avgSurvivalHpRatio 0.4');
assert(analysisMixed.survivability === 1.0, 'survivability 1.0 (all survived)');

// Test 6: generateImprovement - low win rate
console.log('\nTest 6: generateImprovement low win rate');
const lowWinAnalysis = { winRate: 0.3, avgDamageDealt: 40, avgSurvivalHpRatio: 0.2, survivability: 0.5 };
const improvementLow = server._buildTools().generateImprovement.handler({ analysis: lowWinAnalysis });
assert(improvementLow.improvementId.startsWith('imp_'), 'improvementId generated');
assert(Array.isArray(improvementLow.recommendations), 'recommendations is array');
assert(improvementLow.recommendations.length >= 2, 'has at least 2 recommendations for low win rate');
// Check specific recommendations
const enemyRec = improvementLow.recommendations.find(r => r.param === 'enemy_damage_base');
assert(enemyRec !== undefined, 'recommends reducing enemy damage for low win rate');
assert(enemyRec.direction === 'reduce', 'direction is reduce');

// Test 7: generateImprovement - good performance
console.log('\nTest 7: generateImprovement good performance (no changes needed)');
const goodAnalysis = { winRate: 0.8, avgDamageDealt: 120, avgSurvivalHpRatio: 0.6, survivability: 0.9 };
const improvementGood = server._buildTools().generateImprovement.handler({ analysis: goodAnalysis });
assert(improvementGood.confidence === 'high', 'confidence high for good performance');

// Test 8: applyImprovement - basic
console.log('\nTest 8: applyImprovement basic');
server.tuningParams = {};
const applyResult = server._buildTools().applyImprovement.handler({
  improvementId: 'imp_test_1',
  recommendations: [
    { param: 'player_attack_multiplier', direction: 'increase', amount: 0.15, reason: '提升攻击力' }
  ]
});
assert(applyResult.success === true, 'applyImprovement success');
assert(applyResult.applied.length === 1, 'applied 1 recommendation');
assert(applyResult.applied[0].oldValue === 1.0, 'oldValue 1.0 (default)');
assert(applyResult.applied[0].newValue === 1.15, 'newValue 1.15 (increase 15%)');
assert(applyResult.newParams.player_attack_multiplier.value === 1.15, 'tuningParams updated');

// Test 9: applyImprovement - multiple recommendations
console.log('\nTest 9: applyImprovement multiple recommendations');
server.evolutionLog = [];  // Reset first
server.tuningParams = {};
const multiApply = server._buildTools().applyImprovement.handler({
  improvementId: 'imp_test_multi',
  recommendations: [
    { param: 'enemy_damage_base', direction: 'reduce', amount: 0.1 },
    { param: 'healing_rate', direction: 'increase', amount: 0.2 },
    { param: 'block_effectiveness', direction: 'increase', amount: 0.1 }
  ]
});
assert(multiApply.success === true, 'multi apply success');
assert(multiApply.applied.length === 3, '3 recommendations applied');
assert(server.evolutionLog.length === 1, 'evolutionLog has 1 entry');
assert(server.evolutionLog[0].improvementId === 'imp_test_multi', 'correct improvementId in log');

// Test 10: applyImprovement - no improvementId
console.log('\nTest 10: applyImprovement missing improvementId');
const noIdResult = server._buildTools().applyImprovement.handler({
  improvementId: '',
  recommendations: [{ param: 'test', direction: 'increase', amount: 0.1 }]
});
assert(noIdResult.error !== undefined, 'error when missing improvementId');

// Test 11: applyImprovement - empty recommendations
console.log('\nTest 11: applyImprovement empty recommendations');
const emptyRecResult = server._buildTools().applyImprovement.handler({
  improvementId: 'imp_test_empty',
  recommendations: []
});
assert(emptyRecResult.error !== undefined, 'error when empty recommendations');

// Test 12: getEvolutionLog - empty
console.log('\nTest 12: getEvolutionLog empty');
server.evolutionLog = [];  // Reset first
server.tuningParams = {};
const emptyLog = server._buildTools().getEvolutionLog.handler({});
assert(Array.isArray(emptyLog), 'getEvolutionLog returns array');
assert(emptyLog.length === 0, 'empty when no evolution history');

// Test 13: getEvolutionLog - with entries
console.log('\nTest 13: getEvolutionLog with entries');
server.evolutionLog = [
  { improvementId: 'imp_1', timestamp: 1000, status: 'applied' },
  { improvementId: 'imp_2', timestamp: 2000, status: 'applied' },
  { improvementId: 'imp_3', timestamp: 3000, status: 'applied' }
];
const logWithEntries = server._buildTools().getEvolutionLog.handler({ limit: 2 });
assert(logWithEntries.length === 2, 'limit 2 returns 2 entries');

// Test 14: getTuningParams - empty
console.log('\nTest 14: getTuningParams empty');
server.tuningParams = {};
const emptyParams = server._buildTools().getTuningParams.handler({});
assert(typeof emptyParams === 'object', 'returns object');

// Test 15: getTuningParams - with values
console.log('\nTest 15: getTuningParams with values');
server.tuningParams = {
  player_attack_multiplier: { value: 1.15, lastUpdate: 1000 },
  enemy_damage_base: { value: 0.9, lastUpdate: 2000 }
};
const paramsWithValues = server._buildTools().getTuningParams.handler({});
assert(paramsWithValues.player_attack_multiplier.value === 1.15, 'player_attack_multiplier value');
assert(paramsWithValues.enemy_damage_base.value === 0.9, 'enemy_damage_base value');

// Test 16: applyImprovement - cumulative tuning
console.log('\nTest 16: applyImprovement cumulative tuning');
server.tuningParams = { player_attack_multiplier: { value: 1.15, lastUpdate: 1000 } };
const cumulativeApply = server._buildTools().applyImprovement.handler({
  improvementId: 'imp_cumulative',
  recommendations: [{ param: 'player_attack_multiplier', direction: 'increase', amount: 0.1 }]
});
assert(cumulativeApply.applied[0].oldValue === 1.15, 'oldValue from previous');
assert(cumulativeApply.applied[0].newValue === 1.25, 'newValue 1.25 (1.15 + 0.1)');

// Test 17: generateImprovement - medium win rate
console.log('\nTest 17: generateImprovement medium win rate (0.5)');
const medWinAnalysis = { winRate: 0.5, avgDamageDealt: 45, avgSurvivalHpRatio: 0.28, survivability: 0.65 };
const improvementMed = server._buildTools().generateImprovement.handler({ analysis: medWinAnalysis });
assert(improvementMed.recommendations.length >= 3, '3+ recommendations for medium performance');

// Test 18: analyzePerformance - single session
console.log('\nTest 18: analyzePerformance single session');
const singleSession = [{ sessionId: 's1', outcome: 'victory', hpRatio: 0.9, damageDealt: 200 }];
const singleAnalysis = server._buildTools().analyzePerformance.handler({ sessions: singleSession });
assert(singleAnalysis.totalSessions === 1, 'totalSessions 1');
assert(singleAnalysis.winRate === 1.0, 'winRate 1.0');
assert(singleAnalysis.avgDamageDealt === 200, 'avgDamageDealt 200');

// Test 19: _generateRecommendations helper
console.log('\nTest 19: _generateRecommendations helper');
const recsLow = server._generateRecommendations(0.3, 30, 0.2);
assert(recsLow.length >= 1, 'has recommendations for poor stats');
const recsHigh = server._generateRecommendations(0.8, 100, 0.6);
assert(recsHigh.length === 0, 'no recommendations for good stats');

// Test 20: evolutionLog - entries have correct structure
console.log('\nTest 20: evolutionLog structure');
server.evolutionLog = [];
server.tuningParams = {};
server._buildTools().applyImprovement.handler({
  improvementId: 'imp_struct_test',
  recommendations: [{ param: 'test_param', direction: 'increase', amount: 0.1 }]
});
assert(server.evolutionLog.length === 1, '1 entry added');
const logEntry = server.evolutionLog[0];
assert(logEntry.improvementId === 'imp_struct_test', 'improvementId correct');
assert(logEntry.status === 'applied', 'status applied');
assert(logEntry.timestamp !== undefined, 'has timestamp');
assert(Array.isArray(logEntry.applied), 'applied is array');
assert(logEntry.applied[0].param === 'test_param', 'applied param correct');

// Test 21: applyImprovement - decrease direction
console.log('\nTest 21: applyImprovement decrease direction');
server.tuningParams = {};
server._buildTools().applyImprovement.handler({
  improvementId: 'imp_decrease',
  recommendations: [{ param: 'enemy_damage_base', direction: 'reduce', amount: 0.1 }]
});
assert(server.tuningParams.enemy_damage_base.value === 0.9, 'reduced to 0.9');

// Test 22: getEvolutionLog - with limit parameter
console.log('\nTest 22: getEvolutionLog with limit');
server.evolutionLog = [
  { improvementId: 'imp_1', timestamp: 1000 },
  { improvementId: 'imp_2', timestamp: 2000 },
  { improvementId: 'imp_3', timestamp: 3000 },
  { improvementId: 'imp_4', timestamp: 4000 },
  { improvementId: 'imp_5', timestamp: 5000 }
];
const logLimit3 = server._buildTools().getEvolutionLog.handler({ limit: 3 });
assert(logLimit3.length === 3, 'limit 3 returns 3 entries');
assert(logLimit3[0].improvementId === 'imp_3', 'returns most recent 3');

// Test 23: generateImprovement - empty analysis
console.log('\nTest 23: generateImprovement empty analysis');
const emptyAnalysisResult = server._buildTools().generateImprovement.handler({ analysis: null });
assert(emptyAnalysisResult.error !== undefined, 'error for null analysis');

// Test 24: getEvolutionLog - default limit 10
console.log('\nTest 24: getEvolutionLog default limit');
server.evolutionLog = Array.from({ length: 15 }, (_, i) => ({ improvementId: `imp_${i}`, timestamp: i }));
const logDefault = server._buildTools().getEvolutionLog.handler({});
assert(logDefault.length === 10, 'default limit 10');

// Test 25: analyzePerformance - missing damage fields (edge case)
console.log('\nTest 25: analyzePerformance sessions with missing damage fields');
const incompleteSessions = [
  { sessionId: 's1', outcome: 'victory' },  // no hpRatio, no damageDealt
  { sessionId: 's2', outcome: 'defeat', hpRatio: 0.2 }  // no damageDealt
];
const analysisIncomplete = server._buildTools().analyzePerformance.handler({ sessions: incompleteSessions });
assert(analysisIncomplete.avgDamageDealt === 0, 'avgDamageDealt 0 when missing');
assert(analysisIncomplete.avgSurvivalHpRatio === 0.1, 'avgSurvivalHpRatio calculated');

// RESULTS
const total = passed + failed;
const passRate = passed / total;
console.log(`\n=== Results: ${passed}/${total} passed (${(passRate*100).toFixed(1)}%) ===\n`);
if (failed > 0) {
  console.log(`FAIL: ${failed} tests failed`);
  process.exit(1);
}
if (passRate < 0.8) {
  console.log(`FAIL: pass_rate ${passRate.toFixed(2)} < 0.80 threshold`);
  process.exit(1);
}
console.log('PASS');
process.exit(0);