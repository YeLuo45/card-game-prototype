// plugins/starter-kit.js - 内置插件包
// 随游戏初始加载，提供额外的流派支持卡牌

(function() {
  'use strict';

  window.StarterKitPlugin = function(api) {
    api.registerPlugin({
      id: 'starter-kit',
      name: '初始卡包增强',
      version: '1.0.0',
      author: 'card-game-prototype',
      description: '扩展初始卡组，增加流派支持'
    });

    // 卡牌1：铁甲流派攻击
    api.registerCard({
      id: 'starter_ironclad_attack',
      name: '铁壁冲击',
      cost: 2,
      type: 'attack',
      rarity: 'uncommon',
      description: '造成 12 点伤害，若有格挡则额外造成 4 点伤害',
      effect: function(state) {
        let damage = 12;
        if (state.player && state.player.block > 0) {
          damage += 4;
        }
        const target = state.target || state.enemy;
        if (target) {
          target.hp -= damage;
          return { damage: damage, target: target.id || 'enemy' };
        }
        return { damage: damage };
      },
      onPlay: function(state) {
        return this.effect(state);
      }
    });

    // 卡牌2：铁甲流派防御
    api.registerCard({
      id: 'starter_ironclad_defend',
      name: '重甲守护',
      cost: 1,
      type: 'skill',
      rarity: 'common',
      description: '获得 8 点格挡，在本回合内每击败一个敌人额外获得 3 点格挡',
      effect: function(state) {
        let block = 8;
        const enemiesDefeated = state.enemiesDefeatedThisTurn || 0;
        block += enemiesDefeated * 3;
        state.player.block = (state.player.block || 0) + block;
        return { block: block };
      },
      onPlay: function(state) {
        return this.effect(state);
      }
    });

    // 卡牌3：均衡流派技能
    api.registerCard({
      id: 'starter_balanced_skill',
      name: '策略撤退',
      cost: 1,
      type: 'skill',
      rarity: 'uncommon',
      description: '获得 5 点格挡，抽 1 张牌',
      effect: function(state) {
        state.player.block = (state.player.block || 0) + 5;
        if (state.player && state.player.drawCards) {
          state.player.drawCards(1);
        }
        return { block: 5, cardsDrawn: 1 };
      },
      onPlay: function(state) {
        return this.effect(state);
      }
    });

    console.log('[StarterKitPlugin] Registered 3 cards');
  };
})();
