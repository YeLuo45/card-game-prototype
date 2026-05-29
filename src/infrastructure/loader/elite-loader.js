/**
 * V62 Roguelike Elite & Boss System
 * 精英敌人与Boss系统模块
 */

// 精英敌人池
const ELITE_ENEMIES = {
  "elite_skeleton_lord": { 
    id: "elite_skeleton_lord", 
    name: "骷髅领主", 
    maxHp: 80, 
    attack: 18, 
    armor: 10, 
    reward: "relic_ankh",
    isElite: true,
    aiType: 'aggressive',
    difficulty: 1.2,
    intents: ['attack', 'defend', 'heavy', 'buff']
  },
  "elite_orc_chief": { 
    id: "elite_orc_chief", 
    name: "兽人首领", 
    maxHp: 100, 
    attack: 22, 
    armor: 15, 
    reward: "relic_skull",
    isElite: true,
    aiType: 'aggressive',
    difficulty: 1.2,
    intents: ['attack', 'attack', 'defend', 'buff']
  },
  "elite_werewolf_alpha": { 
    id: "elite_werewolf_alpha", 
    name: "狼人阿尔法", 
    maxHp: 90, 
    attack: 25, 
    armor: 0, 
    reward: "relic_shield",
    isElite: true,
    aiType: 'aggressive',
    difficulty: 1.3,
    intents: ['attack', 'buff', 'heavy']
  },
  "elite_slime_king": { 
    id: "elite_slime_king", 
    name: "史莱姆王", 
    maxHp: 120, 
    attack: 15, 
    armor: 20, 
    reward: "relic_potion",
    isElite: true,
    aiType: 'defensive',
    difficulty: 1.1,
    intents: ['attack', 'defend', 'multihit']
  },
  "elite_dark_mage": { 
    id: "elite_dark_mage", 
    name: "暗影法师", 
    maxHp: 70, 
    attack: 30, 
    armor: 5, 
    reward: "relic_staff",
    isElite: true,
    aiType: 'control',
    difficulty: 1.2,
    intents: ['attack', 'curse', 'buff']
  }
};

// Boss敌人池
const BOSS_ENEMIES = {
  "boss_dragon": {
    id: "boss_dragon",
    name: "远古巨龙",
    maxHp: 200,
    attack: 30,
    armor: 15,
    isBoss: true,
    phases: 2,
    phase2Attack: 45,
    phase2Threshold: 0.5, // 50%血量进入第二阶段
    reward: "relic_dragon_heart",
    aiType: 'boss',
    difficulty: 1.5,
    specialAbility: { every: 3 },
    secondPhaseThreshold: 0.5,
    intents: ['attack', 'dragonBreath', 'heavy', 'buff', 'defend'],
    special: 'dragonBreath'
  },
  "boss_abyss_lord": {
    id: "boss_abyss_lord",
    name: "深渊领主",
    maxHp: 180,
    attack: 25,
    armor: 10,
    isBoss: true,
    phases: 3,
    phase2Attack: 35,
    phase3Attack: 50,
    phase2Threshold: 0.5,
    phase3Threshold: 0.25,
    reward: "relic_dragon_heart",
    aiType: 'boss',
    difficulty: 1.5,
    specialAbility: { every: 2 },
    secondPhaseThreshold: 0.5,
    intents: ['darkAura', 'soulSiphon', 'abyssalStrike', 'buff'],
    special: 'darkAura'
  }
};

// 章节节点定义
const CHAPTER_1_NODES = [
  { type: 'combat', id: 1, name: '战斗' },
  { type: 'combat', id: 2, name: '战斗' },
  { type: 'elite', id: 3, name: '精英' },
  { type: 'combat', id: 4, name: '战斗' },
  { type: 'shop', id: 5, name: '商店' },
  { type: 'combat', id: 6, name: '战斗' },
  { type: 'elite', id: 7, name: '精英' },
  { type: 'combat', id: 8, name: '战斗' },
  { type: 'rest', id: 9, name: '休息' },
  { type: 'boss', id: 10, name: 'Boss' }
];

/**
 * 开始精英战斗
 */
function startEliteBattle() {
  const eliteKeys = Object.keys(ELITE_ENEMIES);
  const eliteKey = eliteKeys[Math.floor(Math.random() * eliteKeys.length)];
  const enemy = JSON.parse(JSON.stringify(ELITE_ENEMIES[eliteKey]));
  
  gameState.enemy = enemy;
  gameState.enemyHp = enemy.maxHp;
  gameState.enemyMaxHp = enemy.maxHp;
  gameState.enemyArmor = enemy.armor || 0;
  gameState.enemyIntent = null;
  gameState.enemyIntentValue = 0;
  gameState.playerShield = 0;
  gameState.isEliteBattle = true;
  gameState.isBossBattle = false;
  
  // V65 初始化敌人AI
  if (typeof EnemyAI !== 'undefined') {
    gameState.enemyAI = new EnemyAI(enemy.aiType || 'random', {
      difficulty: enemy.difficulty || 1.0,
      specialAbility: enemy.specialAbility || null,
      secondPhaseThreshold: enemy.secondPhaseThreshold || 0.5
    });
    addLog(`🔮 AI类型: ${gameState.enemyAI.getTypeName()}`, 'info');
  }
  
  // 初始化战斗状态
  initBattleStateForCombat();
  
  // 触发遗物效果（战斗开始）
  triggerRelicHook('onStartOfCombat');
  
  updateBattleUI();
  renderEnemy();
  rollEnemyIntent();
  updateHandDisplay();
  addLog(`💀 遭遇精英 ${enemy.name}！`, 'danger');
}

/**
 * 开始Boss战斗
 */
function startBossBattle() {
  // 使用深渊领主作为Boss（更符合现有代码）
  const boss = JSON.parse(JSON.stringify(BOSS_ENEMIES.boss_abyss_lord));
  
  gameState.enemy = boss;
  gameState.enemyHp = boss.maxHp;
  gameState.enemyMaxHp = boss.maxHp;
  gameState.enemyArmor = boss.armor || 0;
  gameState.enemyIntent = null;
  gameState.enemyIntentValue = 0;
  gameState.playerShield = 0;
  gameState.isBossBattle = true;
  gameState.isEliteBattle = false;
  gameState.bossPhase = 1;
  gameState.bossPhase2Triggered = false;
  gameState.bossPhase3Triggered = false;
  
  // V65 初始化Boss AI
  if (typeof EnemyAI !== 'undefined') {
    gameState.enemyAI = new EnemyAI(boss.aiType || 'boss', {
      difficulty: boss.difficulty || 1.5,
      specialAbility: boss.specialAbility || { every: 2 },
      secondPhaseThreshold: boss.secondPhaseThreshold || 0.5
    });
  }
  
  // 显示Boss来袭动画
  showBossIntro(boss.name);
}

/**
 * 显示Boss来袭动画
 */
function showBossIntro(bossName) {
  const overlay = document.createElement('div');
  overlay.id = 'boss-intro';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;z-index:9999;flex-direction:column;';
  overlay.innerHTML = `
    <h1 style="color:#ffd700;font-size:48px;margin-bottom:20px;">🔥 BOSS来袭！ 🔥</h1>
    <p style="color:#fff;font-size:24px;">${bossName}</p>
  `;
  document.body.appendChild(overlay);
  
  setTimeout(() => {
    overlay.remove();
    
    // 延迟后初始化战斗
    setTimeout(() => {
      initBattleStateForCombat();
      triggerRelicHook('onStartOfCombat');
      updateBattleUI();
      renderEnemy();
      rollEnemyIntent();
      updateHandDisplay();
      addLog(`🐉 挑战 ${bossName}！`, 'danger');
    }, 500);
  }, 1500);
}

/**
 * 初始化战斗状态（从 startRandomBattle 提取的公共逻辑）
 */
function initBattleStateForCombat() {
  gameState.hand = [];
  gameState.drawPile = [...gameState.deck];
  gameState.discardPile = [];
  gameState.turn = 1;
  gameState.energy = 3;
  gameState.maxEnergy = 3;
  gameState.isPlayerTurn = true;
  gameState.battleLog = [];
  
  // 洗牌
  shuffleDeck();
  
  // 初始化手牌
  for (let i = 0; i < 5; i++) {
    drawCard();
  }
}

/**
 * 检查Boss阶段转换
 */
function checkBossPhaseTransition() {
  if (!gameState.isBossBattle) return;
  
  const boss = gameState.enemy;
  const hpPercent = gameState.enemyHp / gameState.enemyMaxHp;
  
  // 第二阶段：血量低于50%
  if (!gameState.bossPhase2Triggered && hpPercent <= 0.5) {
    gameState.bossPhase = 2;
    gameState.bossPhase2Triggered = true;
    if (boss.phase2Attack) {
      boss.attack = boss.phase2Attack;
    }
    addLog(`🐉 ${boss.name} 进入第二阶段！攻击提升！`, 'danger');
  }
  
  // 第三阶段：血量低于25%（如果有）
  if (!gameState.bossPhase3Triggered && hpPercent <= 0.25 && boss.phases >= 3) {
    gameState.bossPhase = 3;
    gameState.bossPhase3Triggered = true;
    if (boss.phase3Attack) {
      boss.attack = boss.phase3Attack;
    }
    addLog(`🐉 ${boss.name} 进入狂暴阶段！极度危险！`, 'danger');
  }
}

/**
 * 获取节点颜色
 */
function getNodeColor(nodeType) {
  switch(nodeType) {
    case 'combat': return '#cc3333';
    case 'elite': return '#8b0000';
    case 'boss': return '#ffd700';
    case 'shop': return '#3366cc';
    case 'rest': return '#228b22';
    default: return '#888';
  }
}

/**
 * 进入节点（处理不同类型节点）
 */
function enterNodeV62(node) {
  hideNodePreview();
  switch(node.type) {
    case 'combat': startRandomBattle(); break;
    case 'elite': startEliteBattle(); break;
    case 'boss': startBossBattle(); break;
    case 'shop': openShop(); break;
    case 'rest': 
      gameState.playerHp = Math.min(gameState.playerHp + 30, gameState.playerMaxHp);
      showNotification('休息！回复30HP', 'success');
      returnToMap();
      break;
  }
}

/**
 * 处理精英敌人奖励
 */
function handleEliteReward(eliteEnemy) {
  if (eliteEnemy.reward) {
    const relicId = eliteEnemy.reward;
    if (!gameState.relics.includes(relicId)) {
      gameState.relics.push(relicId);
      const relic = RELICS[relicId] || RELICS_V62[relicId];
      if (relic) {
        addLog(`🎁 获得遗物：${relic.name}`, 'success');
      }
    }
  }
}

/**
 * 处理Boss敌人奖励
 */
function handleBossReward(bossEnemy) {
  if (bossEnemy.reward) {
    const relicId = bossEnemy.reward;
    if (!gameState.relics.includes(relicId)) {
      gameState.relics.push(relicId);
      const relic = RELICS[relicId] || RELICS_V62[relicId];
      if (relic) {
        addLog(`🎁 获得遗物：${relic.name}`, 'success');
      }
    }
  }
  gameState.bossDefeated = true;
}

/**
 * Boss战胜利后显示胜利结算
 */
function onBossDefeated() {
  const boss = gameState.enemy;
  handleBossReward(boss);
  gameState.bossDefeated = true;
  showVictoryScreen();
}

/**
 * 检查是否是精英战斗
 */
function isEliteBattle() {
  return gameState.isEliteBattle === true;
}

/**
 * 检查是否是Boss战斗
 */
function isBossBattle() {
  return gameState.isBossBattle === true;
}

/**
 * 获取当前战斗类型
 */
function getCurrentBattleType() {
  if (gameState.isBossBattle) return 'boss';
  if (gameState.isEliteBattle) return 'elite';
  return 'normal';
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.ELITE_ENEMIES = ELITE_ENEMIES;
  window.BOSS_ENEMIES = BOSS_ENEMIES;
  window.CHAPTER_1_NODES = CHAPTER_1_NODES;
  window.startEliteBattle = startEliteBattle;
  window.startBossBattle = startBossBattle;
  window.showBossIntro = showBossIntro;
  window.initBattleStateForCombat = initBattleStateForCombat;
  window.checkBossPhaseTransition = checkBossPhaseTransition;
  window.getNodeColor = getNodeColor;
  window.enterNodeV62 = enterNodeV62;
  window.handleEliteReward = handleEliteReward;
  window.handleBossReward = handleBossReward;
  window.onBossDefeated = onBossDefeated;
  window.isEliteBattle = isEliteBattle;
  window.isBossBattle = isBossBattle;
  window.getCurrentBattleType = getCurrentBattleType;
}
