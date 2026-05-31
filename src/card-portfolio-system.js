/**
 * Card Portfolio Analyzer
 * V261 - Iteration 6/9
 * 融合6大设计系统: claude-code, nanobot, chatdev, thunderbolt, generic-agent, ruflo
 */

class PortfolioValidator {
  constructor() {
    this.validated = new Map();
  }

  validate(card) {
    if (!card || typeof card !== 'object') return false;
    if (!card.id || !card.name) return false;
    return true;
  }

  validateDeck(deck) {
    if (!Array.isArray(deck)) return false;
    if (deck.length === 0) return false;
    return deck.every(card => this.validate(card));
  }
}

class PortfolioAnalyzer {
  constructor() {
    this.validator = new PortfolioValidator();
    this.metrics = {
      totalCards: 0,
      avgCost: 0,
      avgPower: 0
    };
  }

  analyze(deck) {
    if (!this.validator.validateDeck(deck)) {
      return { valid: false, error: 'Invalid deck structure' };
    }

    this.metrics.totalCards = deck.length;
    this.metrics.avgCost = this.calculateAvgCost(deck);
    this.metrics.avgPower = this.calculateAvgPower(deck);

    return {
      valid: true,
      metrics: { ...this.metrics },
      diversity: this.calculateDiversity(deck),
      curve: this.analyzeManaCurve(deck)
    };
  }

  calculateAvgCost(deck) {
    if (!deck || deck.length === 0) return 0;
    const costs = deck.map(c => c.cost || 0);
    return costs.reduce((a, b) => a + b, 0) / costs.length;
  }

  calculateAvgPower(deck) {
    const powers = deck.map(c => c.power || 0);
    return powers.reduce((a, b) => a + b, 0) / powers.length;
  }

  calculateDiversity(deck) {
    const types = new Set(deck.map(c => c.type || 'unknown'));
    return types.size;
  }

  analyzeManaCurve(deck) {
    const curve = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '6+': 0 };
    deck.forEach(card => {
      const cost = card.cost || 0;
      if (cost >= 6) curve['6+']++;
      else if (cost >= 1) curve[cost]++;
    });
    return curve;
  }
}

class PortfolioOptimizer {
  constructor(analyzer) {
    this.analyzer = analyzer;
    this.strategies = ['aggro', 'control', 'midrange'];
  }

  suggest(cardPool, currentDeck, strategy = 'midrange') {
    if (!this.strategies.includes(strategy)) {
      strategy = 'midrange';
    }

    const analysis = this.analyzer.analyze(currentDeck);
    if (!analysis.valid) {
      return { suggestions: [], reason: 'Invalid current deck' };
    }

    const suggestions = this.findMissingPieces(cardPool, currentDeck, strategy);
    return {
      suggestions,
      strategy,
      currentAnalysis: analysis
    };
  }

  findMissingPieces(cardPool, currentDeck, strategy) {
    const needed = this.getStrategyNeeds(strategy);
    const current = currentDeck.map(c => c.type || 'unknown');
    const suggestions = [];

    cardPool.forEach(card => {
      if (current.includes(card.id)) return;
      if (needed.includes(card.type)) {
        suggestions.push(card);
      }
    });

    return suggestions.slice(0, 5);
  }

  getStrategyNeeds(strategy) {
    switch (strategy) {
      case 'aggro': return ['creature', 'spell'];
      case 'control': return ['spell', 'artifact'];
      case 'midrange': return ['creature', 'spell', 'artifact'];
      default: return ['creature', 'spell'];
    }
  }
}

class CardPortfolioSystem {
  constructor() {
    this.analyzer = new PortfolioAnalyzer();
    this.optimizer = new PortfolioOptimizer(this.analyzer);
    this.history = [];
  }

  analyzeDeck(deck) {
    const result = this.analyzer.analyze(deck);
    this.history.push({ deck, result, timestamp: Date.now() });
    return result;
  }

  suggestImprovements(cardPool, currentDeck, strategy = 'midrange') {
    return this.optimizer.suggest(cardPool, currentDeck, strategy);
  }

  getHistory() {
    return this.history;
  }
}

module.exports = {
  CardPortfolioSystem,
  PortfolioAnalyzer,
  PortfolioOptimizer,
  PortfolioValidator
};
