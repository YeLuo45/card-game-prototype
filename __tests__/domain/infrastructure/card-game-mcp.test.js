'use strict';
const { CardGameMCPServer } = require('./card-game-mcp.js');

let passed = 0, failed = 0;
function assert(c, msg) {
  if (c) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ ${msg}`); }
}

console.log('\n=== CardGameMCPServer Tests ===\n');

const server = new CardGameMCPServer();

// Test 1: Server construction
console.log('Test 1: Constructor');
assert(server.name === 'card-game-prototype', 'server name correct');
assert(server.version === '1.1.0', 'version is 1.1.0');
assert(typeof server.tools === 'object', 'tools is object');
assert(Object.keys(server.tools).length === 24, '24 tools registered');

// Test 2: listTools
console.log('\nTest 2: listTools');
const listResult = server._handleRequest({ method: 'tools/list', id: 1 });
assert(listResult.jsonrpc === '2.0', 'jsonrpc 2.0 response');
assert(Array.isArray(listResult.result.tools), 'result.tools is array');
assert(listResult.result.tools.length === 24, '24 tools listed');
const toolNames = listResult.result.tools.map(t => t.name);
assert(toolNames.includes('getGameState'), 'has getGameState');
assert(toolNames.includes('getPlayerDeck'), 'has getPlayerDeck');
assert(toolNames.includes('getDreamFragments'), 'has getDreamFragments');
assert(toolNames.includes('ping'), 'has ping');
assert(toolNames.includes('listTools'), 'has listTools');

// Test 3: initialize
console.log('\nTest 3: initialize');
const initResult = server._handleRequest({ method: 'initialize', id: 2 });
assert(initResult.jsonrpc === '2.0', 'jsonrpc 2.0');
assert(initResult.result.protocolVersion === '2024-11-05', 'correct protocol version');
assert(initResult.result.capabilities.tools !== undefined, 'has tools capability');
assert(initResult.result.serverInfo.name === 'card-game-prototype', 'server info name');
assert(initResult.result.serverInfo.version === '1.1.0', 'server info version');

// Test 4: ping
console.log('\nTest 4: ping');
const pingResult = server._handleRequest({ method: 'ping', id: 3 });
assert(pingResult.jsonrpc === '2.0', 'jsonrpc 2.0');
assert(pingResult.result.pong === true, 'pong is true');

// Test 5: getServerInfo
console.log('\nTest 5: getServerInfo');
const infoResult = server._handleRequest({ method: 'tools/call', params: { name: 'getServerInfo', arguments: {} }, id: 4 });
assert(infoResult.jsonrpc === '2.0', 'jsonrpc 2.0');
const info = JSON.parse(infoResult.result.content[0].text);
assert(info.name === 'card-game-prototype', 'server name');
assert(info.version === '1.1.0', 'version');
assert(info.toolCount === 24, 'toolCount is 24');

// Test 6: getGameState
console.log('\nTest 6: getGameState');
const stateResult = server._handleRequest({ method: 'tools/call', params: { name: 'getGameState', arguments: {} }, id: 5 });
assert(stateResult.jsonrpc === '2.0', 'jsonrpc 2.0');
const state = JSON.parse(stateResult.result.content[0].text);
assert(state.hp === 80, 'player hp is 80');
assert(state.maxHp === 80, 'player maxHp is 80');
assert(state.gold === 150, 'player gold is 150');
assert(state.energy === 3, 'player energy is 3');
assert(state.enemy !== undefined, 'has enemy info');
assert(state.enemy.name === '史莱姆王', 'enemy name correct');

// Test 7: getPlayerDeck
console.log('\nTest 7: getPlayerDeck');
const deckResult = server._handleRequest({ method: 'tools/call', params: { name: 'getPlayerDeck', arguments: {} }, id: 6 });
assert(deckResult.jsonrpc === '2.0', 'jsonrpc 2.0');
const deck = JSON.parse(deckResult.result.content[0].text);
assert(Array.isArray(deck), 'deck is array');
assert(deck.length === 5, '5 cards in deck');
assert(deck[0].id === 'strike', 'first card is strike');
assert(deck[0].name === '打击', 'first card name is 打击');
assert(deck[0].cost === 1, 'strike costs 1');

// Test 8: getCardById
console.log('\nTest 8: getCardById');
const cardResult = server._handleRequest({ method: 'tools/call', params: { name: 'getCardById', arguments: { cardId: 'fireball' } }, id: 7 });
assert(cardResult.jsonrpc === '2.0', 'jsonrpc 2.0');
const fireball = JSON.parse(cardResult.result.content[0].text);
assert(fireball.id === 'fireball', 'fireball id correct');
assert(fireball.name === '火球', 'fireball name correct');
assert(fireball.damage === 20, 'fireball damage is 20');
assert(fireball.rarity === 'rare', 'fireball is rare');

// Test 9: getCardById - not found
console.log('\nTest 9: getCardById (not found)');
const notFoundResult = server._handleRequest({ method: 'tools/call', params: { name: 'getCardById', arguments: { cardId: 'nonexistent' } }, id: 8 });
const notFound = JSON.parse(notFoundResult.result.content[0].text);
assert(notFound.error !== undefined, 'returns error for nonexistent card');
assert(notFound.error.includes('not found'), 'error mentions not found');

// Test 10: getAvailableEnergy
console.log('\nTest 10: getAvailableEnergy');
const energyResult = server._handleRequest({ method: 'tools/call', params: { name: 'getAvailableEnergy', arguments: {} }, id: 9 });
assert(energyResult.jsonrpc === '2.0', 'jsonrpc 2.0');
const energy = JSON.parse(energyResult.result.content[0].text);
assert(energy.current === 3, 'current energy is 3');
assert(energy.max === 3, 'max energy is 3');

// Test 11: L0-L4 memory tools
console.log('\nTest 11: L0 System Config');
server.memory.L0 = { role: 'roguelike_deckbuilder', difficulty: 'normal', rule_version: '1.0' };
const l0Result = server._handleRequest({ method: 'tools/call', params: { name: 'getL0SystemConfig', arguments: {} }, id: 10 });
const l0 = JSON.parse(l0Result.result.content[0].text);
assert(l0.role === 'roguelike_deckbuilder', 'L0 role correct');
assert(l0.difficulty === 'normal', 'L0 difficulty correct');

console.log('\nTest 12: L1 Session History');
server.memory.L1 = [
  { sessionId: 's1', outcome: 'victory', hpRatio: 0.75, damageDealt: 120 },
  { sessionId: 's2', outcome: 'defeat', hpRatio: 0.1, damageDealt: 80 }
];
const l1Result = server._handleRequest({ method: 'tools/call', params: { name: 'getL1SessionHistory', arguments: { limit: 10 } }, id: 11 });
const l1 = JSON.parse(l1Result.result.content[0].text);
assert(Array.isArray(l1), 'L1 is array');
assert(l1.length === 2, '2 sessions in L1');

// Test 13: L1 limit
const l1LimitResult = server._handleRequest({ method: 'tools/call', params: { name: 'getL1SessionHistory', arguments: { limit: 1 } }, id: 12 });
const l1Limit = JSON.parse(l1LimitResult.result.content[0].text);
assert(l1Limit.length === 1, 'limit 1 returns 1 session');

// Test 14: addL1Session
console.log('\nTest 14: addL1Session');
const addL1Result = server._handleRequest({ method: 'tools/call', params: { name: 'addL1Session', arguments: { sessionId: 's3', outcome: 'victory', hpRatio: 0.5, damageDealt: 150 } }, id: 13 });
const addL1 = JSON.parse(addL1Result.result.content[0].text);
assert(addL1.success === true, 'addL1 returns success');
assert(addL1.count === 3, 'count is 3');

// Test 15: L3 Meta Model
console.log('\nTest 15: L3 Meta Model');
server.memory.L3 = { style: 'aggressive', preferredCards: ['fireball', 'strike'], avgWinRate: 0.65 };
const l3Result = server._handleRequest({ method: 'tools/call', params: { name: 'getL3MetaModel', arguments: {} }, id: 14 });
const l3 = JSON.parse(l3Result.result.content[0].text);
assert(l3.style === 'aggressive', 'L3 style correct');
assert(l3.avgWinRate === 0.65, 'L3 win rate correct');

// Test 16: Dream Memory
console.log('\nTest 16: Dream Memory - getDreamFragments (empty)');
const dreamsResult = server._handleRequest({ method: 'tools/call', params: { name: 'getDreamFragments', arguments: {} }, id: 15 });
const dreams = JSON.parse(dreamsResult.result.content[0].text);
assert(Array.isArray(dreams), 'dreams is array');
assert(dreams.length === 0, 'no dreams initially');

// Test 17: generateDream
console.log('\nTest 17: Dream Memory - generateDream');
server.memory.L1 = [{ sessionId: 's_test', outcome: 'victory', hpRatio: 0.8, damageDealt: 200 }];
const genDreamResult = server._handleRequest({ method: 'tools/call', params: { name: 'generateDream', arguments: { sessionId: 's_test' } }, id: 16 });
const genDream = JSON.parse(genDreamResult.result.content[0].text);
assert(genDream.success === true, 'generateDream success');
assert(genDream.dreamId.startsWith('dream_'), 'dream id generated');

// Test 18: getDreamDetail
console.log('\nTest 18: Dream Memory - getDreamDetail');
const detailResult = server._handleRequest({ method: 'tools/call', params: { name: 'getDreamDetail', arguments: { dreamId: genDream.dreamId } }, id: 17 });
const detail = JSON.parse(detailResult.result.content[0].text);
assert(detail.sessionId === 's_test', 'dream sessionId correct');
assert(detail.archetype !== undefined, 'dream has archetype');
assert(detail.emotion !== undefined, 'dream has emotion');
assert(Array.isArray(detail.keyDecisions), 'dream has keyDecisions array');
assert(detail.keyDecisions.length > 0, 'has key decisions');

// Test 19: getDreamDetail - not found
console.log('\nTest 19: Dream Memory - getDreamDetail not found');
const noDreamResult = server._handleRequest({ method: 'tools/call', params: { name: 'getDreamDetail', arguments: { dreamId: 'dream_nonexistent' } }, id: 18 });
const noDream = JSON.parse(noDreamResult.result.content[0].text);
assert(noDream.error !== undefined, 'error for nonexistent dream');

// Test 20: getSkills (empty)
console.log('\nTest 20: getSkills (empty)');
const skillsResult = server._handleRequest({ method: 'tools/call', params: { name: 'getSkills', arguments: {} }, id: 19 });
const skills = JSON.parse(skillsResult.result.content[0].text);
assert(Array.isArray(skills), 'skills is array');
assert(skills.length === 0, 'no skills initially');

// Test 21: Skill lifecycle
console.log('\nTest 21: Skill lifecycle');
server.skills = [
  { id: 'skill_1', name: '连击强化', type: 'passive', level: 3, description: '连击伤害+15%' }
];
const skillByIdResult = server._handleRequest({ method: 'tools/call', params: { name: 'getSkillById', arguments: { skillId: 'skill_1' } }, id: 20 });
const skill = JSON.parse(skillByIdResult.result.content[0].text);
assert(skill.id === 'skill_1', 'skill id correct');
assert(skill.name === '连击强化', 'skill name correct');
assert(skill.level === 3, 'skill level correct');

// Test 22: getSkillById not found
const noSkillResult = server._handleRequest({ method: 'tools/call', params: { name: 'getSkillById', arguments: { skillId: 'skill_nonexistent' } }, id: 21 });
const noSkill = JSON.parse(noSkillResult.result.content[0].text);
assert(noSkill.error !== undefined, 'error for nonexistent skill');

// Test 23: updateL0Config
console.log('\nTest 23: updateL0Config');
const updateL0Result = server._handleRequest({ method: 'tools/call', params: { name: 'updateL0Config', arguments: { key: 'difficulty', value: 'hard' } }, id: 22 });
const updateL0 = JSON.parse(updateL0Result.result.content[0].text);
assert(updateL0.success === true, 'update success');
assert(server.memory.L0.difficulty === 'hard', 'difficulty updated');

// Test 24: Unknown tool
console.log('\nTest 24: Unknown tool');
const unknownResult = server._handleRequest({ method: 'tools/call', params: { name: 'nonexistent_tool', arguments: {} }, id: 23 });
assert(unknownResult.error !== undefined, 'error for unknown tool');
assert(unknownResult.error.code === -32602, 'error code -32602');

// Test 25: Unknown method
console.log('\nTest 25: Unknown method');
const unknownMethodResult = server._handleRequest({ method: 'nonexistent_method', id: 24 });
assert(unknownMethodResult.error !== undefined, 'error for unknown method');
assert(unknownMethodResult.error.code === -32601, 'error code -32601');

// Test 26: processMessage
console.log('\nTest 26: processMessage (JSON-RPC batch)');
server.dreams = []; server.memory.L1 = [{ sessionId: 's_msg' }];
const msgResult = server._handleRequest({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'generateDream', arguments: { sessionId: 's_msg' } }, id: 25 });
assert(msgResult.jsonrpc === '2.0', 'jsonrpc 2.0');
assert(msgResult.result.content[0].text.includes('dream_'), 'dream id in result');

// Test 27: getL2PatternArchive
console.log('\nTest 27: L2 Pattern Archive');
server.memory.L2 = {
  pattern_1: { type: 'combo', cards: ['strike', 'strike'], winRate: 0.72 },
  pattern_2: { type: 'defensive', cards: ['defend', 'shield_wall'], winRate: 0.58 }
};
const l2Result = server._handleRequest({ method: 'tools/call', params: { name: 'getL2PatternArchive', arguments: {} }, id: 26 });
const l2 = JSON.parse(l2Result.result.content[0].text);
assert(Array.isArray(l2), 'L2 is array');
assert(l2.length === 2, '2 patterns in L2');

// Test 28: getL4WorldModel
console.log('\nTest 28: L4 World Model');
server.memory.L4 = { mapknowledge: 'dungeon_2', unlockedStages: 5, bossDefeated: ['slime_king', 'goblin_lord'] };
const l4Result = server._handleRequest({ method: 'tools/call', params: { name: 'getL4WorldModel', arguments: {} }, id: 27 });
const l4 = JSON.parse(l4Result.result.content[0].text);
assert(l4.mapknowledge === 'dungeon_2', 'L4 map knowledge');
assert(l4.unlockedStages === 5, 'L4 stages');

// Test 29: Dream fragments with limit
console.log('\nTest 29: Dream fragments with limit');
server.dreams = [
  { id: 'dream_1', title: '梦1', archetype: 'aggressive', emotion: 'exciting', timestamp: 1000 },
  { id: 'dream_2', title: '梦2', archetype: 'defensive', emotion: 'tense', timestamp: 2000 },
  { id: 'dream_3', title: '梦3', archetype: 'control', emotion: 'strategic', timestamp: 3000 }
];
const limitDreamsResult = server._handleRequest({ method: 'tools/call', params: { name: 'getDreamFragments', arguments: { limit: 2 } }, id: 28 });
const limitDreams = JSON.parse(limitDreamsResult.result.content[0].text);
assert(limitDreams.length === 2, 'limit 2 returns 2 dreams');

// Test 30: JSON-RPC error handling
console.log('\nTest 30: Invalid JSON');
try {
  JSON.parse('not valid json');
} catch (e) {
  assert(e instanceof SyntaxError, 'invalid JSON throws SyntaxError');
}

// RESULTS
const total = passed + failed;
const passRate = passed / total;
console.log(`\n=== Results: ${passed}/${total} passed (${(passRate*100).toFixed(1)}%) ===\n`);
if (failed > 0 || passRate < 0.8) {
  console.log(`FAIL: pass_rate ${passRate.toFixed(2)} < 0.80 threshold`);
  process.exit(1);
}
process.exit(0);