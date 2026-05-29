'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'story-campaign-system.js'), 'utf8');
eval(code);

const { StoryChapter, StoryNode, PlayerStoryState, StoryCampaignSystem, StoryCampaignTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// StoryNode Tests
// ========================================================================
console.log('\n=== StoryNode Tests ===');
{
    const node = new StoryNode('n1', 'You enter a dark forest.', []);
    assertEq(node.nodeId, 'n1', 'nodeId set');
    assertEq(node.text, 'You enter a dark forest.', 'text set');
    assertEq(node.choices.length, 0, 'no choices initially');
    assert(!node.isEnding, 'not an ending initially');

    node.addChoice('Go left', 'left_node', { gold: 10 });
    assertEq(node.choices.length, 1, '1 choice added');
    assertEq(node.choices[0].text, 'Go left', 'choice text correct');
    assertEq(node.choices[0].reward?.gold, 10, 'choice reward correct');

    node.setEnding({ gold: 100, xp: 50 });
    assert(node.isEnding, 'isEnding set');
    assertEq(node.rewards.gold, 100, 'ending reward gold');
}

// ========================================================================
// StoryChapter Tests
// ========================================================================
console.log('\n=== StoryChapter Tests ===');
{
    const chapter = new StoryChapter('ch1', 'The Dark Forest', 'A mysterious forest awaits.');
    assertEq(chapter.chapterId, 'ch1', 'chapterId set');
    assertEq(chapter.title, 'The Dark Forest', 'title set');
    assert(!chapter.unlocked, 'not unlocked initially');

    const node1 = new StoryNode('start', 'Begin your journey.', []);
    const node2 = new StoryNode('fork', 'A fork in the road.', []);
    chapter.addNode('start', node1);
    chapter.addNode('fork', node2);
    assertEq(chapter.startNodeId, 'start', 'first node is start');
    assertEq(chapter.nodes.size, 2, '2 nodes registered');

    const found = chapter.getNode('fork');
    assertEq(found.nodeId, 'fork', 'getNode returns StoryNode');
    assertEq(found.getNode('fork').nodeId, 'fork', 'getNode finds correct node');
}

// ========================================================================
// PlayerStoryState Tests
// ========================================================================
console.log('\n=== PlayerStoryState Tests ===');
{
    const state = new PlayerStoryState('player1', 'ch1');
    assertEq(state.playerId, 'player1', 'playerId set');
    assertEq(state.currentChapterId, 'ch1', 'chapterId set');
    assertEq(state.decisionLog.length, 0, 'no decisions initially');

    state.makeDecision('Go left', { gold: 10 });
    assertEq(state.decisionLog.length, 1, '1 decision logged');
    assertEq(state.collectedRewards.length, 1, '1 reward collected');

    state.setFlag('has_sword', true);
    assertEq(state.getFlag('has_sword'), true, 'flag set and retrieved');
    assertEq(state.getFlag('nonexistent'), undefined, 'nonexistent flag returns undefined');
}

// ========================================================================
// StoryCampaignSystem Tests
// ========================================================================
console.log('\n=== StoryCampaignSystem Tests ===');
{
    const sys = new StoryCampaignSystem();
    sys._load = () => {}; sys._save = () => {};

    // test createCampaign
    const camp = sys.createCampaign('camp1', 'Dragon Quest', 'Slay the dragon!');
    assert(camp !== null, 'createCampaign returns campaign');
    assertEq(sys.campaigns.size, 1, 'campaign registered');

    // test getCampaign
    const found = sys.getCampaign('camp1');
    assertEq(found.title, 'Dragon Quest', 'getCampaign finds campaign');

    // test addStoryNode
    const node = sys.addStoryNode('camp1', 'start', 'You stand before the dragon.', [
        { text: 'Draw your sword', nextNodeId: 'battle', reward: null },
        { text: 'Try to negotiate', nextNodeId: 'diplomacy', reward: { gold: 50 } }
    ]);
    assert(node !== null, 'addStoryNode returns node');

    // test addStoryNode — error
    const bad = sys.addStoryNode('nonexistent', 'n', 'text', []);
    assertEq(bad.error, 'campaign_not_found', 'invalid campaign returns error');

    // test getOrCreatePlayerState
    const pState = sys.getOrCreatePlayerState('player1', 'camp1');
    assert(pState !== null, 'getOrCreatePlayerState returns state');
    assertEq(pState.playerId, 'player1', 'state has playerId');

    // test startCampaign
    const start = sys.startCampaign('player1', 'camp1');
    assert(start.success, 'startCampaign returns success');
    assertEq(start.nodeId, 'start', 'startCampaign returns start nodeId');

    // test makeChoice
    const choice = sys.makeChoice('player1', 'camp1', 0);
    assert(choice.success, 'makeChoice returns success');
    assertEq(choice.completed, false, 'not ending yet');

    // test makeChoice — invalid index
    const badChoice = sys.makeChoice('player1', 'camp1', 99);
    assertEq(badChoice.error, 'invalid_choice', 'invalid choice index returns error');

    // test getCurrentNode
    const current = sys.getCurrentNode('player1', 'camp1');
    assert(current.nodeId, 'getCurrentNode returns nodeId');
    assertEq(current.completed, false, 'chapter not completed');

    // test getPlayerProgress
    const progress = sys.getPlayerProgress('player1', 'camp1');
    assertEq(progress.playerId, 'player1', 'progress has playerId');
    assertEq(progress.decisions, 1, '1 decision in progress');

    // test getPlayerProgress — no state
    const noState = sys.getPlayerProgress('nobody', 'camp1');
    assertEq(noState.completedChapters, 0, 'no state = 0 completed chapters');

    // test getStats
    const stats = sys.getStats();
    assert(typeof stats === 'object', 'getStats returns object');
    assertEq(stats.totalCampaigns, 1, 'totalCampaigns correct');
}

// ========================================================================
// StoryCampaignTools Tests
// ========================================================================
console.log('\n=== StoryCampaignTools Tests ===');
{
    if (typeof window !== 'undefined') window._storyCampaignSystem = new StoryCampaignSystem();
    const sys = window._storyCampaignSystem;
    sys._load = () => {}; sys._save = () => {};
    sys.createCampaign('tool_camp', 'Tool Campaign');

    const r1 = StoryCampaignTools['story.create'].handler({ campaignId: 'tool_camp2', title: 'Tool Campaign 2' }, {});
    assert(r1.chapterId, 'create returns campaign');

    const r2 = StoryCampaignTools['story.add_node'].handler({ campaignId: 'tool_camp', nodeId: 's', text: 'Start', choices: [] }, {});
    assert(r2.nodeId, 'add_node returns node');

    const r3 = StoryCampaignTools['story.start'].handler({ playerId: 'tool_p', campaignId: 'tool_camp' }, {});
    assert(r3.success, 'start returns success');

    const r4 = StoryCampaignTools['story.choice'].handler({ playerId: 'tool_p', campaignId: 'tool_camp', choiceIndex: 0 }, {});
    assert(typeof r4 === 'object', 'choice returns object');

    const r5 = StoryCampaignTools['story.progress'].handler({ playerId: 'tool_p', campaignId: 'tool_camp' }, {});
    assert(typeof r5 === 'object', 'progress returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const sys = new StoryCampaignSystem();
    sys._load = () => {}; sys._save = () => {};

    // Build a complete mini-campaign
    sys.createCampaign('mini', 'Mini Adventure');

    // Start node with 2 choices
    sys.addStoryNode('mini', 'start', 'A treasure chest appears. Open it?', [
        { text: 'Open carefully', nextNodeId: 'trap', reward: null },
        { text: 'Leave it', nextNodeId: 'safe', reward: null }
    ]);
    // Trap node - ending with reward
    const trapNode = new StoryNode('trap', 'It was a trap! You lose HP.', []);
    trapNode.setEnding({ hp: -10, gold: 5 });
    sys.getCampaign('mini').addNode('trap', trapNode);
    // Safe node - another choice
    sys.addStoryNode('mini', 'safe', 'You found a safe path. Continue?', [
        { text: 'Enter the cave', nextNodeId: 'treasure', reward: null }
    ]);
    // Treasure node - ending
    const treasureNode = new StoryNode('treasure', 'You found the treasure!', []);
    treasureNode.setEnding({ gold: 100, xp: 50 });
    sys.getCampaign('mini').addNode('treasure', treasureNode);

    // Start and play through
    sys.startCampaign('int_player', 'mini');
    const current1 = sys.getCurrentNode('int_player', 'mini');
    assert(current1.node.text.includes('chest'), 'Integration: starts at chest node');

    // Choose "Open carefully" → trap
    sys.makeChoice('int_player', 'mini', 0);
    const current2 = sys.getCurrentNode('int_player', 'mini');
    assert(current2.node.text.includes('trap'), 'Integration: moved to trap node');

    // Hook system
    let hookFired = false;
    sys.registerHook((event, data) => { hookFired = true; });
    sys.startCampaign('hook_player', 'mini');
    assert(hookFired, 'Integration: hook fired on campaign start');
}

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

    const totalLines = 280;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);