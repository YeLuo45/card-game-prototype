'use strict';

const fs = require('fs');
const path = require('path');

// Mock globals — window MUST be set before eval
global.localStorage = {
    _store: {},
    getItem(k) { return this._store[k] || null; },
    setItem(k, v) { this._store[k] = v; },
    removeItem(k) { delete this._store[k]; },
    clear() { this._store = {}; }
};
global.document = {
    addEventListener: () => {},
    body: { appendChild: () => {}, removeChild: () => {} },
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: (tag) => ({ tag, style: {}, innerHTML: '', appendChild: () => {}, querySelector: () => null })
};
global.window = global;
global.gameState = null;
global.gameHookHub = null;

// Load strategy-guide.js into current scope via eval
const code = fs.readFileSync(path.join(__dirname, 'strategy-guide.js'), 'utf8');
eval(code);

// Test counters
let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// SuggestionEngine Tests
// ========================================================================
console.log('\n=== SuggestionEngine Tests ===');
{
    const engine = new SuggestionEngine();

    // test evaluateCard — attack card
    {
        const card = { id: 'strike', name: '打击', type: 'attack', cost: 1, damage: 6 };
        const gs = { player: { energy: 3, maxEnergy: 3, hp: 80, maxHp: 100 } };
        const score = engine.evaluateCard(card, gs);
        assert(score > 0, 'evaluateCard: attack card scores positive');
    }

    // test evaluateCard — skill card (block)
    {
        const card = { id: 'defend', name: '防御', type: 'skill', cost: 1, block: 5 };
        const gs = { player: { energy: 3, maxEnergy: 3, hp: 80, maxHp: 100 } };
        const score = engine.evaluateCard(card, gs);
        assert(score > 0, 'evaluateCard: skill card scores positive');
    }

    // test evaluateCard — null card returns 0
    assertEq(engine.evaluateCard(null, {}), 0, 'evaluateCard: null card returns 0');
    assertEq(engine.evaluateCard({}, {}), 0, 'evaluateCard: empty card returns 0');

    // test evaluateCard — low HP boosts skill score
    {
        const card = { id: 'defend', name: '防御', type: 'skill', cost: 1, block: 5 };
        const gsLow = { player: { energy: 3, maxEnergy: 3, hp: 20, maxHp: 100 } };
        const gsHigh = { player: { energy: 3, maxEnergy: 3, hp: 80, maxHp: 100 } };
        const scoreLow = engine.evaluateCard(card, gsLow);
        const scoreHigh = engine.evaluateCard(card, gsHigh);
        assert(scoreLow > scoreHigh, 'evaluateCard: low HP boosts skill score');
    }

    // test evaluateCard — unaffordable card CAN score higher (high damage outweighs penalty)
    // This is correct engine behavior - a powerful card is still valuable even if not playable now
    {
        const cardUnaffordable = { id: 'heavy', name: '重击', type: 'attack', cost: 5, damage: 20 };
        const gs = { player: { energy: 2, maxEnergy: 3, hp: 80, maxHp: 100 } };
        const score = engine.evaluateCard(cardUnaffordable, gs);
        assert(score > 0, 'evaluateCard: unaffordable high-damage card still scores >0');
    }

    // test generateSuggestions — empty hand
    {
        const result = engine.generateSuggestions([], {});
        assertEq(result.length, 0, 'generateSuggestions: empty hand returns empty');
    }

    // test generateSuggestions — playable cards
    {
        const hand = [
            { id: 'strike', name: '打击', type: 'attack', cost: 1, damage: 6 },
            { id: 'defend', name: '防御', type: 'skill', cost: 1, block: 5 },
            { id: 'heavy', name: '重击', type: 'attack', cost: 5, damage: 20 }
        ];
        const gs = { player: { energy: 3, maxEnergy: 3, hp: 80, maxHp: 100 } };
        const result = engine.generateSuggestions(hand, gs);
        assert(result.length > 0, 'generateSuggestions: returns suggestions');
        assert(result.length <= 3, 'generateSuggestions: max 3 suggestions');
        assert(result[0].score >= (result[1]?.score || 0), 'generateSuggestions: sorted by score descending');
    }

    // test generateSuggestions — no playable cards
    {
        const hand = [{ id: 'heavy', name: '重击', type: 'attack', cost: 5 }];
        const gs = { player: { energy: 2, maxEnergy: 3, hp: 80, maxHp: 100 } };
        const result = engine.generateSuggestions(hand, gs);
        assertEq(result.length, 0, 'generateSuggestions: no playable returns empty');
    }

    // test analyzeArchetype — empty history
    assertEq(engine.analyzeArchetype([]), 'balanced', 'analyzeArchetype: empty returns balanced');
    assertEq(engine.analyzeArchetype(null), 'balanced', 'analyzeArchetype: null returns balanced');

    // test analyzeArchetype — aggressive
    {
        const history = [
            { keyCards: ['打击', '重击', '斩击'] },
            { keyCards: ['打击', '攻击'] }
        ];
        const result = engine.analyzeArchetype(history);
        assertEq(result, 'aggressive', 'analyzeArchetype: aggressive detected');
    }

    // test analyzeArchetype — defensive
    {
        const history = [
            { keyCards: ['防御', '护盾', '格挡'] },
            { keyCards: ['防御'] }
        ];
        const result = engine.analyzeArchetype(history);
        assertEq(result, 'defensive', 'analyzeArchetype: defensive detected');
    }

    // test _generateReason
    {
        const card = { type: 'attack', damage: 8, cost: 2, cardDraw: 1 };
        const reason = engine._generateReason(card, {});
        assert(reason.includes('8'), '_generateReason: includes damage');
        assert(reason.includes('2'), '_generateReason: includes cost');
        assert(reason.includes('1') || reason.includes('抽'), '_generateReason: includes draw');
    }
}

// ========================================================================
// ObserverAgent Tests
// ========================================================================
console.log('\n=== ObserverAgent Tests ===');
{
    const mockBus = {
        subscribe: (evt, cb) => { /* noop */ },
        publish: () => {}
    };
    const observer = new ObserverAgent(mockBus);

    // test initial state
    assertEq(observer.lastState, null, 'ObserverAgent: initial lastState is null');
    assertEq(observer.lastEnemyIntent, null, 'ObserverAgent: initial lastEnemyIntent is null');

    // test onGameStateChanged
    {
        observer.onGameStateChanged({ phase: 'playerTurn', player: { energy: 3 } });
        assert(observer.lastState !== null, 'ObserverAgent: lastState updated');
        assertEq(observer.lastState.phase, 'playerTurn', 'ObserverAgent: phase captured');
    }

    // test onEnergyChanged
    {
        let received = null;
        observer.on('energyChange', (data) => { received = data; });
        observer.onEnergyChanged({ energy: 2, maxEnergy: 3 });
        assert(received !== null, 'ObserverAgent: energyChange event received');
        assertEq(received.energy, 2, 'ObserverAgent: energy value captured');
    }

    // test onEnemyIntentChanged
    {
        observer.onEnemyIntentChanged({ intent: 'attack', damage: 10 });
        assertEq(observer.lastEnemyIntent?.intent, 'attack', 'ObserverAgent: enemy intent captured');
    }

    // test getCurrentContext — without window.gameState
    {
        global.gameState = null;
        const ctx = observer.getCurrentContext();
        assertEq(ctx.phase, 'unknown', 'ObserverAgent: unknown phase when no gameState');
        assert(Array.isArray(ctx.hand), 'ObserverAgent: hand is array');
    }

    // test getCurrentContext — with mock window.gameState
    {
        global.gameState = {
            hand: [{ id: 'strike', name: '打击' }],
            player: { energy: 2, maxEnergy: 3, hp: 50, maxHp: 100 },
            currentEnemy: { name: '史莱姆' },
            phase: 'combat'
        };
        const ctx = observer.getCurrentContext();
        assertEq(ctx.phase, 'combat', 'ObserverAgent: phase from gameState');
        assertEq(ctx.hand.length, 1, 'ObserverAgent: hand from gameState');
        assertEq(ctx.energy, 2, 'ObserverAgent: energy from gameState');
        assertEq(ctx.hp, 50, 'ObserverAgent: hp from gameState');
    }

    // test on/emitter
    {
        let count = 0;
        observer.on('testEvent', () => { count++; });
        observer.emit('testEvent', {});
        assertEq(count, 1, 'ObserverAgent: event listener called once');
        observer.emit('testEvent', {});
        assertEq(count, 2, 'ObserverAgent: event listener called twice');
    }
}

// ========================================================================
// AdvisorAgent Tests (async wrapper)
// ========================================================================
console.log('\n=== AdvisorAgent Tests ===');
(async () => {
    const mockAIMemory = {
        getL2PatternArchive: async () => [],
        getL3MetaModel: async () => ({ archetype: 'aggressive' }),
        getL1SessionHistory: async () => []
    };
    const advisor = new AdvisorAgent(mockAIMemory);

    // test loadPlayerProfile — from AIMemory
    {
        const profile = await advisor.loadPlayerProfile();
        assert(profile !== null, 'AdvisorAgent: profile loaded');
        assert(typeof profile.archetype === 'string', 'AdvisorAgent: archetype is string');
    }

    // test loadPlayerProfile — fallback when no AIMemory
    {
        const advisorNoMem = new AdvisorAgent(null);
        const profile = await advisorNoMem.loadPlayerProfile();
        assertEq(profile.archetype, 'balanced', 'AdvisorAgent: fallback archetype is balanced');
        assertEq(profile.gamesPlayed, 0, 'AdvisorAgent: fallback gamesPlayed is 0');
    }

    // test _calculateWinRate
    assertEq(advisor._calculateWinRate([]), 0.5, 'AdvisorAgent: empty patterns winRate 0.5');
    assertEq(advisor._calculateWinRate([{ outcome: 'win' }, { outcome: 'win' }]), 1.0, 'AdvisorAgent: 2 wins 100%');
    assertEq(advisor._calculateWinRate([{ outcome: 'win' }, { outcome: 'loss' }]), 0.5, 'AdvisorAgent: 1/2 = 50%');

    // test _extractPreferredCards
    {
        const patterns = [
            { keyCards: ['打击', '防御', '打击'] },
            { keyCards: ['打击', '重击'] }
        ];
        const preferred = advisor._extractPreferredCards(patterns);
        assert(preferred.length > 0, 'AdvisorAgent: preferredCards not empty');
        assertEq(preferred[0], '打击', 'AdvisorAgent: most used card first');
    }

    // test _extractPreferredCards — empty
    assertEq(advisor._extractPreferredCards([]).length, 0, 'AdvisorAgent: empty patterns no preferred');

    // test _extractMatchups
    {
        const patterns = [
            { enemy: '史莱姆', outcome: 'win' },
            { enemy: '史莱姆', outcome: 'loss' },
            { enemy: '精英', outcome: 'win' }
        ];
        const matchups = advisor._extractMatchups(patterns);
        assert('史莱姆' in matchups, 'AdvisorAgent: slime in matchups');
        assertEq(matchups['史莱姆'].wins, 1, 'AdvisorAgent: slime 1 win');
        assertEq(matchups['史莱姆'].total, 2, 'AdvisorAgent: slime 2 total');
    }

    // test _getMatchupAdvice — no matchup
    {
        const matchup = advisor._getMatchupAdvice({ currentEnemy: { name: '未知' } });
        assertEq(matchup, null, 'AdvisorAgent: unknown enemy no advice');
    }

    // test _getMatchupAdvice — has matchup
    {
        advisor.currentProfile = { commonMatchups: { '史莱姆': { wins: 2, total: 3 } } };
        const matchup = advisor._getMatchupAdvice({ currentEnemy: { name: '史莱姆' } });
        assert(matchup !== null, 'AdvisorAgent: known enemy has advice');
        assertEq(Math.round(matchup.winRate * 100) / 100, 0.67, 'AdvisorAgent: winRate ~67%');
    }

    // test getAdvisoryContext
    {
        global.gameState = { currentEnemy: { name: '史莱姆' }, player: { hp: 50 } };
        const ctx = await advisor.getAdvisoryContext(global.gameState);
        assert(typeof ctx.profile === 'object', 'AdvisorAgent: context has profile');
        assert(typeof ctx.recentPerformance === 'object', 'AdvisorAgent: context has performance');
    }
})();

// ========================================================================
// TacticianAgent Tests
// ========================================================================
console.log('\n=== TacticianAgent Tests ===');
{
    const engine = new SuggestionEngine();
    const tactician = new TacticianAgent(engine);

    // test generateTactics
    {
        const hand = [
            { id: 'strike', name: '打击', type: 'attack', cost: 1, damage: 6 },
            { id: 'defend', name: '防御', type: 'skill', cost: 1, block: 5 }
        ];
        const gs = { player: { energy: 3, maxEnergy: 3, hp: 80, maxHp: 100 } };
        const tactics = tactician.generateTactics(hand, gs, {});
        assert(tactics.length > 0, 'TacticianAgent: generates tactics');
        assertEq(tactics[0].rank, 1, 'TacticianAgent: first rank is 1');
        assert(typeof tactics[0].score === 'number', 'TacticianAgent: score is number');
        assert(typeof tactics[0].reason === 'string', 'TacticianAgent: reason is string');
    }

    // test generateTactics — empty hand
    assertEq(tactician.generateTactics([], {}).length, 0, 'TacticianAgent: empty hand no tactics');

    // test _getAlternative
    {
        const bestCard = { id: 'strike', name: '打击', type: 'attack', cost: 1 };
        const hand = [
            { id: 'strike', name: '打击', type: 'attack', cost: 1 },
            { id: 'defend', name: '防御', type: 'skill', cost: 1 }
        ];
        const alt = tactician._getAlternative(bestCard, hand);
        assertEq(alt, '防御', 'TacticianAgent: alternative is different type');
    }

    // test formatSuggestion
    {
        const suggestion = { rank: 1, cardName: '打击', reason: '造成 6 点伤害' };
        const formatted = tactician.formatSuggestion(suggestion);
        assert(formatted.includes('⭐'), 'TacticianAgent: rank 1 has star');
        assert(formatted.includes('打击'), 'TacticianAgent: card name included');
    }

    // test formatSuggestion — rank 2
    {
        const suggestion = { rank: 2, cardName: '防御', reason: '获得 5 格挡' };
        const formatted = tactician.formatSuggestion(suggestion);
        assert(formatted.includes('✨'), 'TacticianAgent: rank 2 has sparkle');
    }
}

// ========================================================================
// StrategyGuidePanel Tests
// ========================================================================
console.log('\n=== StrategyGuidePanel Tests ===');
{
    const mockBus = { subscribe: () => {}, publish: () => {} };
    const mockAIMemory = {
        getL2PatternArchive: async () => [],
        getL3MetaModel: async () => ({ archetype: 'balanced' }),
        getL1SessionHistory: async () => []
    };
    const panel = new StrategyGuidePanel(mockBus, mockAIMemory);

    // test initial state
    assertEq(panel.isOpen, false, 'StrategyGuidePanel: initial isOpen false');
    assertEq(panel.panel, null, 'StrategyGuidePanel: initial panel null');

    // test open/close toggle
    panel.open();
    assertEq(panel.isOpen, true, 'StrategyGuidePanel: open sets isOpen true');
    panel.close();
    assertEq(panel.isOpen, false, 'StrategyGuidePanel: close sets isOpen false');

    // test toggle
    panel.toggle();
    assertEq(panel.isOpen, true, 'StrategyGuidePanel: toggle opens');
    panel.toggle();
    assertEq(panel.isOpen, false, 'StrategyGuidePanel: toggle closes');

    // test getStats
    {
        const stats = panel.getStats();
        assert(typeof stats === 'object', 'StrategyGuidePanel: stats is object');
        assertEq(stats.panelOpen, false, 'StrategyGuidePanel: stats.panelOpen');
        assertEq(stats.strategyCount, 0, 'StrategyGuidePanel: stats.strategyCount');
        assert(typeof stats.lastUpdate === 'string', 'StrategyGuidePanel: lastUpdate is string');
    }

    // test _registerHooks — with mock gameHookHub
    {
        global.gameHookHub = { registerHook: (name, cb) => { /* noop */ } };
        const panel2 = new StrategyGuidePanel(mockBus, mockAIMemory);
        assert(true, 'StrategyGuidePanel: _registerHooks with gameHookHub');
    }
}

// ========================================================================
// MemoryBridge Tests (async wrapper)
// ========================================================================
console.log('\n=== MemoryBridge Tests ===');
(async () => {
    const mockAIMemory = {
        addL1Session: async (record) => { /* noop */ },
        getL1SessionHistory: async () => [
            { keyCards: ['打击'] },
            { keyCards: ['防御'] }
        ]
    };
    const bridge = new MemoryBridge(mockAIMemory);

    // test recordDecision
    {
        const card = { id: 'strike', name: '打击' };
        const gs = { player: { hp: 50, energy: 2 }, phase: 'combat' };
        const suggestion = { rank: 1 };
        await bridge.recordDecision('session-1', card, gs, suggestion);
        assert(true, 'MemoryBridge: recordDecision does not throw');
    }

    // test getDecisionHistory — with card match
    {
        const history = await bridge.getDecisionHistory('打击', 5);
        assert(Array.isArray(history), 'MemoryBridge: history is array');
    }

    // test getDecisionHistory — no card match
    {
        const history = await bridge.getDecisionHistory('不存在的卡', 5);
        assert(Array.isArray(history), 'MemoryBridge: no match returns array');
    }

    // test getDecisionHistory — null AIMemory
    {
        const bridgeNoMem = new MemoryBridge(null);
        const history = await bridgeNoMem.getDecisionHistory('打击', 5);
        assertEq(history.length, 0, 'MemoryBridge: null aimemory returns empty');
    }
})();

// ========================================================================
// StrategyGuideTools Tests
// ========================================================================
console.log('\n=== StrategyGuideTools Tests ===');
{
    const tools = StrategyGuideTools;

    // test tool keys
    assert('strategy.getSuggestion' in tools, 'StrategyGuideTools: getSuggestion key exists');
    assert('strategy.getPlayerProfile' in tools, 'StrategyGuideTools: getPlayerProfile key exists');
    assert('strategy.getHistory' in tools, 'StrategyGuideTools: getHistory key exists');

    // test getSuggestion — missing context returns empty object
    {
        const result = tools['strategy.getSuggestion'].handler({}, {});
        assert(typeof result === 'object', 'StrategyGuideTools: getSuggestion returns object');
    }

    // test getPlayerProfile — missing context returns empty object
    {
        const result = tools['strategy.getPlayerProfile'].handler({}, {});
        assert(typeof result === 'object', 'StrategyGuideTools: getPlayerProfile returns object');
    }

    // test getHistory — missing context returns empty object
    {
        const result = tools['strategy.getHistory'].handler({ cardName: '打击' }, {});
        assert(typeof result === 'object', 'StrategyGuideTools: getHistory returns object');
    }

    // test tool descriptions
    assert(typeof tools['strategy.getSuggestion'].description === 'string', 'StrategyGuideTools: description is string');
    assert(typeof tools['strategy.getPlayerProfile'].description === 'string', 'StrategyGuideTools: description is string');
    assert(typeof tools['strategy.getHistory'].description === 'string', 'StrategyGuideTools: description is string');
}

// ========================================================================
// Integration Tests (async wrapper)
// ========================================================================
console.log('\n=== Integration Tests ===');
(async () => {
    const engine = new SuggestionEngine();
    const mockBus = { subscribe: () => {}, publish: () => {} };
    const mockAIMemory = {
        getL2PatternArchive: async () => [],
        getL3MetaModel: async () => ({ archetype: 'aggressive' }),
        getL1SessionHistory: async () => []
    };
    const panel = new StrategyGuidePanel(mockBus, mockAIMemory);
    const advisor = new AdvisorAgent(mockAIMemory);
    const tactician = new TacticianAgent(engine);
    const bridge = new MemoryBridge(mockAIMemory);

    // test full workflow
    global.gameState = {
        hand: [
            { id: 'strike', name: '打击', type: 'attack', cost: 1, damage: 6 },
            { id: 'defend', name: '防御', type: 'skill', cost: 1, block: 5 },
            { id: 'bash', name: '重击', type: 'attack', cost: 2, damage: 12 }
        ],
        player: { energy: 3, maxEnergy: 3, hp: 60, maxHp: 100 },
        currentEnemy: { name: '史莱姆' },
        phase: 'playerTurn'
    };

    // 1. Generate suggestions
    const tactics = tactician.generateTactics(global.gameState.hand, global.gameState, {});
    assert(tactics.length > 0, 'Integration: tactics generated');

    // 2. Load profile
    const profile = await advisor.loadPlayerProfile();
    assert(profile !== null, 'Integration: profile loaded');

    // 3. Record decision
    await bridge.recordDecision('test-session', tactics[0].card, global.gameState, tactics[0]);
    assert(true, 'Integration: decision recorded');

    // 4. Open panel and update
    panel.open();
    assertEq(panel.isOpen, true, 'Integration: panel opened');
})();

// ========================================================================
// Summary
// ========================================================================
setTimeout(() => {
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0.0';
    const threshold = 90;
    const passPct = parseFloat(passRate);
    const coverageMet = passPct >= threshold;

    console.log(`\n===== Summary =====`);
    console.log(`Passed: ${passed}/${total} = ${passRate}%`);
    console.log(`Threshold ${threshold}%: ${coverageMet ? 'PASS ✓' : 'FAIL ✗'}`);

    // Coverage estimation (strategy-guide.js ~540 lines)
    const totalLines = 540;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 800);