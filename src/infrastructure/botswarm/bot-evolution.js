// ============================================================================
// Bot Swarm Arena — V268 Direction B Iteration 5/9
// BotEvolution: 遗传算法 (种群/适应度/选择/交叉/变异/代际)
// 来源：nanobot mesh + generic-agent L0-L4 + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var SELECTION = {
    TOURNAMENT: 'tournament',
    ROULETTE: 'roulette',
    RANK: 'rank',
    ELITE: 'elite'
  };

  // ---- Genome ----
  function Genome(genes) {
    this.genes = genes || [];
    this.fitness = 0;
    this.age = 0;
    this.id = 'g_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  }

  Genome.prototype.clone = function () {
    var g = new Genome(this.genes.slice());
    g.fitness = this.fitness;
    g.age = this.age;
    return g;
  };

  Genome.prototype.mutate = function (rate, bounds) {
    bounds = bounds || { min: 0, max: 1 };
    var mutated = this.genes.slice();
    for (var i = 0; i < mutated.length; i++) {
      if (Math.random() < rate) {
        if (typeof mutated[i] === 'number') {
          mutated[i] = bounds.min + Math.random() * (bounds.max - bounds.min);
        } else if (Array.isArray(mutated[i])) {
          mutated[i] = [bounds.min + Math.random() * (bounds.max - bounds.min)];
        }
      }
    }
    var g = new Genome(mutated);
    g.fitness = this.fitness;
    return g;
  };

  // ---- Crossover ----
  function crossoverSinglePoint(a, b, point) {
    if (typeof point !== 'number') point = Math.floor(a.genes.length / 2);
    if (point < 0) point = 0;
    if (point > a.genes.length) point = a.genes.length;
    var newGenes = a.genes.slice(0, point).concat(b.genes.slice(point));
    return new Genome(newGenes);
  }

  function crossoverUniform(a, b, rate) {
    if (typeof rate !== 'number') rate = 0.5;
    var newGenes = [];
    for (var i = 0; i < a.genes.length; i++) {
      newGenes.push(Math.random() < rate ? a.genes[i] : b.genes[i]);
    }
    return new Genome(newGenes);
  }

  function crossoverBlend(a, b, alpha) {
    if (typeof alpha !== 'number') alpha = 0.5;
    var newGenes = [];
    for (var i = 0; i < a.genes.length; i++) {
      if (typeof a.genes[i] === 'number' && typeof b.genes[i] === 'number') {
        var min = Math.min(a.genes[i], b.genes[i]);
        var max = Math.max(a.genes[i], b.genes[i]);
        var range = max - min;
        var lo = min - range * alpha;
        var hi = max + range * alpha;
        newGenes.push(lo + Math.random() * (hi - lo));
      } else {
        newGenes.push(Math.random() < 0.5 ? a.genes[i] : b.genes[i]);
      }
    }
    return new Genome(newGenes);
  }

  // ---- Population ----
  function BotEvolution(options) {
    options = options || {};
    this.populationSize = options.populationSize || 50;
    this.geneLength = options.geneLength || 10;
    this.mutationRate = options.mutationRate || 0.05;
    this.crossoverRate = options.crossoverRate || 0.7;
    this.elitism = options.elitism !== false;
    this.eliteCount = options.eliteCount || 2;
    this.bounds = options.bounds || { min: 0, max: 1 };
    this.fitnessFunction = options.fitnessFunction || null;
    this.selectionMethod = options.selectionMethod || SELECTION.TOURNAMENT;
    this.tournamentSize = options.tournamentSize || 3;
    this.population = [];
    this.generation = 0;
    this.history = [];
    this.maxHistory = options.maxHistory || 100;
    this._bestEver = null;
  }

  BotEvolution.prototype.randomGene = function () {
    var gene = [];
    for (var i = 0; i < this.geneLength; i++) {
      gene.push(this.bounds.min + Math.random() * (this.bounds.max - this.bounds.min));
    }
    return gene;
  };

  BotEvolution.prototype.initialize = function (seedGenomes) {
    this.population = [];
    for (var i = 0; i < this.populationSize; i++) {
      var genes;
      if (seedGenomes && seedGenomes[i]) {
        genes = seedGenomes[i].genes.slice();
      } else {
        genes = this.randomGene();
      }
      this.population.push(new Genome(genes));
    }
    this.generation = 0;
    this.history = [];
    this._bestEver = null;
    return { success: true, populationSize: this.population.length };
  };

  BotEvolution.prototype.evaluate = function (fitnessFn) {
    if (typeof fitnessFn === 'function') this.fitnessFunction = fitnessFn;
    if (!this.fitnessFunction) return { error: 'no_fitness_function' };
    for (var i = 0; i < this.population.length; i++) {
      this.population[i].fitness = this.fitnessFunction(this.population[i]);
    }
    return { success: true };
  };

  BotEvolution.prototype.getBest = function () {
    if (this.population.length === 0) return null;
    var best = this.population[0];
    for (var i = 1; i < this.population.length; i++) {
      if (this.population[i].fitness > best.fitness) best = this.population[i];
    }
    return best;
  };

  BotEvolution.prototype.getWorst = function () {
    if (this.population.length === 0) return null;
    var worst = this.population[0];
    for (var i = 1; i < this.population.length; i++) {
      if (this.population[i].fitness < worst.fitness) worst = this.population[i];
    }
    return worst;
  };

  BotEvolution.prototype.getAverage = function () {
    if (this.population.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < this.population.length; i++) {
      sum += this.population[i].fitness;
    }
    return sum / this.population.length;
  };

  // ---- Selection ----
  BotEvolution.prototype.select = function () {
    if (this.selectionMethod === SELECTION.TOURNAMENT) {
      return this._tournamentSelect();
    } else if (this.selectionMethod === SELECTION.ROULETTE) {
      return this._rouletteSelect();
    } else if (this.selectionMethod === SELECTION.RANK) {
      return this._rankSelect();
    } else if (this.selectionMethod === SELECTION.ELITE) {
      return this.population[0].clone();
    }
    return this._tournamentSelect();
  };

  BotEvolution.prototype._tournamentSelect = function () {
    var best = null;
    for (var i = 0; i < this.tournamentSize; i++) {
      var idx = Math.floor(Math.random() * this.population.length);
      var candidate = this.population[idx];
      if (!best || candidate.fitness > best.fitness) best = candidate;
    }
    return best.clone();
  };

  BotEvolution.prototype._rouletteSelect = function () {
    var sum = 0;
    for (var i = 0; i < this.population.length; i++) {
      sum += Math.max(0, this.population[i].fitness);
    }
    if (sum === 0) return this.population[Math.floor(Math.random() * this.population.length)].clone();
    var pick = Math.random() * sum;
    var acc = 0;
    for (var j = 0; j < this.population.length; j++) {
      acc += Math.max(0, this.population[j].fitness);
      if (acc >= pick) return this.population[j].clone();
    }
    return this.population[this.population.length - 1].clone();
  };

  BotEvolution.prototype._rankSelect = function () {
    var sorted = this.population.slice().sort(function (a, b) { return a.fitness - b.fitness; });
    var totalRank = (sorted.length * (sorted.length + 1)) / 2;
    var pick = Math.random() * totalRank;
    var acc = 0;
    for (var i = 0; i < sorted.length; i++) {
      acc += (i + 1);
      if (acc >= pick) return sorted[i].clone();
    }
    return sorted[sorted.length - 1].clone();
  };

  // ---- Evolve one generation ----
  BotEvolution.prototype.evolve = function (fitnessFn) {
    this.evaluate(fitnessFn);
    var best = this.getBest();
    var worst = this.getWorst();
    var avg = this.getAverage();
    if (!this._bestEver || best.fitness > this._bestEver.fitness) {
      this._bestEver = best.clone();
    }
    // build next gen
    var next = [];
    // elitism
    if (this.elitism) {
      var sorted = this.population.slice().sort(function (a, b) { return b.fitness - a.fitness; });
      for (var e = 0; e < this.eliteCount && e < sorted.length; e++) {
        next.push(sorted[e].clone());
      }
    }
    while (next.length < this.populationSize) {
      var parent1 = this.select();
      var parent2 = this.select();
      var child;
      if (Math.random() < this.crossoverRate) {
        child = crossoverSinglePoint(parent1, parent2);
      } else {
        child = parent1.clone();
      }
      child = child.mutate(this.mutationRate, this.bounds);
      next.push(child);
    }
    // age
    for (var i = 0; i < this.population.length; i++) {
      this.population[i].age++;
    }
    this.population = next.slice(0, this.populationSize);
    this.generation++;
    var stats = { generation: this.generation, best: best.fitness, worst: worst.fitness, average: avg, bestEver: this._bestEver.fitness };
    this.history.push({ generation: this.generation, best: stats.best, worst: stats.worst, average: stats.average, bestEver: stats.bestEver, ts: Date.now() });
    if (this.history.length > this.maxHistory) this.history = this.history.slice(-this.maxHistory);
    return stats;
  };

  BotEvolution.prototype.run = function (generations, fitnessFn) {
    var results = [];
    for (var i = 0; i < generations; i++) {
      var s = this.evolve(fitnessFn);
      results.push(s);
    }
    return { success: true, generations: generations, finalStats: results[results.length - 1], history: results };
  };

  BotEvolution.prototype.getHistory = function () {
    return this.history.slice();
  };

  BotEvolution.prototype.hasConverged = function (epsilon) {
    if (typeof epsilon !== 'number') epsilon = 0.001;
    if (this.history.length < 2) return false;
    var last = this.history[this.history.length - 1].best;
    var prev = this.history[this.history.length - 2].best;
    return Math.abs(last - prev) < epsilon;
  };

  BotEvolution.prototype.getBestEver = function () {
    return this._bestEver ? this._bestEver.clone() : null;
  };

  BotEvolution.prototype.getStats = function () {
    return {
      generation: this.generation,
      populationSize: this.population.length,
      bestEver: this._bestEver ? this._bestEver.fitness : null,
      averageFitness: this.getAverage(),
      selectionMethod: this.selectionMethod,
      eliteCount: this.eliteCount,
      mutationRate: this.mutationRate
    };
  };

  BotEvolution.prototype.exportPopulation = function () {
    return JSON.stringify({
      generation: this.generation,
      population: this.population.map(function (g) { return { genes: g.genes, fitness: g.fitness }; }),
      bestEver: this._bestEver ? { genes: this._bestEver.genes, fitness: this._bestEver.fitness } : null,
      exportedAt: Date.now()
    });
  };

  BotEvolution.prototype.importPopulation = function (jsonString) {
    if (typeof jsonString !== 'string') return { error: 'invalid_input' };
    try {
      var parsed = JSON.parse(jsonString);
      this.population = parsed.population.map(function (g) {
        var genome = new Genome(g.genes);
        genome.fitness = g.fitness || 0;
        return genome;
      });
      this.generation = parsed.generation || 0;
      if (parsed.bestEver) this._bestEver = new Genome(parsed.bestEver.genes);
      return { success: true, populationSize: this.population.length };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  BotEvolution.prototype.clear = function () {
    this.population = [];
    this.history = [];
    this._bestEver = null;
    this.generation = 0;
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.Genome = Genome;
    window.crossoverSinglePoint = crossoverSinglePoint;
    window.crossoverUniform = crossoverUniform;
    window.crossoverBlend = crossoverBlend;
    window.BotEvolution = BotEvolution;
    window.GA_SELECTION = SELECTION;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      Genome: Genome,
      crossoverSinglePoint: crossoverSinglePoint,
      crossoverUniform: crossoverUniform,
      crossoverBlend: crossoverBlend,
      BotEvolution: BotEvolution,
      GA_SELECTION: SELECTION
    };
  }
})();
