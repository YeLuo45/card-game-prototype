/**
 * MaterialExchange - Material Conversion System
 * Handles high-tier to low-tier conversion with reverse requiring extra cost
 * Provides batch conversion and optimal path finding
 */

const MaterialExchange = class MaterialExchange {
  static DEFAULT_EXCHANGE_RATES = {
    'shard_common->dust_basic': 0.5,
    'shard_uncommon->dust_fine': 0.5,
    'dust_basic->shard_common': 2.0,
    'dust_fine->shard_uncommon': 2.0,
    'essence_primary->dust_basic': 5.0,
    'essence_secondary->essence_primary': 2.0,
    'shard_rare->shard_uncommon': 2.0,
    'shard_uncommon->shard_common': 2.0
  };

  static REVERSE_MULTIPLIER = 2.5;
  static MAX_CONVERSION_STEPS = 10;

  constructor(materialRegistry = null) {
    this.materialRegistry = materialRegistry;
    this.customRates = {};
    this.exchangeHistory = [];
    this.conversionGraph = new Map();

    this.initializeDefaultGraph();
  }

  initializeDefaultGraph() {
    // Build conversion graph for pathfinding
    const defaultConversions = [
      { from: 'shard_common', to: 'dust_basic', rate: 0.5 },
      { from: 'dust_basic', to: 'shard_common', rate: 2.0 },
      { from: 'shard_uncommon', to: 'dust_fine', rate: 0.5 },
      { from: 'dust_fine', to: 'shard_uncommon', rate: 2.0 },
      { from: 'essence_primary', to: 'dust_basic', rate: 5.0 },
      { from: 'essence_secondary', to: 'essence_primary', rate: 2.0 },
      { from: 'shard_rare', to: 'shard_uncommon', rate: 2.0 },
      { from: 'shard_uncommon', to: 'shard_common', rate: 2.0 }
    ];

    defaultConversions.forEach(conv => {
      this.addToGraph(conv.from, conv.to, conv.rate);
    });
  }

  addToGraph(from, to, rate) {
    if (!this.conversionGraph.has(from)) {
      this.conversionGraph.set(from, []);
    }
    const edges = this.conversionGraph.get(from);
    const existingIndex = edges.findIndex(e => e.to === to);
    if (existingIndex >= 0) {
      edges[existingIndex].rate = rate;
    } else {
      edges.push({ to, rate });
    }
  }

  convertMaterial(fromMaterial, toMaterial, amount, options = {}) {
    const reverse = options.reverse || false;

    if (amount <= 0) {
      return { success: false, message: 'Invalid amount' };
    }

    const rate = this.getExchangeRate(fromMaterial, toMaterial, { reverse });
    const adjustedAmount = reverse ? amount * MaterialExchange.REVERSE_MULTIPLIER : amount;

    if (this.materialRegistry) {
      if (!this.materialRegistry.hasMaterial(fromMaterial, adjustedAmount)) {
        return {
          success: false,
          message: 'Insufficient materials',
          required: adjustedAmount,
          available: this.materialRegistry.getMaterialCount(fromMaterial)
        };
      }

      this.materialRegistry.consumeMaterial(fromMaterial, adjustedAmount);

      const outputAmount = Math.floor(amount * rate);
      this.materialRegistry.addMaterial(toMaterial, outputAmount);

      const result = {
        success: true,
        fromMaterial,
        toMaterial,
        inputAmount: adjustedAmount,
        outputAmount,
        rate,
        timestamp: Date.now()
      };

      this.exchangeHistory.push(result);
      return result;
    }

    return {
      success: true,
      fromMaterial,
      toMaterial,
      inputAmount: adjustedAmount,
      outputAmount: Math.floor(amount * rate),
      rate,
      timestamp: Date.now()
    };
  }

  batchConvert(conversions) {
    const results = {
      totalProcessed: 0,
      totalFailed: 0,
      totalOutputAmount: 0,
      results: []
    };

    conversions.forEach(conv => {
      const result = this.convertMaterial(conv.from, conv.to, conv.amount, conv.options);
      results.results.push(result);
      
      if (result.success) {
        results.totalProcessed++;
        results.totalOutputAmount += result.outputAmount;
      } else {
        results.totalFailed++;
      }
    });

    return results;
  }

  findOptimalPath(fromMaterial, toMaterial) {
    if (fromMaterial === toMaterial) {
      return [];
    }

    const visited = new Set();
    const queue = [{ material: fromMaterial, path: [], totalRate: 1 }];
    visited.add(fromMaterial);

    while (queue.length > 0) {
      const current = queue.shift();

      if (current.material === toMaterial) {
        return current.path;
      }

      if (current.path.length >= MaterialExchange.MAX_CONVERSION_STEPS) {
        continue;
      }

      const edges = this.conversionGraph.get(current.material) || [];

      for (const edge of edges) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          const newPath = [...current.path, {
            from: current.material,
            to: edge.to,
            rate: edge.rate
          }];
          queue.push({
            material: edge.to,
            path: newPath,
            totalRate: current.totalRate * edge.rate
          });
        }
      }
    }

    return null;
  }

  calculateExchangeRate(fromMaterial, toMaterial, options = {}) {
    return this.getExchangeRate(fromMaterial, toMaterial, options);
  }

  getExchangeRate(fromMaterial, toMaterial, options = {}) {
    const reverse = options.reverse || false;
    const key = `${fromMaterial}->${toMaterial}`;

    let rate = this.customRates[key];

    if (rate === undefined) {
      rate = MaterialExchange.DEFAULT_EXCHANGE_RATES[key];
    }

    if (rate === undefined) {
      rate = 1.0;
    }

    if (reverse) {
      rate = rate / MaterialExchange.REVERSE_MULTIPLIER;
    }

    return rate;
  }

  setExchangeRate(fromMaterial, toMaterial, rate) {
    const key = `${fromMaterial}->${toMaterial}`;
    this.customRates[key] = rate;
    this.addToGraph(fromMaterial, toMaterial, rate);
    return true;
  }

  getExchangeRates() {
    const rates = { ...MaterialExchange.DEFAULT_EXCHANGE_RATES };
    Object.entries(this.customRates).forEach(([key, rate]) => {
      rates[key] = rate;
    });
    return rates;
  }

  calculateTotalOutput(conversions) {
    let total = 0;
    conversions.forEach(conv => {
      const rate = this.getExchangeRate(conv.from, conv.to);
      total += Math.floor(conv.amount * rate);
    });
    return total;
  }

  getExchangeHistory() {
    return [...this.exchangeHistory];
  }

  clearHistory() {
    this.exchangeHistory = [];
  }
};

module.exports = MaterialExchange;