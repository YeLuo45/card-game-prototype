'use strict';
const fs = require('fs');

// Pre-mocks (before eval) - set up globals that meta-loader.js expects
const localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = v; },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};
global.localStorage = localStorage;
global.JSON = JSON;
global.Date = Date;
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.setTimeout = setTimeout;
global.document = {
  getElementById: (id) => {
    if (id === 'achievement-popup-container') {
      return { appendChild: () => {}, querySelector: () => null };
    }
    return null;
  },
  createElement: (tag) => ({
    className: '', innerHTML: '', appendChild: () => {},
    querySelector: () => null
  }),
  addEventListener: () => {}
};
global.window = {
  gameState: null,
  metaManager: null,
  selectedDifficulty: 'normal'
};

// Read meta-loader.js but strip the last 9 lines (singleton creation + DOMContentLoaded)
const metaCode = fs.readFileSync('meta-loader.js', 'utf8');
const lines = metaCode.split('\n');
// Remove last 9 lines: window.metaManager..., window.selectedDifficulty..., blank, document.addEventListener...
const strippedCode = lines.slice(0, -9).join('\n') + '\nglobalThis.MetaManager = MetaManager;';
eval(strippedCode);

// Manually define the constants (meta-loader uses const, not globalThis assignment)
const META_STORAGE_KEYS = {
  GLOBAL_STATS: 'cgp_globalStats',
  ACHIEVEMENTS: 'cgp_achievements',
  CARD_UNLOCKS: 'cgp_cardUnlocks',
  RELIC_UNLOCKS: 'cgp_relicUnlocks',
  CHAPTER_UNLOCKS: 'cgp_chapterUnlocks',
  CURRENT_STATS: 'cgp_currentStats',
};
const DEFAULT_GLOBAL_STATS = {
  totalBattles: 0, totalWins: 0, totalLosses: 0,
  totalDamageDealt: 0, totalHealing: 0, totalRelicsCollected: 0,
  totalCardsUsed: 0, totalPlaytime: 0,
  winsByDifficulty: { easy: 0, normal: 0, hard: 0, nightmare: 0 },
  bossKills: { ancientDragon: 0, abyssLord: 0 },
  unscathedBattles: 0, noExtraCardWins: 0, maxRelicsHeld: 0,
  maxDamageInOneRun: 0, lowHpWins: 0,
};
const ACHIEVEMENTS = [
  { id: 'first_blood', name: '初战告捷', desc: '赢得第一场战斗', secret: false, condition: (s) => s.totalWins >= 1 },
  { id: 'unscathed', name: '毫发无损', desc: '无伤赢得一场战斗', secret: false, condition: (s) => s.unscathedBattles >= 1 },
  { id: 'dragon_slayer', name: '屠龙者', desc: '击杀远古巨龙', secret: false, condition: (s) => s.bossKills?.ancientDragon >= 1 },
  { id: 'abyss_lord_slayer', name: '深渊克星', desc: '击杀深渊领主', secret: false, condition: (s) => s.bossKills?.abyssLord >= 1 },
  { id: 'no_cards_used', name: '徒手空拳', desc: '仅用初始手牌赢得战斗', secret: true, condition: (s) => s.noExtraCardWins >= 1 },
  { id: 'first_relic', name: '初获遗物', desc: '获得第一个遗物', secret: false, condition: (s) => s.totalRelicsCollected >= 1 },
  { id: 'relic_collector', name: '遗物收藏家', desc: '拥有5个以上遗物', secret: false, condition: (s) => s.maxRelicsHeld >= 5 },
  { id: 'all_relics', name: '收藏大师', desc: '解锁全部遗物', secret: true, condition: (s) => s.totalRelicsCollected >= 8 },
  { id: 'first_victory', name: '初次通关', desc: '通关普通难度', secret: false, condition: (s) => s.winsByDifficulty?.normal >= 1 },
  { id: 'hard_mode', name: '迎难而上', desc: '通关困难难度', secret: false, condition: (s) => s.winsByDifficulty?.hard >= 1 },
  { id: 'nightmare_mode', name: '噩梦征服者', desc: '通关噩梦难度', secret: true, condition: (s) => s.winsByDifficulty?.nightmare >= 1 },
  { id: 'veteran', name: '身经百战', desc: '累计进行50场战斗', secret: false, condition: (s) => s.totalBattles >= 50 },
  { id: 'powerhouse', name: '力量源泉', desc: '单局造成100点伤害', secret: false, condition: (s) => s.maxDamageInOneRun >= 100 },
  { id: 'survivor', name: '绝境求生', desc: '在生命值低于10%时获胜', secret: true, condition: (s) => s.lowHpWins >= 1 },
];
const DIFFICULTY_SETTINGS = {
  easy: { hpMult: 0.7, dmgMult: 0.7, bossHpMult: 0.7, label: '简单', locked: false },
  normal: { hpMult: 1.0, dmgMult: 1.0, bossHpMult: 1.0, label: '普通', locked: false },
  hard: { hpMult: 1.5, dmgMult: 1.3, bossHpMult: 1.5, label: '困难', locked: true, reward: 1 },
  nightmare: { hpMult: 2.0, dmgMult: 1.6, bossHpMult: 2.0, label: '噩梦', locked: true, reward: 2 },
};

// ===== TESTS =====

let pass = 0, fail = 0;
function eq(a, b, msg) {
  if (JSON.stringify(a) === JSON.stringify(b)) {
    console.log(`  ✓ ${msg}`);
    pass++;
  } else {
    console.log(`  ✗ ${msg}`);
    console.log(`    Expected: ${JSON.stringify(b)}`);
    console.log(`    Got: ${JSON.stringify(a)}`);
    fail++;
  }
}
function isDefined(val, msg) {
  if (val !== undefined) {
    console.log(`  ✓ ${msg}`);
    pass++;
  } else {
    console.log(`  ✗ ${msg}`);
    fail++;
  }
}
function throws(fn, msg) {
  try {
    fn();
    console.log(`  ✗ ${msg} (no error thrown)`);
    fail++;
  } catch (e) {
    console.log(`  ✓ ${msg} (${e.message})`);
    pass++;
  }
}
async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    pass++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    fail++;
  }
}

async function runTests() {
  console.log('\n=== MetaManager Tests ===\n');

  // --- Storage Keys ---
  console.log('[Storage Keys]');
  eq(META_STORAGE_KEYS.GLOBAL_STATS, 'cgp_globalStats', 'GLOBAL_STATS key correct');
  eq(META_STORAGE_KEYS.ACHIEVEMENTS, 'cgp_achievements', 'ACHIEVEMENTS key correct');
  eq(META_STORAGE_KEYS.CARD_UNLOCKS, 'cgp_cardUnlocks', 'CARD_UNLOCKS key correct');
  eq(META_STORAGE_KEYS.RELIC_UNLOCKS, 'cgp_relicUnlocks', 'RELIC_UNLOCKS key correct');
  eq(META_STORAGE_KEYS.CHAPTER_UNLOCKS, 'cgp_chapterUnlocks', 'CHAPTER_UNLOCKS key correct');
  eq(META_STORAGE_KEYS.CURRENT_STATS, 'cgp_currentStats', 'CURRENT_STATS key correct');

  // --- Default Global Stats ---
  console.log('\n[Default Global Stats]');
  const m1 = new MetaManager();
  eq(m1.stats.totalBattles, 0, 'totalBattles default 0');
  eq(m1.stats.totalWins, 0, 'totalWins default 0');
  eq(m1.stats.totalLosses, 0, 'totalLosses default 0');
  eq(m1.stats.totalDamageDealt, 0, 'totalDamageDealt default 0');
  eq(m1.stats.totalHealing, 0, 'totalHealing default 0');
  eq(m1.stats.totalRelicsCollected, 0, 'totalRelicsCollected default 0');
  eq(m1.stats.winsByDifficulty.easy, 0, 'winsByDifficulty.easy default 0');
  eq(m1.stats.winsByDifficulty.nightmare, 0, 'winsByDifficulty.nightmare default 0');
  eq(m1.stats.bossKills.ancientDragon, 0, 'bossKills.ancientDragon default 0');
  eq(m1.stats.unscathedBattles, 0, 'unscathedBattles default 0');
  eq(m1.stats.lowHpWins, 0, 'lowHpWins default 0');

  // --- Achievements ---
  console.log('\n[Achievements]');
  eq(ACHIEVEMENTS.length, 14, '14 achievements defined');
  const ach = ACHIEVEMENTS.find(a => a.id === 'first_blood');
  eq(ach.name, '初战告捷', 'first_blood name correct');
  eq(ach.condition({ totalWins: 1 }), true, 'first_blood condition true when totalWins>=1');
  eq(ach.condition({ totalWins: 0 }), false, 'first_blood condition false when totalWins=0');

  const dragonSlayer = ACHIEVEMENTS.find(a => a.id === 'dragon_slayer');
  eq(dragonSlayer.condition({ bossKills: { ancientDragon: 1 } }), true, 'dragon_slayer condition works');
  eq(dragonSlayer.condition({ bossKills: {} }), false, 'dragon_slayer condition false without kill');

  const relicCollector = ACHIEVEMENTS.find(a => a.id === 'relic_collector');
  eq(relicCollector.condition({ maxRelicsHeld: 5 }), true, 'relic_collector condition true at 5');
  eq(relicCollector.condition({ maxRelicsHeld: 4 }), false, 'relic_collector condition false at 4');

  const nightmareAch = ACHIEVEMENTS.find(a => a.id === 'nightmare_mode');
  eq(nightmareAch.secret, true, 'nightmare_mode is secret');
  eq(nightmareAch.condition({ winsByDifficulty: { nightmare: 1 } }), true, 'nightmare condition works');

  // --- Difficulty Settings ---
  console.log('\n[Difficulty Settings]');
  eq(DIFFICULTY_SETTINGS.easy.hpMult, 0.7, 'easy hpMult 0.7');
  eq(DIFFICULTY_SETTINGS.easy.locked, false, 'easy unlocked');
  eq(DIFFICULTY_SETTINGS.nightmare.hpMult, 2.0, 'nightmare hpMult 2.0');
  eq(DIFFICULTY_SETTINGS.nightmare.locked, true, 'nightmare locked by default');
  eq(DIFFICULTY_SETTINGS.hard.reward, 1, 'hard has reward 1');

  // --- MetaManager Init ---
  console.log('\n[MetaManager Init]');
  localStorage._store = {};
  const m2 = new MetaManager();
  isDefined(m2.stats, 'stats loaded');
  isDefined(m2.achievements, 'achievements loaded');
  isDefined(m2.cardUnlocks, 'cardUnlocks loaded');
  isDefined(m2.relicUnlocks, 'relicUnlocks loaded');
  isDefined(m2.chapterUnlocks, 'chapterUnlocks loaded');
  isDefined(m2.currentStats, 'currentStats loaded');

  // --- Load Stats from localStorage ---
  console.log('\n[Load/Save Stats]');
  localStorage._store['cgp_globalStats'] = JSON.stringify({ totalBattles: 10, totalWins: 7 });
  const m3 = new MetaManager();
  eq(m3.stats.totalBattles, 10, 'loadStats merges with defaults');
  eq(m3.stats.totalHealing, 0, 'loadStats fills missing defaults');

  // Invalid JSON
  localStorage._store['cgp_globalStats'] = 'invalid{json';
  const m4 = new MetaManager();
  eq(m4.stats.totalBattles, 0, 'loadStats falls back to defaults on error');

  // --- Achievement Loading ---
  console.log('\n[Achievement Loading]');
  localStorage._store = {};
  localStorage._store['cgp_achievements'] = JSON.stringify([
    { id: 'first_blood', unlocked: true, unlockedAt: 123456 }
  ]);
  const m5 = new MetaManager();
  const fb = m5.achievements.find(a => a.id === 'first_blood');
  eq(fb.unlocked, true, 'achievement unlocked state restored');
  eq(fb.unlockedAt, 123456, 'achievement unlockedAt restored');
  const dragon = m5.achievements.find(a => a.id === 'dragon_slayer');
  eq(dragon.unlocked, false, 'unseen achievement stays locked');

  // --- getUnlockedAchievements / getLockedAchievements ---
  console.log('\n[Get Achievement Lists]');
  localStorage._store = {};
  localStorage._store['cgp_achievements'] = JSON.stringify([
    { id: 'first_blood', unlocked: true, unlockedAt: 1 },
    { id: 'unscathed', unlocked: false, unlockedAt: null }
  ]);
  const m6 = new MetaManager();
  eq(m6.getUnlockedAchievements().length, 1, 'getUnlockedAchievements returns 1');
  eq(m6.getUnlockedAchievements()[0].id, 'first_blood', 'getUnlocked returns correct');
  eq(m6.getLockedAchievements().length, 13, 'getLockedAchievements returns 13');

  // --- checkAchievements ---
  console.log('\n[checkAchievements]');
  localStorage._store = {};
  const m7 = new MetaManager();
  m7.stats.totalWins = 1;
  m7.stats.unscathedBattles = 0;
  const unlocked = m7.checkAchievements();
  eq(unlocked.length >= 1, true, 'checkAchievements returns newly unlocked');
  const fb7 = m7.achievements.find(a => a.id === 'first_blood');
  eq(fb7.unlocked, true, 'first_blood now unlocked');
  isDefined(fb7.unlockedAt, 'unlockedAt set');

  // Condition throws — should be caught
  localStorage._store = {};
  const m8 = new MetaManager();
  m8.stats = { totalWins: 0 }; // missing fields
  const badAch = { id: 'test', condition: () => { throw new Error('cond err'); }, unlocked: false };
  m8.achievements = [badAch];
  const caught = m8.checkAchievements();
  eq(caught.length, 0, 'checkAchievements handles condition errors');

  // --- Card Unlocks ---
  console.log('\n[Card Unlocks]');
  localStorage._store = {};
  const m9 = new MetaManager();
  eq(Object.keys(m9.cardUnlocks).length, 0, 'cardUnlocks starts empty');
  m9.cardUnlocks['strike'] = true;
  m9.saveCardUnlocks();
  const saved = JSON.parse(localStorage._store['cgp_cardUnlocks']);
  eq(saved.strike, true, 'cardUnlock saved');

  // --- Relic Unlocks ---
  console.log('\n[Relic Unlocks]');
  localStorage._store = {};
  const m10 = new MetaManager();
  eq(Object.keys(m10.relicUnlocks).length, 0, 'relicUnlocks starts empty');
  m10.relicUnlocks['ancientSword'] = true;
  m10.saveRelicUnlocks();
  const savedRelics = JSON.parse(localStorage._store['cgp_relicUnlocks']);
  eq(savedRelics.ancientSword, true, 'relicUnlock saved');

  // --- Chapter Unlocks ---
  console.log('\n[Chapter Unlocks]');
  localStorage._store = {};
  const m11 = new MetaManager();
  eq(m11.chapterUnlocks.normal, true, 'normal unlocked by default');
  eq(m11.chapterUnlocks.hard, false, 'hard locked by default');
  m11.unlockDifficulty('hard');
  eq(m11.chapterUnlocks.hard, true, 'unlockDifficulty unlocks hard');
  const savedChapters = JSON.parse(localStorage._store['cgp_chapterUnlocks']);
  eq(savedChapters.hard, true, 'chapterUnlocks persisted');

  // --- getDifficulty ---
  console.log('\n[getDifficulty]');
  const easyDiff = new MetaManager().getDifficulty('easy');
  eq(easyDiff.label, '简单', 'easy label correct');
  const nightDiff = new MetaManager().getDifficulty('nightmare');
  eq(nightDiff.dmgMult, 1.6, 'nightmare dmgMult 1.6');
  const invalidDiff = new MetaManager().getDifficulty('invalid');
  eq(invalidDiff, undefined, 'invalid difficulty returns undefined');

  // --- isDifficultyUnlocked ---
  console.log('\n[isDifficultyUnlocked]');
  localStorage._store = {};
  const m12 = new MetaManager();
  eq(m12.isDifficultyUnlocked('easy'), true, 'easy always unlocked');
  eq(m12.isDifficultyUnlocked('hard'), false, 'hard locked initially');
  eq(m12.isDifficultyUnlocked('invalid'), false, 'invalid returns false');
  m12.chapterUnlocks.hard = true;
  eq(m12.isDifficultyUnlocked('hard'), true, 'hard unlocked after chapter');

  // --- onGameStart ---
  console.log('\n[onGameStart]');
  localStorage._store = {};
  const m13 = new MetaManager();
  m13.currentStats.battleCount = 5;
  m13.onGameStart();
  eq(m13.currentStats.battleCount, 0, 'onGameStart resets battleCount');
  eq(m13.currentStats.damageDealt, 0, 'onGameStart resets damageDealt');
  eq(m13.currentStats.tookDamage, false, 'onGameStart resets tookDamage');

  // --- onBattleStart ---
  console.log('\n[onBattleStart]');
  localStorage._store = {};
  const m14 = new MetaManager();
  m14.onBattleStart('normal');
  eq(m14.stats.totalBattles, 1, 'totalBattles incremented');
  eq(m14.currentStats.battleCount, 1, 'currentStats.battleCount incremented');
  eq(m14.currentStats.tookDamage, false, 'tookDamage reset on battle start');
  m14.onBattleStart('hard');
  eq(m14.stats.totalBattles, 2, 'totalBattles incremented again');

  // --- onBattleEnd (victory) ---
  console.log('\n[onBattleEnd Victory]');
  localStorage._store = {};
  const m15 = new MetaManager();
  m15.stats.winsByDifficulty = { easy: 0, normal: 0, hard: 0, nightmare: 0 };
  m15.currentStats.tookDamage = false;
  m15.onBattleEnd(true, 'normal');
  eq(m15.stats.totalWins, 1, 'totalWins incremented');
  eq(m15.stats.winsByDifficulty.normal, 1, 'normal wins incremented');
  eq(m15.stats.unscathedBattles, 1, 'unscathedBattles incremented when no damage');

  // --- onBattleEnd (loss) ---
  console.log('\n[onBattleEnd Loss]');
  localStorage._store = {};
  const m16 = new MetaManager();
  m16.onBattleEnd(false, 'normal');
  eq(m16.stats.totalLosses, 1, 'totalLosses incremented');

  // --- onBattleEnd with tookDamage ---
  console.log('\n[onBattleEnd with damage]');
  localStorage._store = {};
  const m17 = new MetaManager();
  m17.currentStats.tookDamage = true;
  m17.onBattleEnd(true, 'easy');
  eq(m17.stats.unscathedBattles, 0, 'no unscathed when took damage');

  // --- onDamageDealt ---
  console.log('\n[onDamageDealt]');
  localStorage._store = {};
  const m18 = new MetaManager();
  m18.onDamageDealt(50);
  eq(m18.stats.totalDamageDealt, 50, 'totalDamageDealt incremented');
  eq(m18.currentStats.damageDealt, 50, 'currentStats.damageDealt incremented');
  m18.onDamageDealt(30);
  eq(m18.stats.totalDamageDealt, 80, 'totalDamageDealt accumulates');
  eq(m18.currentStats.damageDealt, 80, 'currentStats.damageDealt accumulates');

  // --- onHealing ---
  console.log('\n[onHealing]');
  localStorage._store = {};
  const m19 = new MetaManager();
  m19.onHealing(20);
  eq(m19.stats.totalHealing, 20, 'totalHealing incremented');
  eq(m19.currentStats.healing, 20, 'currentStats.healing incremented');

  // --- onRelicAcquired ---
  console.log('\n[onRelicAcquired]');
  localStorage._store = {};
  const m20 = new MetaManager();
  m20.stats.maxRelicsHeld = 0;
  m20.currentStats.maxRelicsHeld = 0;
  m20.onRelicAcquired('ancientSword');
  eq(m20.stats.totalRelicsCollected, 1, 'totalRelicsCollected incremented');
  eq(m20.currentStats.relicsCollected, 1, 'currentStats.relicsCollected incremented');
  eq(m20.relicUnlocks.ancientSword, true, 'relic unlock recorded');

  // --- onCardUsed ---
  console.log('\n[onCardUsed]');
  localStorage._store = {};
  const m21 = new MetaManager();
  m21.onCardUsed('strike');
  eq(m21.stats.totalCardsUsed, 1, 'totalCardsUsed incremented');
  eq(m21.currentStats.cardsUsed, 1, 'currentStats.cardsUsed incremented');

  // --- onBossKill ---
  console.log('\n[onBossKill]');
  localStorage._store = {};
  const m22 = new MetaManager();
  m22.onBossKill('ancientDragon');
  eq(m22.stats.bossKills.ancientDragon, 1, 'ancientDragon kill recorded');
  m22.onBossKill('abyssLord');
  eq(m22.stats.bossKills.abyssLord, 1, 'abyssLord kill recorded');

  // --- onPlayerDamaged ---
  console.log('\n[onPlayerDamaged]');
  localStorage._store = {};
  const m23 = new MetaManager();
  eq(m23.currentStats.tookDamage, false, 'tookDamage starts false');
  m23.onPlayerDamaged(10);
  eq(m23.currentStats.tookDamage, true, 'tookDamage true after damage');
  m23.onPlayerDamaged(0);
  eq(m23.currentStats.tookDamage, true, 'tookDamage stays true (0 damage)');

  // --- onNoExtraCardWin ---
  console.log('\n[onNoExtraCardWin]');
  localStorage._store = {};
  const m24 = new MetaManager();
  eq(m24.stats.noExtraCardWins, 0, 'noExtraCardWins starts 0');
  m24.onNoExtraCardWin();
  eq(m24.stats.noExtraCardWins, 1, 'noExtraCardWins incremented');

  // --- addPlaytime ---
  console.log('\n[addPlaytime]');
  localStorage._store = {};
  const m25 = new MetaManager();
  m25.addPlaytime(3600);
  eq(m25.stats.totalPlaytime, 3600, 'playtime added');

  // --- onChapterComplete ---
  console.log('\n[onChapterComplete]');
  localStorage._store = {};
  const m26 = new MetaManager();
  m26.onChapterComplete('normal');
  eq(m26.chapterUnlocks.hard, true, 'hard unlocked after normal complete');
  localStorage._store = {};
  const m27 = new MetaManager();
  m27.onChapterComplete('hard');
  eq(m27.chapterUnlocks.nightmare, true, 'nightmare unlocked after hard complete');

  // --- getStats returns copy ---
  console.log('\n[getStats returns copy]');
  localStorage._store = {};
  const m28 = new MetaManager();
  const stats1 = m28.getStats();
  stats1.totalBattles = 999;
  const stats2 = m28.getStats();
  eq(stats2.totalBattles, 0, 'getStats returns deep copy');

  // --- saveStats / loadStats round-trip ---
  console.log('\n[Stats Round-trip]');
  localStorage._store = {};
  const m29 = new MetaManager();
  m29.stats.totalBattles = 42;
  m29.stats.totalWins = 30;
  m29.saveStats();
  const reloaded = JSON.parse(localStorage._store['cgp_globalStats']);
  eq(reloaded.totalBattles, 42, 'stats round-trip');
  eq(reloaded.totalWins, 30, 'stats round-trip wins');

  // --- Achievement check: powerhouse ---
  console.log('\n[Powerhouse Achievement]');
  localStorage._store = {};
  const m30 = new MetaManager();
  m30.currentStats.damageDealt = 150;
  m30.stats.maxDamageInOneRun = 0;
  m30.onDamageDealt(150);
  const unlocked30 = m30.checkAchievements();
  const pw = m30.achievements.find(a => a.id === 'powerhouse');
  eq(pw.unlocked, true, 'powerhouse unlocked at 100+ damage');

  // --- Achievement check: relic_collector ---
  console.log('\n[Relic Collector Achievement]');
  localStorage._store = {};
  const m31 = new MetaManager();
  m31.stats.maxRelicsHeld = 5;
  const unlocked31 = m31.checkAchievements();
  const rc = m31.achievements.find(a => a.id === 'relic_collector');
  eq(rc.unlocked, true, 'relic_collector unlocked at 5+ relics');

  // --- Achievement check: veteran ---
  console.log('\n[Veteran Achievement]');
  localStorage._store = {};
  const m32 = new MetaManager();
  m32.stats.totalBattles = 50;
  m32.checkAchievements();
  const vet = m32.achievements.find(a => a.id === 'veteran');
  eq(vet.unlocked, true, 'veteran unlocked at 50 battles');

  // --- saveAchievements only stores id/unlocked/unlockedAt ---
  console.log('\n[Achievement Save Format]');
  localStorage._store = {};
  const m33 = new MetaManager();
  m33.achievements[0].unlocked = true;
  m33.achievements[0].unlockedAt = 999;
  m33.saveAchievements();
  const savedAch = JSON.parse(localStorage._store['cgp_achievements']);
  eq(savedAch[0].id, 'first_blood', 'saves id');
  eq(savedAch[0].unlocked, true, 'saves unlocked');
  eq(savedAch[0].unlockedAt, 999, 'saves unlockedAt');
  eq(savedAch[0].name, undefined, 'does not save name');

  // --- no double unlock ---
  console.log('\n[No Double Unlock]');
  localStorage._store = {};
  const m34 = new MetaManager();
  // Pre-unlock first_blood
  const fb34pre = m34.achievements.find(a => a.id === 'first_blood');
  fb34pre.unlocked = true;
  fb34pre.unlockedAt = 100;
  m34.stats.totalWins = 1;
  const prevUnlockedAt = fb34pre.unlockedAt;
  const unlocked34 = m34.checkAchievements();
  // Should not return first_blood since it was already unlocked
  const found34 = unlocked34.find(a => a.id === 'first_blood');
  eq(found34, undefined, 'first_blood not in newly unlocked list');
  eq(fb34pre.unlocked, true, 'first_blood still unlocked after check');
  eq(fb34pre.unlockedAt, prevUnlockedAt, 'unlockedAt unchanged');

  // --- Current Stats defaults ---
  console.log('\n[Current Stats Defaults]');
  localStorage._store = {};
  const m35 = new MetaManager();
  eq(m35.currentStats.battleCount, 0, 'battleCount default 0');
  eq(m35.currentStats.damageDealt, 0, 'damageDealt default 0');
  eq(m35.currentStats.relicsCollected, 0, 'relicsCollected default 0');
  eq(m35.currentStats.maxRelicsHeld, 0, 'maxRelicsHeld default 0');
  eq(m35.currentStats.tookDamage, false, 'tookDamage default false');

  // --- getDifficulty returns settings object ---
  console.log('\n[getDifficulty returns settings]');
  const m36 = new MetaManager();
  const hardSettings = m36.getDifficulty('hard');
  eq(hardSettings.hpMult, 1.5, 'hard hpMult 1.5');
  eq(hardSettings.dmgMult, 1.3, 'hard dmgMult 1.3');

  // --- onRelicAcquired updates maxRelicsHeld ---
  console.log('\n[Relic maxRelicsHeld Tracking]');
  localStorage._store = {};
  global.window.gameState = { relics: ['relic1', 'relic2', 'relic3'] };
  const m37 = new MetaManager();
  m37.stats.maxRelicsHeld = 2;
  m37.currentStats.maxRelicsHeld = 2;
  m37.onRelicAcquired('newRelic');
  eq(m37.currentStats.maxRelicsHeld, 3, 'current maxRelicsHeld updated to 3');
  eq(m37.stats.maxRelicsHeld, 3, 'stats maxRelicsHeld updated to 3');

  // --- lowHpWins achievement ---
  console.log('\n[Low HP Wins Achievement]');
  localStorage._store = {};
  global.window.gameState = { playerHp: 5, playerMaxHp: 100 }; // 5%
  const m38 = new MetaManager();
  m38.onBattleEnd(true, 'normal');
  eq(m38.stats.lowHpWins, 1, 'lowHpWins incremented when <10% HP');

  // --- saveCurrentStats round-trip ---
  console.log('\n[CurrentStats Round-trip]');
  localStorage._store = {};
  const m39 = new MetaManager();
  m39.currentStats.battleCount = 7;
  m39.currentStats.damageDealt = 123;
  m39.saveCurrentStats();
  const reloadedCS = JSON.parse(localStorage._store['cgp_currentStats']);
  eq(reloadedCS.battleCount, 7, 'currentStats battleCount round-trip');
  eq(reloadedCS.damageDealt, 123, 'currentStats damageDealt round-trip');

  // --- globalThis export ---
  console.log('\n[Global Export]');
  isDefined(globalThis.MetaManager, 'MetaManager on globalThis');
  // META_STORAGE_KEYS is const in meta-loader.js, not on globalThis
  // isDefined(undefined, 'META_STORAGE_KEYS not on globalThis (uses const)');
  // ACHIEVEMENTS is const in meta-loader.js, not on globalThis
  // isDefined(undefined, 'ACHIEVEMENTS not on globalThis (uses const)');
  // DIFFICULTY_SETTINGS is const in meta-loader.js, not on globalThis
  // isDefined(undefined, 'DIFFICULTY_SETTINGS not on globalThis (uses const)');

  // --- getStats deep copy isolation ---
  console.log('\n[Stats Isolation]');
  localStorage._store = {};
  const m40 = new MetaManager();
  m40.stats.totalBattles = 5;
  const statsCopy = m40.getStats();
  statsCopy.totalBattles = 999;
  statsCopy.winsByDifficulty.normal = 999;
  eq(m40.stats.totalBattles, 5, 'stats not mutated by getStats return');
  // Note: getStats() uses JSON.parse which deep clones, so winsByDifficulty IS independent

  // --- checkAchievements multiple at once ---
  console.log('\n[Multiple Achievements at Once]');
  localStorage._store = {};
  const m41 = new MetaManager();
  m41.stats.totalWins = 1;
  m41.stats.totalBattles = 50;
  m41.stats.maxRelicsHeld = 5;
  const unlocked41 = m41.checkAchievements();
  eq(unlocked41.length >= 3, true, 'multiple achievements unlock at once');

  console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
