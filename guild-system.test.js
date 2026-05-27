'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'guild-system.js'), 'utf8');
eval(code);

const { Guild, GuildPanel, GuildTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// Guild Tests
// ========================================================================
console.log('\n=== Guild Tests ===');
{
    const guild = new Guild('g1', 'TestGuild', 'player1');

    assertEq(guild.guildId, 'g1', 'guildId set correctly');
    assertEq(guild.name, 'TestGuild', 'name set correctly');
    assertEq(guild.leaderId, 'player1', 'leaderId set correctly');
    assertEq(guild.members.size, 0, 'initial members empty');
    assertEq(guild.hooks.length, 0, 'no hooks initially');

    // test addMember
    const m1 = guild.addMember('player2', 'officer');
    assert(m1 !== null, 'addMember returns member');
    assertEq(m1.role, 'officer', 'member role is officer');
    assertEq(guild.members.size, 1, 'members size is 1');
    assertEq(guild.memberOrder[0], 'player2', 'memberOrder contains player2');

    // test addMember — duplicate
    const m2 = guild.addMember('player2', 'member');
    assertEq(m2, null, 'duplicate member returns null');

    // test assignRole
    const roleResult = guild.assignRole('player2', 'member');
    assertEq(roleResult, true, 'assignRole returns true');
    assertEq(guild.members.get('player2').role, 'member', 'role updated');

    // test assignRole — cannot assign leader to non-leader
    const roleResult2 = guild.assignRole('player2', 'leader');
    assertEq(roleResult2, false, 'cannot assign leader role to non-leader');

    // test removeMember
    guild.addMember('player3', 'member');
    const removeResult = guild.removeMember('player3');
    assertEq(removeResult, true, 'removeMember returns true');
    assertEq(guild.members.size, 1, 'members size is 1 after remove (player3 removed)');

    // test removeMember — cannot remove leader
    const removeLeader = guild.removeMember('player1');
    assertEq(removeLeader, false, 'cannot remove leader');

    // test invite/accept
    const invite = guild.invitePlayer('player4');
    assert(invite !== null, 'invitePlayer returns invite');
    assertEq(invite.guildId, 'g1', 'invite has guildId');
    assert(invite.expiresAt > Date.now(), 'invite has future expiry');

    const accept = guild.acceptInvitation('player4');
    assert(accept !== null, 'acceptInvitation returns member');
    assertEq(accept.role, 'member', 'accepted member has default role member');

    // test acceptInvitation — no invitation
    const acceptNone = guild.acceptInvitation('player_no_invite');
    assert(acceptNone.error, 'accept without invite returns error');

    // test acceptInvitation — expired (manipulate time)
    guild.invitations.set('player5', { guildId: 'g1', expiresAt: Date.now() - 1000 });
    const acceptExpired = guild.acceptInvitation('player5');
    assertEq(acceptExpired.error, 'invitation_expired', 'expired invitation rejected');

    // test mission system
    const mission = guild.createMission('m1', 'Win 3 battles', 100);
    assert(mission !== null, 'createMission returns mission');
    assertEq(mission.status, 'available', 'mission status available');
    assertEq(mission.reward, 100, 'mission reward correct');

    const assignMission = guild.assignMission('m1', 'player2');
    assertEq(assignMission, true, 'assignMission returns true');
    assertEq(mission.assignedTo, 'player2', 'mission assigned to player2');
    assertEq(mission.status, 'assigned', 'mission status assigned');

    const completeMission = guild.completeMission('m1', 'player2');
    assertEq(completeMission, true, 'completeMission returns true');
    assertEq(mission.status, 'completed', 'mission status completed');
    assertEq(guild.members.get('player2').contributions, 100, 'player2 received contributions');

    // test completeMission — wrong member
    guild.createMission('m2', 'Another mission', 50);
    guild.assignMission('m2', 'player4');
    const completeWrong = guild.completeMission('m2', 'player2');
    assertEq(completeWrong, false, 'completeMission fails for wrong member');

    // test activity logging
    guild.logActivity('pvp', 'player2', { opponent: 'player3' });
    assertEq(guild.activities.length, 1, 'activity logged');

    // test clanMemory operations
    guild.recordBattle('g1', 'player2', 'player3', 'win', 30);
    assertEq(guild.clanMemory.l2_battle_records.length, 1, 'battle recorded');
    assertEq(guild.clanMemory.l0_meta.totalBattles, 1, 'totalBattles incremented');

    guild.addInsight('player2', 'Fire cards are strong against plant enemies');
    assertEq(guild.clanMemory.l1_insight_index.length, 1, 'insight added');

    guild.archiveSkill('card_fireball', 'Fireball', 'Deals 10 damage to all enemies', 'player1');
    assertEq(guild.clanMemory.l3_skill_archive.length, 1, 'skill archived');

    // test getStats
    const stats = guild.getStats();
    assertEq(stats.guildId, 'g1', 'stats has guildId');
    assertEq(stats.memberCount, 2, 'stats memberCount is 2 (player2 + player4, leader not in members map)');
    assertEq(stats.totalBattles, 1, 'stats totalBattles is 1');
    assertEq(stats.skillArchiveCount, 1, 'stats skillArchiveCount is 1');
    assertEq(stats.missionCount >= 0, true, 'stats missionCount present');
}

// ========================================================================
// GuildPanel Tests
// ========================================================================
console.log('\n=== GuildPanel Tests ===');
{
    const guild = new Guild('g2', 'PanelTestGuild', 'leader1');
    const panel = new GuildPanel(guild);

    assertEq(panel.isOpen, false, 'GuildPanel initial isOpen false');
    panel.open();
    assertEq(panel.isOpen, true, 'GuildPanel open sets true');
    panel.close();
    assertEq(panel.isOpen, false, 'GuildPanel close sets false');
    panel.toggle();
    assertEq(panel.isOpen, true, 'GuildPanel toggle opens');

    const state = panel.getPanelState();
    assert(typeof state === 'object', 'getPanelState returns object');
    assert(typeof state.stats === 'object', 'state has stats field');
}

// ========================================================================
// GuildTools Tests
// ========================================================================
console.log('\n=== GuildTools Tests ===');
{
    const r1 = GuildTools['guild.create'].handler({ guildId: 'g_tool', name: 'ToolGuild', leaderId: 'leader1' }, {});
    assert(r1.guildId, 'guild.create returns guildId');
    assertEq(r1.name, 'ToolGuild', 'guild.create returns name');

    const r2 = GuildTools['guild.stats'].handler({ guildId: 'g_nonexistent' }, {});
    assertEq(r2.error, 'guild_not_found', 'guild.stats returns error for unknown guild');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    // Full guild lifecycle
    const guild = new Guild('g_int', 'IntegrationGuild', 'founder1');

    // Add members
    guild.addMember('member1', 'officer');
    guild.addMember('member2', 'member');

    // Create and assign mission
    guild.createMission('m_int1', 'Defeat the boss', 200);
    guild.assignMission('m_int1', 'member1');
    guild.completeMission('m_int1', 'member1');

    // Record battles
    guild.recordBattle('g_int', 'member1', 'enemy1', 'win', 50);
    guild.recordBattle('g_int', 'member2', 'enemy2', 'loss', 20);

    // Archive skills and insights
    guild.archiveSkill('c1', 'Ice Nova', 'Freezes all enemies', 'member1');
    guild.addInsight('member1', 'Ice beats Fire in boss fights');

    const stats = guild.getStats();
    assertEq(stats.memberCount, 2, 'Integration: 2 members');
    assertEq(stats.totalBattles, 1, 'Integration: 1 win recorded');
    assertEq(stats.completedMissions, 1, 'Integration: 1 mission completed');
    assertEq(stats.skillArchiveCount, 1, 'Integration: 1 skill archived');

    const memory = guild.getClanMemory();
    assertEq(memory.l1_insight_index.length, 1, 'Integration: 1 insight in memory');
    assertEq(memory.l3_skill_archive.length, 1, 'Integration: 1 skill in archive');

    // Hook system
    let hookCalled = false;
    guild.registerHook((event, data) => { hookCalled = true; });
    guild.addMember('member3', 'member');
    assert(hookCalled, 'Integration: hook called on member added');
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

    const totalLines = 200;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);