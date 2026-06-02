// ===== V85 AI技能结晶系统 (Direction F) =====
// 基于 generic-agent Self-Evolution + claude-code Budget Mode
// 从V84五层记忆数据中提取高胜率模式，固化为可触发技能

// ===== 技能结晶引擎 =====
class SkillCrystallizer {
  constructor(aiMemory) {
    this.aiMemory = aiMemory;
    this.maxSkills = 50;           // 最多存储50个技能（claude-code Budget Mode）
    this.minConfidence = 0.6;      // 最低置信度阈值
    this.minSampleSize = 3;        // 最少样本量
    this.decisionCooldown = 0;     // AI决策冷却
    this.crystallizeBudget = 3;    // 每局最多3次结晶判断
    this.crystallizeCount = 0;     // 本局已结晶次数
    this.skills = [];               // 结晶技能库
    this.skillTriggers = {};        // 技能触发记录
  }

  // 从L3模式中提取高胜率技能
  crystallizeFromPattern(patternKey, pattern) {
    if (this.crystallizeCount >= this.crystallizeBudget) {
      console.log('[SkillCrystallizer] Budget exhausted, skipping crystallization');
      return null;
    }
    if (!pattern || pattern.count < this.minSampleSize) return null;
    if (pattern.successRate < this.minConfidence) return null;

    // 检查是否已存在相似技能
    const existing = this.skills.find(s => 
      s.patternKey === patternKey && 
      Math.abs(s.successRate - pattern.successRate) < 0.1
    );
    if (existing) return null;

    const skill = {
      id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: this._generateSkillName(patternKey, pattern),
      patternKey,
      trigger: this._extractTrigger(patternKey),
      action: {
        preferredCards: pattern.keyCards || [],
        aggressionLevel: pattern.successRate > 0.7 ? 0.8 : (pattern.successRate > 0.5 ? 0.5 : 0.3),
        blockPriority: pattern.action === 'defend' ? 0.7 : 0.3
      },
      confidence: pattern.successRate,
      sampleSize: pattern.count,
      successRate: pattern.successRate,
      lastUsed: null,
      useCount: 0,
      createdAt: Date.now()
    };

    this.skills.push(skill);
    this.crystallizeCount++;
    this._pruneLowConfidence();
    this._saveSkills();
    console.log('[SkillCrystallizer] Crystallized skill:', skill.name, 'confidence:', skill.confidence.toFixed(2));
    return skill;
  }

  // 从L3 patterns自动结晶所有合格技能
  crystallizeAllFromL3() {
    const patterns = this.aiMemory?.L3?.patterns || {};
    const crystallized = [];
    for (const [key, pattern] of Object.entries(patterns)) {
      const skill = this.crystallizeFromPattern(key, pattern);
      if (skill) crystallized.push(skill);
    }
    return crystallized;
  }

  // 触发技能匹配
  matchSkill(context = {}) {
    if (this.decisionCooldown > 0) {
      this.decisionCooldown--;
      return null;
    }

    const hpRatio = context.hpRatio || 0.5;
    const enemyType = context.enemyType || 'normal';
    const turn = context.turn || 1;

    let bestMatch = null;
    let bestScore = 0;

    for (const skill of this.skills) {
      if (!skill) continue;
      const score = this._calcMatchScore(skill, hpRatio, enemyType, turn);
      if (score > bestScore && score > 0.7) {
        bestScore = score;
        bestMatch = skill;
      }
    }

    if (bestMatch) {
      bestMatch.lastUsed = Date.now();
      bestMatch.useCount++;
      this.decisionCooldown = 2;  // Budget Mode: 冷却2回合
      this._saveSkills();
    }

    return bestMatch;
  }

  // 计算技能匹配分数
  _calcMatchScore(skill, hpRatio, enemyType, turn) {
    let score = skill.confidence * 0.5;
    
    // 触发条件匹配
    const trigger = skill.trigger;
    if (trigger.enemyType === enemyType) score += 0.2;
    if (hpRatio >= trigger.hpRange[0] && hpRatio <= trigger.hpRange[1]) score += 0.15;
    if (turn >= trigger.turnRange[0] && turn <= trigger.turnRange[1]) score += 0.15;
    
    return Math.min(score, 1);
  }

  // 提取触发条件
  _extractTrigger(patternKey) {
    const parts = patternKey.split('_');
    let hpBucket = 5, turnBucket = 1, enemyType = 'normal';
    
    for (const p of parts) {
      if (p.startsWith('hp_')) hpBucket = parseInt(p.split('_')[1]) || 5;
      if (p.startsWith('turn_')) turnBucket = parseInt(p.split('_')[1]) || 1;
      if (['boss', 'elite', 'normal', 'slime', 'ghost', 'demon', 'dragon'].includes(p)) {
        enemyType = p;
      }
    }
    
    return {
      enemyType,
      hpRange: [hpBucket * 0.1 - 0.1, hpBucket * 0.1],
      turnRange: [Math.max(1, turnBucket - 1), turnBucket + 2]
    };
  }

  // 生成技能名称
  _generateSkillName(patternKey, pattern) {
    const names = {
      boss: { high: '狂暴打击', mid: 'Boss压制', low: '谨慎周旋' },
      elite: { high: '精英猎手', mid: '均衡应对', low: '保守策略' },
      normal: { high: '快速击杀', mid: '稳定输出', low: '防守优先' }
    };
    
    const enemyType = patternKey.includes('boss') ? 'boss' : 
                      patternKey.includes('elite') ? 'elite' : 'normal';
    const hpLevel = pattern.successRate > 0.7 ? 'high' : 
                     pattern.successRate > 0.5 ? 'mid' : 'low';
    
    return names[enemyType]?.[hpLevel] || `${enemyType}_${hpLevel}_策略`;
  }

  // 淘汰低置信度技能
  _pruneLowConfidence() {
    if (this.skills.length <= this.maxSkills) return;
    
    // 按置信度和使用次数排序，淘汰最低的
    this.skills.sort((a, b) => {
      const scoreA = a.confidence * a.useCount;
      const scoreB = b.confidence * b.useCount;
      return scoreA - scoreB;
    });
    
    this.skills = this.skills.slice(0, this.maxSkills);
  }

  // 获取所有技能（带统计）
  getAllSkills() {
    return this.skills.map(s => ({
      ...s,
      active: s.confidence >= this.minConfidence && s.sampleSize >= this.minSampleSize
    }));
  }

  // 启用/禁用技能
  setSkillActive(skillId, active) {
    const skill = this.skills.find(s => s.id === skillId);
    if (skill && active) {
      skill.confidence = Math.max(this.minConfidence, skill.confidence);
    }
  }

  // 重置本局结晶计数
  resetRound() {
    this.crystallizeCount = 0;
  }

  // 持久化
  _saveSkills() {
    try {
      localStorage.setItem('aiSkills', JSON.stringify(this.skills));
    } catch(e) {
      console.warn('[SkillCrystallizer] Failed to save skills:', e);
    }
  }

  loadSkills() {
    try {
      const data = localStorage.getItem('aiSkills');
      if (data) {
        this.skills = JSON.parse(data);
        console.log('[SkillCrystallizer] Loaded', this.skills.length, 'skills');
      }
    } catch(e) {
      console.warn('[SkillCrystallizer] Failed to load skills:', e);
    }
  }
}

// Export for Node.js (required) + browser (window)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SkillCrystallizer;
}
if (typeof window !== 'undefined') {
  window.SkillCrystallizer = SkillCrystallizer;
}
if (typeof global !== 'undefined') {
  global.SkillCrystallizer = SkillCrystallizer;
}