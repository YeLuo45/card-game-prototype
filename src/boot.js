// ============================================================================
// src/boot.js — 游戏启动引导
// 负责：加载顺序编排 → EventBus 初始化 → 路由注册 → UI 挂载
// ============================================================================
'use strict';

// ─── 加载 shared 层（无依赖）──────────────────────────────────────────────────
window._loadScript = function(src, attrs) {
  return new Promise(function(resolve, reject) {
    var el = document.createElement('script');
    el.src = src;
    if (attrs) Object.keys(attrs).forEach(function(k){ el.setAttribute(k, attrs[k]); });
    el.onload  = resolve;
    el.onerror = function(){ console.error('[boot] Failed to load: ' + src); reject(new Error(src)); };
    document.head.appendChild(el);
  });
};

// 共享层加载（必须最先）
var SHARED = [
  'src/shared/utils/storage.js',
  'src/shared/utils/random.js',
  'src/shared/utils/math.js',
  'src/shared/utils/event-bus.js',
  'src/shared/constants/game-constants.js',
  'src/shared/index.js'
];

// ─── 主加载序列（与 index.html 原有顺序一致）────────────────────────────────
// infrastructure
var INFRA = [
  'src/infrastructure/plugin/plugin-api.js',
  'src/infrastructure/plugin/plugin-loader.js',
  'src/infrastructure/loader/market-loader.js',
  'src/infrastructure/loader/relics-loader.js',
  'src/infrastructure/api/meta-loader.js',
  'src/infrastructure/loader/elite-loader.js',
  'src/infrastructure/sw.js',
  'src/infrastructure/api/game-mcp.js',
  'src/infrastructure/test/coverage-collector.js'
];

// domain/card/systems — 按类别顺序（与原 index.html 一致）
var CARD_SYSTEMS = [
  // fusion → evolution → gacha → rune → battle tower → achievement
  'src/domain/card/systems/fusion/fusion-engine.js',
  'src/domain/card/systems/fusion/fusion.js',
  'src/domain/card/systems/evolution/card-evolution.js',
  'src/domain/card/systems/gacha/gacha-summon.js',
  'src/domain/card/systems/rune/rune-inscription.js',
  'src/domain/battle/services/battle-tower.js',
  'src/domain/progression/services/achievement-gallery.service.js',
  // sealed → draft → tournament
  'src/domain/battle/services/sealed-deck-arena.js',
  'src/domain/battle/services/draft-tournament.js',
  'src/domain/meta/services/tournament-ladder.service.js',
  'src/domain/meta/services/deck-pro.service.js',      // card-deck-builder-pro
  'src/domain/progression/services/weekly-challenge.service.js',
  // combo → leaderboard → guild
  'src/domain/battle/services/combo-engine.js',
  'src/domain/meta/services/leaderboard-seasons.service.js',
  'src/domain/guild/services/guild-wars.service.js',
  'src/domain/card/systems/evolution/evolution-forge.js',
  'src/domain/progression/services/quest-scrolls.service.js',
  'src/domain/battle/services/arena-ladder.js',
  'src/domain/card/systems/deck/collection-vault.js',
  'src/domain/guild/services/alliance-network.service.js',
  'src/domain/meta/services/grand-prix.service.js',
  'src/domain/battle/services/war-room.js',
  'src/domain/progression/services/mythic-quests.service.js',
  'src/domain/card/systems/academy/academy.js',
  'src/domain/card/systems/realm/dungeon-depths.js',
  'src/domain/card/systems/effect/petrification.js',
  'src/domain/social/services/auction-house.service.js',
  'src/domain/card/systems/lab/spell-crafting.js',
  'src/domain/card/systems/binding/soul-binding.js',
  'src/domain/card/systems/summon/spirit-summoning.js',
  'src/domain/card/systems/time/chrono-maze.js',
  'src/domain/card/systems/fusion/elemental-fusion.js',
  'src/domain/card/systems/realm/astral-plane.js',
  'src/domain/card/systems/realm/void-realm.js',
  'src/domain/card/systems/realm/dragons-hoard.js',
  'src/domain/card/systems/sanctum/elemental-nexus.js',     // loaded once (deduped)
  'src/domain/card/systems/time/time-weave.js',
  'src/domain/card/systems/library/arcane-library.js',       // loaded once (deduped)
  'src/domain/card/systems/academy/astral-academy.js',
  'src/domain/meta/services/chronicle.service.js',
  'src/domain/card/systems/resource/mana-siphon.js',
  'src/domain/card/systems/challenge/riddle-tower.js',
  'src/domain/card/systems/realm/shadow-guild.js',
  'src/domain/card/systems/lab/alchemy-lab.js',
  'src/domain/card/systems/voyage/astral-voyage.js',
  'src/domain/card/systems/binding/spirit-forge.js',
  'src/domain/card/systems/realm/dream-realm.js',
  'src/domain/card/systems/academy/war-academy.js',
  'src/domain/card/systems/rune/rune-sanctum.js',
  'src/domain/card/systems/time/chrono-nexus.js',
  'src/domain/card/systems/binding/mystic-forge.js',
  'src/domain/card/systems/binding/void-nexus.js',
  'src/domain/card/systems/elemental/elemental-sanctum.js',
  'src/domain/card/systems/realm/spirit-realm.js',
  'src/domain/card/systems/observatory/celestial-observatory.js',
  'src/domain/card/systems/realm/shadow-vault.js',
  'src/domain/card/systems/library/arcane-tower.js',
  'src/domain/card/systems/lab/chaos-lab.js',
  'src/domain/card/systems/realm/storm-citadel.js',
  'src/domain/card/systems/realm/phoenix-shrine.js',
  'src/domain/card/systems/sanctum/divine-covenant.js',
  'src/domain/card/systems/sanctum/astral-rift.js',
  'src/domain/card/systems/sanctum/timeweaver-guild.js',
  'src/domain/card/systems/sanctum/necropolis-graveyard.js',
  'src/domain/card/systems/sanctum/soul-forge.js',
  'src/domain/card/systems/sanctum/leyline-nexus.js',
  'src/domain/card/systems/sanctum/void-sanctum.js',
  'src/domain/card/systems/sanctum/spirit-conclave.js',
  'src/domain/card/systems/sanctum/arcane-sanctum.js',
  'src/domain/card/systems/sanctum/storm-spire.js',
  'src/domain/card/systems/sanctum/lunar-sanctum.js',
  'src/domain/card/systems/sanctum/dragon-lair.js',
  'src/domain/card/systems/sanctum/enchanted-library.js',
  'src/domain/card/systems/sanctum/phoenix-realm.js',
  'src/domain/card/systems/sanctum/abyssal-depths.js',
  'src/domain/card/systems/sanctum/celestial-citadel.js',
  'src/domain/card/systems/sanctum/chrono-sanctum.js',
  'src/domain/card/systems/sanctum/shadow-conclave.js',
  'src/domain/card/systems/sanctum/crystal-sanctum.js',
  'src/domain/card/systems/sanctum/runic-sanctum.js',
  'src/domain/card/systems/gacha/gacha.js',
  'src/domain/card/systems/rune/rune-system.js',
  'src/domain/guild/services/guild.service.js',
  'src/infrastructure/loader/legacy-system.js',     // legacy-system.js
  'src/domain/meta/services/tournament.service.js',
  'src/domain/progression/services/achievement.service.js',
  'src/ui/screens/cosmetic.screen.js',
  'src/domain/progression/services/season-ranked.service.js',
  'src/domain/progression/services/battle-pass.service.js',
  'src/domain/meta/services/deck-template.service.js',
  'src/domain/progression/services/story-mode.service.js',
  'src/domain/social/services/friend.service.js',
  'src/domain/meta/services/duel-league.service.js',
  'src/ui/screens/challenge.screen.js',             // challenge-system.js
  'src/domain/meta/services/tournament-championship.service.js',
  'src/domain/card/systems/fusion/crafting-forge.js',
  'src/domain/social/services/auction-house.service.js',  // duplicate removed (second load point)
  'src/ui/screens/gm-panel.screen.js',
  'src/domain/meta/services/tournament-championship.service.js',  // card-tournament-championship.js
  'src/domain/battle/services/battle-simulation.js',
  'src/domain/meta/services/deck.service.js',        // card-deck-builder.js
  'src/domain/battle/services/challenge-league.js',
  'src/domain/meta/services/replay-theater.service.js',
  'src/domain/battle/services/ai-coach.service.js', // card-ai-coach.js
  'src/domain/card/systems/deck/deck-vault.js',
  'src/domain/guild/services/guild-hall.service.js',  // guild-hall-pro.js
  'src/domain/battle/services/arena-draft.js',       // arena-draft-system.js
  'src/domain/meta/services/deck-archive.service.js',  // deck-archive-system.js
  'src/domain/card/systems/evolution/evolution-system.js',
  'src/domain/meta/services/memory-system.service.js',  // card-memory-system.js
  'src/domain/battle/services/gauntlet-system.js',
  'src/domain/progression/services/seasonal-league.service.js',
  'src/domain/progression/services/dream-journey-system.service.js',  // dream-journey-system.js
  'src/domain/social/services/trading-post.service.js',
  'src/domain/social/services/friend-v2.service.js',
  'src/domain/progression/services/quest.service.js',
  'src/domain/battle/services/ai-coach.js',           // ai-coach-system.js
  'src/application/usecases/replay.usecase.js',       // replay-system.js
  'src/ui/screens/deck-studio-pro.screen.js',          // deck-studio-pro.js
  'src/domain/progression/services/seasonal-championship.service.js',
  'src/domain/card/systems/heritage/heritage-collection.js',  // heritage-system.js
  'src/domain/meta/services/studio.service.js',        // card-studio.js
  'src/infrastructure/loader/elite-loader.js',         // elite-loader.js (duplicate)
  'src/infrastructure/api/meta-loader.js',              // meta-loader.js (duplicate)
  // card-packs
  'card-packs/starter.js',
  'card-packs/balanced.js',
  'card-packs/ironclad.js'
];

// ─── 依次加载 ───────────────────────────────────────────────────────────────
var ALL = [].concat(SHARED, INFRA, CARD_SYSTEMS);

function loadAll(queue) {
  return queue.reduce(function(promise, src) {
    return promise.then(function() { return window._loadScript(src); });
  }, Promise.resolve());
}

// ─── 暴露 Boot 接口 ─────────────────────────────────────────────────────────
window.Boot = {
  start: function() {
    console.log('[boot] Starting DBG Card Game...');
    return loadAll(ALL).then(function() {
      console.log('[boot] All scripts loaded. Initializing...');
      if (window.EventBus) window.EventBus.emit('game:ready', {});
      if (window.Router) window.Router.init();
      console.log('[boot] Done.');
    }).catch(function(err) {
      console.error('[boot] Fatal:', err);
    });
  },

  // 动态加载单个模块（供 Router 按需加载）
  loadModule: function(src) {
    return window._loadScript(src);
  }
};

module.exports = window.Boot;