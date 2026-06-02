// plugins/example-plugin.js - 示例插件
// 提供3张基础扩展卡：攻击、防御、技能各1张

(function() {
  'use strict';

  window.ExamplePlugin = function(api) {
    api.registerPlugin({
      id: 'example-plugin',
      name: '示例插件',
      version: '1.0.0',
      author: 'card-game-prototype',
      description: '包含3张基础测试卡牌'
    });

    // 卡牌1：攻击
    api.registerCard({
      id: 'plugin_attack_a',
      name: '插件猛击',
      cost: 1,
      type: 'attack',
      rarity: 'common',
      description: '造成 6 点伤害',
      effect: function(state) {
        const target = state.target || state.enemy;
        if (target) {
          target.hp -= 6;
          return { damage: 6, target: target.id || 'enemy' };
        }
        return {};
      },
      onPlay: function(state) {
        return this.effect(state);
      }
    });

    // 卡牌2：防御
    api.registerCard({
      id: 'plugin_defend_b',
      name: '插件护盾',
      cost: 1,
      type: 'skill',
      rarity: 'common',
      description: '获得 6 点格挡',
      effect: function(state) {
        state.player.block = (state.player.block || 0) + 6;
        return { block: 6 };
      },
      onPlay: function(state) {
        return this.effect(state);
      }
    });

    // 卡牌3：技能（抽牌）
    api.registerCard({
      id: 'plugin_skill_c',
      name: '插件洞察',
      cost: 2,
      type: 'skill',
      rarity: 'rare',
      description: '抽 2 张牌',
      effect: function(state) {
        if (state.player && state.player.drawCards) {
          state.player.drawCards(2);
        }
        return { cardsDrawn: 2 };
      },
      onPlay: function(state) {
        return this.effect(state);
      }
    });

    console.log('[ExamplePlugin] Registered 3 cards');
  };
})();
