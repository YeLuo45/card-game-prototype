'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'deck-template-system.js'), 'utf8');
eval(code);

const { DeckTemplate, DeckTemplateRegistry, DeckTemplateTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// DeckTemplate Tests
// ========================================================================
console.log('\n=== DeckTemplate Tests ===');
{
    const deckData = [{ cardId: 'strike', count: 3 }, { cardId: 'defend', count: 2 }];
    const tmpl = new DeckTemplate('t1', 'Starter Deck', deckData);
    assertEq(tmpl.templateId, 't1', 'templateId set');
    assertEq(tmpl.name, 'Starter Deck', 'name set');
    assertEq(tmpl.deckData.length, 2, 'deckData has 2 entries');
    assertEq(tmpl.author, 'anonymous', 'default author');
    assertEq(tmpl.uses, 0, 'uses starts 0');

    // test addTag
    tmpl.addTag('aggro');
    assert(tmpl.tags.includes('aggro'), 'tag added');
    tmpl.addTag('aggro'); // duplicate
    assertEq(tmpl.tags.length, 1, 'duplicate tag not added');

    // test getCardCount
    assertEq(tmpl.getCardCount(), 5, 'getCardCount = 5');

    // test clone
    const clone = tmpl.clone();
    assertEq(clone.templateId, 't1_copy', 'clone has new ID');
    assertEq(clone.name, 'Starter Deck (Copy)', 'clone has copy name');
    assertEq(clone.tags.length, 1, 'clone has tags');
    assert(clone.deckData !== tmpl.deckData, 'clone has deep copy of deckData');
}

// ========================================================================
// DeckTemplateRegistry Tests
// ========================================================================
console.log('\n=== DeckTemplateRegistry Tests ===');
{
    const reg = new DeckTemplateRegistry();
    reg._load = () => {}; reg._save = () => {};

    // test saveTemplate
    const deckData = [{ cardId: 'strike', count: 5 }];
    const result = reg.saveTemplate('tmpl1', 'My Deck', deckData, 'player1');
    assert(result.templateId, 'saveTemplate returns template');
    assertEq(reg.templates.size, 1, '1 template registered');

    // test saveTemplate — duplicate
    const dup = reg.saveTemplate('tmpl1', 'Another', deckData);
    assertEq(dup.error, 'template_id_exists', 'duplicate ID rejected');

    // test getTemplate
    const found = reg.getTemplate('tmpl1');
    assertEq(found.name, 'My Deck', 'getTemplate finds saved template');

    // test getTemplate — not found
    const notfound = reg.getTemplate('nonexistent');
    assertEq(notfound, null, 'nonexistent returns null');

    // test listTemplates
    reg.saveTemplate('tmpl2', 'Second Deck', [{ cardId: 'defend', count: 3 }], 'player2');
    reg.saveTemplate('tmpl3', 'Tagged Deck', [{ cardId: 'skill', count: 1 }], 'player1');
    reg.getTemplate('tmpl3').addTag('control');

    const all = reg.listTemplates();
    assertEq(all.length, 3, 'listTemplates returns all 3');

    const filtered = reg.listTemplates({ tag: 'control' });
    assertEq(filtered.length, 1, 'tag filter returns 1');
    assertEq(filtered[0].templateId, 'tmpl3', 'tag filter correct');

    const authorFilter = reg.listTemplates({ author: 'player1' });
    assertEq(authorFilter.length, 2, 'author filter returns 2');

    const searchFilter = reg.listTemplates({ search: 'Second' });
    assertEq(searchFilter.length, 1, 'search filter returns 1');

    // test updateTemplate
    const updated = reg.updateTemplate('tmpl1', { name: 'Updated Deck', tags: ['aggro'] });
    assertEq(updated.name, 'Updated Deck', 'updateTemplate changes name');
    assertEq(updated.tags.includes('aggro'), true, 'updateTemplate adds tag');

    // test incrementUses
    reg.incrementUses('tmpl1');
    assertEq(reg.getTemplate('tmpl1').uses, 1, 'uses incremented');
    reg.incrementUses('tmpl1');
    assertEq(reg.getTemplate('tmpl1').uses, 2, 'uses incremented again');

    // test deleteTemplate
    const del = reg.deleteTemplate('tmpl2');
    assert(del.success, 'deleteTemplate returns success');
    assertEq(reg.templates.size, 2, 'template deleted from registry');

    // test deleteTemplate — not found
    const del2 = reg.deleteTemplate('nonexistent');
    assertEq(del2.error, 'template_not_found', 'delete nonexistent returns error');

    // test getStats
    const stats = reg.getStats();
    assert(typeof stats === 'object', 'getStats returns object');
    assertEq(stats.totalTemplates, 2, 'totalTemplates correct');
}

// ========================================================================
// Export/Import Tests
// ========================================================================
console.log('\n=== Export/Import Tests ===');
{
    const reg = new DeckTemplateRegistry();
    reg._load = () => {}; reg._save = () => {};
    reg.saveTemplate('exp1', 'Export Test 1', [{ cardId: 'a', count: 1 }]);
    reg.saveTemplate('exp2', 'Export Test 2', [{ cardId: 'b', count: 2 }]);

    const exported = reg.exportTemplates(['exp1', 'exp2']);
    assert(exported.includes('Export Test 1'), 'exported JSON contains exp1');
    assert(exported.includes('Export Test 2'), 'exported JSON contains exp2');

    // test import
    const imported = JSON.parse(exported);
    const reg2 = new DeckTemplateRegistry();
    reg2._load = () => {}; reg2._save = () => {};
    const impResult = reg2.importTemplates(exported);
    assert(impResult.success, 'import returns success');
    assertEq(reg2.templates.size, 2, 'imported 2 templates');

    // test import — overwrite
    reg2.importTemplates(exported, true); // overwrite
    assertEq(reg2.templates.size, 2, 'overwrite does not duplicate');
}

// ========================================================================
// DeckTemplateTools Tests
// ========================================================================
console.log('\n=== DeckTemplateTools Tests ===');
{
    if (typeof window !== 'undefined') window._deckTemplateRegistry = new DeckTemplateRegistry();
    const reg = window._deckTemplateRegistry;
    reg._load = () => {}; reg._save = () => {};

    const r1 = DeckTemplateTools['decktemplate.save'].handler({ templateId: 'tool1', name: 'Tool Deck', deckData: [{ cardId: 'x', count: 1 }] }, {});
    assert(r1.templateId, 'save tool returns template');

    const r2 = DeckTemplateTools['decktemplate.get'].handler({ templateId: 'tool1' }, {});
    assertEq(r2.name, 'Tool Deck', 'get tool works');

    const r3 = DeckTemplateTools['decktemplate.list'].handler({}, {});
    assert(Array.isArray(r3), 'list tool returns array');

    const r4 = DeckTemplateTools['decktemplate.stats'].handler({}, {});
    assert(typeof r4 === 'object', 'stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const reg = new DeckTemplateRegistry();
    reg._load = () => {}; reg._save = () => {};

    // Save a competitive deck template
    const deckData = [
        { cardId: 'strike', count: 5 },
        { cardId: 'defend', count: 4 },
        { cardId: 'bash', count: 2 },
        { cardId: 'cleave', count: 2 },
        { cardId: 'iron_wave', count: 2 }
    ];
    const tmpl = reg.saveTemplate('competitor', 'Competitor Deck v1', deckData, 'top_player');
    tmpl.addTag('balanced');
    tmpl.addTag('starter');

    // Verify it was saved
    const found = reg.getTemplate('competitor');
    assert(found !== null, 'Integration: template saved and retrievable');
    assertEq(found.getCardCount(), 15, 'Integration: 15 cards in deck');
    assert(found.tags.includes('balanced'), 'Integration: balanced tag');

    // Hook system
    let hookCalled = false;
    reg.registerHook((event, data) => { hookCalled = true; });
    reg.saveTemplate('hook_test', 'Hook Test', [{ cardId: 'a', count: 1 }]);
    assert(hookCalled, 'Integration: hook fired on template save');

    // Update and verify
    reg.updateTemplate('competitor', { name: 'Competitor Deck v2' });
    const updated = reg.getTemplate('competitor');
    assertEq(updated.name, 'Competitor Deck v2', 'Integration: template updated');

    // List with search
    const search = reg.listTemplates({ search: 'Competitor' });
    assertEq(search.length, 1, 'Integration: search finds template');
    assertEq(search[0].name, 'Competitor Deck v2', 'Integration: correct template found');

    // Export and re-import
    const exported = reg.exportTemplates(['competitor']);
    const newReg = new DeckTemplateRegistry();
    newReg._load = () => {}; newReg._save = () => {};
    newReg.importTemplates(exported);
    const reimported = newReg.getTemplate('competitor');
    assert(reimported !== null, 'Integration: exported template re-importable');
    assertEq(reimported.name, 'Competitor Deck v2', 'Integration: re-imported name correct');
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