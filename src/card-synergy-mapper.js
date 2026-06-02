/**
 * Card Synergy Mapper (Iteration 2/9)
 * 分析卡牌间的协同效应矩阵
 * 识别核心卡牌与辅助卡牌
 * 计算卡组整体联动性评分
 */

class CardSynergyMapper {
  constructor() {
    this.synergyMatrix = new Map();
    this.cardList = [];
    this.typeSynergies = this.initializeTypeSynergies();
  }

  /**
   * 初始化类型协同关系
   * @returns {Map} 类型协同映射
   */
  initializeTypeSynergies() {
    return new Map([
      ['attack-attack', { score: 15, type: 'burst' }],
      ['attack-skill', { score: 10, type: 'balanced' }],
      ['attack-power', { score: 12, type: 'amplify' }],
      ['skill-skill', { score: 18, type: 'control' }],
      ['skill-power', { score: 20, type: 'combo' }],
      ['power-power', { score: 25, type: 'bomb' }],
      ['attack-attack-attack', { score: 30, type: 'rush' }]
    ]);
  }

  /**
   * 构建协同矩阵
   * @param {object[]} deck - 卡组
   * @returns {number[][]} 协同矩阵
   */
  buildSynergyMatrix(deck) {
    this.cardList = deck;
    
    if (deck.length === 0) {
      return [];
    }

    const matrix = [];
    for (let i = 0; i < deck.length; i++) {
      const row = [];
      for (let j = 0; j < deck.length; j++) {
        if (i === j) {
          row.push(0); // 自协同为0
        } else {
          row.push(this.calculatePairSynergy(deck[i], deck[j]));
        }
      }
      matrix.push(row);
    }

    return matrix;
  }

  /**
   * 计算两卡牌之间的协同效果
   * @param {object} card1 - 卡牌1
   * @param {object} card2 - 卡牌2
   * @returns {number} 协同分数
   */
  calculatePairSynergy(card1, card2) {
    const type1 = card1.type || 'attack';
    const type2 = card2.type || 'attack';
    
    const key = `${type1}-${type2}`;
    const reverseKey = `${type2}-${type1}`;
    
    if (this.typeSynergies.has(key)) {
      return this.typeSynergies.get(key).score;
    }
    if (this.typeSynergies.has(reverseKey)) {
      return this.typeSynergies.get(reverseKey).score;
    }
    
    // 基于费用的协同
    const cost1 = card1.cost || 0;
    const cost2 = card2.cost || 0;
    const costDiff = Math.abs(cost1 - cost2);
    
    if (costDiff === 0) return 8;
    if (costDiff === 1) return 5;
    if (costDiff <= 3) return 2;
    
    return 0;
  }

  /**
   * 查找核心卡牌
   * @param {object[]} deck - 卡组
   * @returns {object[]} 核心卡牌列表
   */
  findCoreCards(deck) {
    if (deck.length === 0) return [];

    const matrix = this.buildSynergyMatrix(deck);
    const cardScores = [];

    for (let i = 0; i < deck.length; i++) {
      let synergyScore = 0;
      for (let j = 0; j < deck.length; j++) {
        synergyScore += matrix[i][j];
      }
      
      cardScores.push({
        card: deck[i],
        score: synergyScore,
        synergyCount: matrix[i].filter(v => v > 0).length
      });
    }

    // 按协同分数排序，取前30%为核心卡牌
    cardScores.sort((a, b) => b.score - a.score);
    const coreCount = Math.max(1, Math.floor(deck.length * 0.3));
    
    return cardScores.slice(0, coreCount).map(c => ({
      ...c.card,
      coreScore: c.score,
      synergyCount: c.synergyCount
    }));
  }

  /**
   * 计算卡组整体协同评分
   * @param {object[]} deck - 卡组
   * @returns {number} 协同评分 (0-100)
   */
  calculateSynergyScore(deck) {
    if (deck.length === 0) return 0;

    const matrix = this.buildSynergyMatrix(deck);
    
    // 计算总协同分数
    let totalSynergy = 0;
    let pairCount = 0;
    
    for (let i = 0; i < deck.length; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        totalSynergy += matrix[i][j];
        pairCount++;
      }
    }

    // 标准化到 0-100
    const maxPossibleSynergy = pairCount * 25; // 假设最大协同为25
    const normalizedScore = (totalSynergy / maxPossibleSynergy) * 100;
    
    return Math.min(100, Math.round(normalizedScore));
  }

  /**
   * 获取两卡牌之间的协同值
   * @param {string} cardId1 - 卡牌1 ID
   * @param {string} cardId2 - 卡牌2 ID
   * @returns {number} 协同分数
   */
  getSynergyBetween(cardId1, cardId2) {
    const index1 = this.cardList.findIndex(c => c.id === cardId1);
    const index2 = this.cardList.findIndex(c => c.id === cardId2);
    
    if (index1 === -1 || index2 === -1) return 0;
    
    const matrix = this.buildSynergyMatrix(this.cardList);
    return matrix[index1][index2];
  }

  /**
   * 查找某卡牌的所有协同关系
   * @param {string} cardId - 卡牌ID
   * @returns {object[]} 协同列表
   */
  findCardSynergies(cardId) {
    const cardIndex = this.cardList.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return [];

    const matrix = this.buildSynergyMatrix(this.cardList);
    const synergies = [];
    
    for (let i = 0; i < this.cardList.length; i++) {
      if (i !== cardIndex && matrix[cardIndex][i] > 0) {
        synergies.push({
          cardId: this.cardList[i].id,
          score: matrix[cardIndex][i],
          type: this.getSynergyType(this.cardList[cardIndex], this.cardList[i])
        });
      }
    }
    
    return synergies;
  }

  /**
   * 获取协同类型
   * @param {object} card1 - 卡牌1
   * @param {object} card2 - 卡牌2
   * @returns {string} 协同类型
   */
  getSynergyType(card1, card2) {
    const type1 = card1.type || 'attack';
    const type2 = card2.type || 'attack';
    const key = `${type1}-${type2}`;
    const reverseKey = `${type2}-${type1}`;
    
    if (this.typeSynergies.has(key)) {
      return this.typeSynergies.get(key).type;
    }
    if (this.typeSynergies.has(reverseKey)) {
      return this.typeSynergies.get(reverseKey).type;
    }
    
    return 'neutral';
  }

  /**
   * 分析类型间协同
   * @param {object[]} deck - 卡组
   * @returns {object} 类型协同分析
   */
  analyzeTypeSynergies(deck) {
    if (deck.length === 0) return {};

    const typeStats = {};
    
    for (const card of deck) {
      const type = card.type || 'attack';
      if (!typeStats[type]) {
        typeStats[type] = { count: 0, synergyScore: 0 };
      }
      typeStats[type].count++;
    }

    // 计算类型间协同
    const types = Object.keys(typeStats);
    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const key = `${types[i]}-${types[j]}`;
        const reverseKey = `${types[j]}-${types[i]}`;
        
        if (this.typeSynergies.has(key)) {
          typeStats[types[i]].synergyScore += this.typeSynergies.get(key).score;
          typeStats[types[j]].synergyScore += this.typeSynergies.get(key).score;
        } else if (this.typeSynergies.has(reverseKey)) {
          typeStats[types[i]].synergyScore += this.typeSynergies.get(reverseKey).score;
          typeStats[types[j]].synergyScore += this.typeSynergies.get(reverseKey).score;
        }
      }
    }

    return typeStats;
  }

  /**
   * 识别协同连锁
   * @param {object[]} deck - 卡组
   * @returns {object[]} 协同连锁列表
   */
  identifySynergyChains(deck) {
    if (deck.length < 3) return [];

    const matrix = this.buildSynergyMatrix(deck);
    const chains = [];

    // 查找3张卡牌以上的连锁
    for (let i = 0; i < deck.length; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        for (let k = j + 1; k < deck.length; k++) {
          const synergy1 = matrix[i][j];
          const synergy2 = matrix[j][k];
          const synergy3 = matrix[i][k];
          
          if (synergy1 > 0 && synergy2 > 0) {
            chains.push({
              cards: [deck[i].id, deck[j].id, deck[k].id],
              totalScore: synergy1 + synergy2 + synergy3,
              chainType: 'sequential'
            });
          }
        }
      }
    }

    return chains.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * 验证矩阵维度
   * @param {object[]} deck - 卡组
   * @returns {boolean} 维度是否正确
   */
  validateMatrixDimensions(deck) {
    const matrix = this.buildSynergyMatrix(deck);
    
    if (matrix.length !== deck.length) return false;
    
    for (let i = 0; i < matrix.length; i++) {
      if (matrix[i].length !== deck.length) return false;
    }
    
    return true;
  }
}

module.exports = { CardSynergyMapper };