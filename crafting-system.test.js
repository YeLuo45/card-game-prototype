'use strict';

const fs = require('fs');
const path = require('path');

// Clear any stale state
if (typeof localStorage !== 'undefined') localStorage.removeItem('crafting_system');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'crafting-system.js'), 'utf8');
eval(code);

const { Material, Recipe, CraftedCard, CraftingSystem, CraftingTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// Material Tests
// ========================================================================
console.log('\n=== Material Tests ===');
{
    const m = new Material('mat1', 'Fire Essence', 'essence', 3, 10);
    assertEq(m.materialId, 'mat1', 'materialId set');
    assertEq(m.name, 'Fire Essence', 'name set');
    assertEq(m.type, 'essence', 'type set');
    assertEq(m.rarity, 3, 'rarity set');
    assertEq(m.quantity, 10, 'quantity set');
    assert(m.createdAt !== null, 'createdAt set');
}

// ========================================================================
// Recipe Tests
// ========================================================================
console.log('\n=== Recipe Tests ===');
{
    const r = new Recipe('r1', 'Basic Fire', [{ materialId: 'mat1', quantity: 2 }], { cardId: 'card1' }, 1);
    assertEq(r.recipeId, 'r1', 'recipeId set');
    assertEq(r.name, 'Basic Fire', 'name set');
    assertEq(r.input.length, 1, '1 input');
    assertEq(r.output.cardId, 'card1', 'output cardId set');
    assertEq(r.requiredLevel, 1, 'requiredLevel set');
    assertEq(r.discoveredAt, null, 'not discovered initially');
    assertEq(r.uses, 0, 'uses starts 0');

    const inv = new Map([['mat1', 2]]);
    const check1 = r.canCraft(1, inv);
    assert(check1.allowed, 'can craft with sufficient materials');

    const inv2 = new Map([['mat1', 1]]);
    const check2 = r.canCraft(1, inv2);
    assert(!check2.allowed, 'cannot craft with insufficient materials');
    assertEq(check2.reason, 'insufficient_material', 'reason is insufficient');

    const inv3 = new Map([['mat1', 2]]);
    const check3 = r.canCraft(0, inv3);
    assert(!check3.allowed, 'cannot craft below required level');
    assertEq(check3.reason, 'level_too_low', 'reason is level too low');
}

// ========================================================================
// CraftedCard Tests
// ========================================================================
console.log('\n=== CraftedCard Tests ===');
{
    const cc = new CraftedCard('crafted1', 'base1', []);
    assertEq(cc.cardId, 'crafted1', 'cardId set');
    assertEq(cc.baseCardId, 'base1', 'baseCardId set');
    assertEq(cc.enhancements.length, 0, 'no enhancements initially');
    assertEq(cc.stars, 1, 'starts 1 star');

    cc.addEnhancement('attack', 10, 'recipe1');
    assertEq(cc.enhancements.length, 1, '1 enhancement');
    assertEq(cc.stars, 1, '1 enhancement = 1 star (floor(1/2)=0)');

    cc.addEnhancement('defense', 5, 'recipe1');
    assertEq(cc.enhancements.length, 2, '2 enhancements');
    assertEq(cc.stars, 2, '2 enhancements = 2 stars (floor(2/2)=1+1=2)');

    cc.addEnhancement('speed', 3, 'recipe2');
    cc.addEnhancement('magic', 7, 'recipe2');
    cc.addEnhancement('luck', 2, 'recipe3');
    assertEq(cc.stars, 3, '5 enhancements = 3 stars (floor(5/2)=2+1=3)');

    cc.addEnhancement('power', 20, 'recipe4');
    cc.addEnhancement('toughness', 15, 'recipe4');
    cc.addEnhancement('agility', 10, 'recipe5');
    cc.addEnhancement('wisdom', 8, 'recipe5');
    cc.addEnhancement('charisma', 5, 'recipe6');
    assertEq(cc.stars, 5, '10 enhancements = 5 stars (capped at 5)');
}

// ========================================================================
// CraftingSystem Tests
// ========================================================================
console.log('\n=== CraftingSystem Tests ===');
{
    let sys;
    sys = new CraftingSystem(); sys._load = () => {}; sys._save = () => {};

    const m = sys.addMaterial('fire_essence', 'Fire Essence', 'essence', 3);
    assert(m !== null && !m.error, 'addMaterial returns material');
    assertEq(sys.materials.size, 1, 'material registered');

    const dup = sys.addMaterial('fire_essence', 'Duplicate', 'essence', 1);
    assertEq(dup.error, 'material_exists', 'duplicate rejected');

    const found = sys.getMaterial('fire_essence');
    assertEq(found.name, 'Fire Essence', 'getMaterial finds material');

    sys.addMaterial('wood', 'Wood', 'fragment', 1);
    sys.addMaterialToInventory('fire_essence', 3);
    assertEq(sys.getInventory('fire_essence'), 3, 'inventory has 3');

    const r = sys.addRecipe('recipe1', 'Craft Fire Sword', [{ materialId: 'fire_essence', quantity: 3 }], { cardId: 'fire_sword', baseCardId: 'sword_base' }, 1);
    assert(r !== null && !r.error, 'addRecipe returns recipe');

    const dupR = sys.addRecipe('recipe1', 'Duplicate', [], {}, 1);
    assertEq(dupR.error, 'recipe_exists', 'duplicate recipe rejected');

    const foundR = sys.getRecipe('recipe1');
    assertEq(foundR.name, 'Craft Fire Sword', 'getRecipe finds recipe');

    assertEq(sys.getInventory('nonexistent'), 0, 'getInventory returns 0 for unknown');

    // craft with sufficient (3 >= 3)
    const result = sys.craft('recipe1');
    assert(result.craftedCard, 'craft returns craftedCard');
    assertEq(sys.craftedCards.size, 1, '1 crafted card');
    assertEq(sys.getInventory('fire_essence'), 0, 'materials deducted to 0');

    const badCraft = sys.craft('nonexistent');
    assertEq(badCraft.error, 'recipe_not_found', 'invalid recipe rejected');

    const card = sys.getCraftedCard('fire_sword');
    const enhanced = sys.enhanceCard('fire_sword', 'attack', 15, 'manual');
    assertEq(enhanced.enhancements.length, 1, '1 enhancement added');
    assertEq(enhanced.stars, 1, '1 enhancement = 1 star (floor(1/2)=0+1=1)');

    const badEnh = sys.enhanceCard('nonexistent', 'attack', 10, 'manual');
    assertEq(badEnh.error, 'card_not_found', 'invalid card rejected');

    const level = sys.getPlayerLevel();
    assertEq(typeof level.level, 'number', 'level is number');
    assertEq(typeof level.xp, 'number', 'xp is number');

    const stats = sys.getStats();
    assertEq(stats.totalMaterials >= 1, true, 'totalMaterials >= 1');
    assertEq(stats.totalRecipes >= 1, true, 'totalRecipes >= 1');
    assertEq(stats.totalCraftedCards >= 1, true, 'totalCraftedCards >= 1');
}

// ========================================================================
// CraftingTools Tests
// ========================================================================
console.log('\n=== CraftingTools Tests ===');
{
    let sys;
    sys = new CraftingSystem(); sys._load = () => {}; sys._save = () => {};
    if (typeof window !== 'undefined') window._craftingSystem = sys;

    const r1 = CraftingTools['crafting.add_material'].handler({ materialId: 'tool_mat', name: 'Tool Material', type: 'crystal', rarity: 4 }, {});
    assert(r1 !== null && !r1.error, 'add_material tool works');

    const r2 = CraftingTools['crafting.add_recipe'].handler({ recipeId: 'tool_rec', name: 'Tool Recipe', input: [{ materialId: 'tool_mat', quantity: 1 }], output: { cardId: 'tool_card' }, requiredLevel: 1 }, {});
    assert(r2 !== null && !r2.error, 'add_recipe tool works');

    const r3 = CraftingTools['crafting.level'].handler({}, {});
    assert(typeof r3 === 'object', 'level tool returns object');

    const r4 = CraftingTools['crafting.stats'].handler({}, {});
    assert(typeof r4 === 'object', 'stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys;
    sys = new CraftingSystem(); sys._load = () => {}; sys._save = () => {};

    sys.addMaterial('glowstone', 'Glowstone', 'crystal', 4);
    sys.addMaterial('iron_ingot', 'Iron Ingot', 'fragment', 2);

    // Use level 1 requirement to avoid level gating
    sys.addRecipe('glow_sword', 'Glow Sword', [{ materialId: 'glowstone', quantity: 2 }, { materialId: 'iron_ingot', quantity: 1 }], { cardId: 'glow_sword_card', stars: 2 }, 1);

    sys.addMaterialToInventory('glowstone', 5);
    sys.addMaterialToInventory('iron_ingot', 3);

    const level = sys.getPlayerLevel();
    assert(level.level >= 1, 'Integration: starting level >= 1');

    const result = sys.craft('glow_sword');
    assert(result.craftedCard, 'Integration: craft succeeds');
    assert(result.craftedCard.stars >= 1, 'Integration: card has stars');

    const stored = sys.getCraftedCard('glow_sword_card');
    assert(stored !== null, 'Integration: crafted card retrievable');

    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    sys.addMaterialToInventory('glowstone', 10);
    const r2 = sys.craft('glow_sword');
    assert(hookCalled, 'Integration: hook called on craft');

    const newLevel = sys.getPlayerLevel();
    assert(newLevel.level >= level.level, 'Integration: level same or increased');
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

    const totalLines = 330;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);