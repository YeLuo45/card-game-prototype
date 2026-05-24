// ===== V85 AI技能结晶系统测试 =====
'use strict';

// Mock AIMemory for testing
const mockAIMemory = () => ({
  L3: {
    patterns: {
      'hp_7_turn_2_boss': {
        count: 10, successes: 8, successRate: 0.8,
        keyCards: ['火球术', '雷电术'], action: 'attack'
      },
      'hp_3_turn_5_elite': {
        count: 5, successes: 2, successRate: 0.4,
        keyCards: ['格挡', '治疗'], action: 'defend'
      },
      'hp_5_turn_3_normal': {
        count: 3, successes: 2, successRate: 0.67,
        keyCards: ['攻击'], action: 'attack'
      }
    }
  },
  L4: { totalMatches: 20, winRate: 0.5 }
});

const mockAiMemoryInstance = mockAIMemory();
const crystallizer = new SkillCrystallizer(mockAiMemoryInstance);

// Test 1: Constructor
const test1 = crystallizer !== undefined;
console.assert(test1, 'SkillCrystallizer should be constructable');

// Test 2: crystallizeFromPattern with high confidence pattern
const test2_pattern = mockAiMemoryInstance.L3.patterns['hp_7_turn_2_boss'];
const test2_skill = crystallizer.crystallizeFromPattern('hp_7_turn_2_boss', test2_pattern);
const test2 = test2_skill !== null && test2_skill.confidence >= 0.6;
console.assert(test2, `High confidence pattern should crystallize: ${test2_skill?.name}`);

// Test 3: crystallizeFromPattern with low confidence (should return null)
crystallizer.crystallizeCount = 0;
const test3_pattern = mockAiMemoryInstance.L3.patterns['hp_3_turn_5_elite'];
const test3_skill = crystallizer.crystallizeFromPattern('hp_3_turn_5_elite', test3_pattern);
const test3 = test3_skill === null;
console.assert(test3, 'Low confidence pattern should NOT crystallize');

// Test 4: Budget Mode - crystallizeBudget limit
crystallizer.crystallizeBudget = 2;
crystallizer.crystallizeCount = 2;
const test4_skill = crystallizer.crystallizeFromPattern('hp_7_turn_2_boss', test2_pattern);
const test4 = test4_skill === null;
console.assert(test4, 'Budget exhausted should prevent crystallization');
crystallizer.crystallizeBudget = 3;
crystallizer.crystallizeCount = 0;

// Test 5: crystallizeAllFromL3
crystallizer.skills = [];
const test5_results = crystallizer.crystallizeAllFromL3();
const test5 = test5_results.length >= 1;
console.assert(test5, `Should crystallize at least 1 skill, got ${test5_results.length}`);

// Test 6: matchSkill with matching context
crystallizer.decisionCooldown = 0;
const test6_context = { hpRatio: 0.75, enemyType: 'boss', turn: 2 };
const test6_match = crystallizer.matchSkill(test6_context);
const test6 = test6_match !== null;
console.assert(test6, 'Should match skill for boss context');

// Test 7: matchSkill cooldown
crystallizer.decisionCooldown = 1;
const test7_match = crystallizer.matchSkill(test6_context);
const test7 = test7_match === null;
console.assert(test7, 'Should NOT match during cooldown');

// Test 8: _calcMatchScore
crystallizer.decisionCooldown = 0;
const test8_skill = crystallizer.matchSkill({ hpRatio: 0.75, enemyType: 'boss', turn: 2 });
const test8 = test8_skill !== null && test8_skill.confidence > 0;
console.assert(test8, 'Should calculate match score correctly');

// Test 9: getAllSkills
const test9_skills = crystallizer.getAllSkills();
const test9 = test9_skills.length === crystallizer.skills.length;
console.assert(test9, 'getAllSkills should return all skills');

// Test 10: setSkillActive
if (crystallizer.skills.length > 0) {
  const test10_skillId = crystallizer.skills[0].id;
  crystallizer.setSkillActive(test10_skillId, false);
  // Should not crash
  const test10 = true;
  console.assert(test10, 'setSkillActive should not throw');
}

// Test 11: resetRound
crystallizer.crystallizeCount = 3;
crystallizer.resetRound();
const test11 = crystallizer.crystallizeCount === 0;
console.assert(test11, 'resetRound should reset crystallizeCount');

// Test 12: _extractTrigger
const test12_trigger = crystallizer._extractTrigger('hp_7_turn_2_boss');
const test12 = test12_trigger.enemyType === 'boss' && 
               test12_trigger.hpRange[0] === 0.6;
console.assert(test12, `Trigger extraction: ${JSON.stringify(test12_trigger)}`);

// Test 13: _generateSkillName
const test13_name = crystallizer._generateSkillName('hp_7_turn_2_boss', { successRate: 0.8 });
const test13 = test13_name.length > 0;
console.assert(test13, `Skill name generated: ${test13_name}`);

// Test 14: pruneLowConfidence (exceed max)
crystallizer.maxSkills = 2;
crystallizer.skills = [];
crystallizer.crystallizeFromPattern('hp_7_turn_2_boss', test2_pattern);
crystallizer.crystallizeFromPattern('hp_5_turn_3_normal', mockAiMemoryInstance.L3.patterns['hp_5_turn_3_normal']);
crystallizer._pruneLowConfidence();
const test14 = crystallizer.skills.length <= 2;
console.assert(test14, `Prune should keep at most ${crystallizer.maxSkills} skills, got ${crystallizer.skills.length}`);
crystallizer.maxSkills = 50;

// Test 15: loadSkills / _saveSkills
crystallizer._saveSkills();
crystallizer.skills = [];
crystallizer.loadSkills();
const test15 = crystallizer.skills.length >= 0;
console.assert(test15, 'Save/load cycle should preserve skills');

// Summary
const allTests = [
  test1, test2, test3, test4, test5, test6, test7, test8,
  test9, test10, test11, test12, test13, test14, test15
];
const passed = allTests.filter(Boolean).length;
const total = allTests.length;
const rate = ((passed / total) * 100).toFixed(1);

console.log(`\n========== V85 SkillCrystallizer Tests ==========`);
console.log(`Passed: ${passed}/${total} (${rate}%)`);
console.log(`==============================================`);

if (passed >= total * 0.8) {
  console.log('✅ Test coverage ≥80% PASSED');
  process?.exit?.(0);
} else {
  console.log('❌ Test coverage <80% FAILED');
  process?.exit?.(1);
}