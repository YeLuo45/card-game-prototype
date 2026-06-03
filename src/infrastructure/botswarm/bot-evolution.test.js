'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'bot-evolution.js'), 'utf8'));
var Genome = window.Genome;
var crossoverSinglePoint = window.crossoverSinglePoint;
var crossoverUniform = window.crossoverUniform;
var crossoverBlend = window.crossoverBlend;
var BotEvolution = window.BotEvolution;
var GA_SELECTION = window.GA_SELECTION;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testGenome() {
  var g = new Genome([1, 2, 3]);
  assertEq(g.genes.length, 3, 'GA: 3 genes');
  assertEq(g.fitness, 0, 'GA: 0 fitness');
  var c = g.clone();
  assertEq(c.genes[0], 1, 'GA: clone 1');
  c.genes[0] = 99;
  assertEq(g.genes[0], 1, 'GA: clone isolated');
  // mutate
  var m = g.mutate(1.0);  // 100% rate
  assertEq(m.genes.length, 3, 'GA: mutate 3');
  assert(m.genes[0] !== g.genes[0] || m.genes[1] !== g.genes[1] || m.genes[2] !== g.genes[2], 'GA: mutated');
  // no mutation
  var m2 = g.mutate(0);
  assertEq(m2.genes[0], g.genes[0], 'GA: no mutation');
}

function testCrossover() {
  var a = new Genome([1, 2, 3, 4]);
  var b = new Genome([5, 6, 7, 8]);
  // single point
  var c1 = crossoverSinglePoint(a, b, 2);
  assertEq(c1.genes.length, 4, 'GA: single 4');
  assertEq(c1.genes[0], 1, 'GA: single 0=a');
  assertEq(c1.genes[3], 8, 'GA: single 3=b');
  // default point (middle)
  var c2 = crossoverSinglePoint(a, b);
  assertEq(c2.genes.length, 4, 'GA: default 4');
  // uniform
  var c3 = crossoverUniform(a, b, 1);  // all from a
  assertEq(c3.genes[0], 1, 'GA: uniform all-a');
  var c4 = crossoverUniform(a, b, 0);  // all from b
  assertEq(c4.genes[0], 5, 'GA: uniform all-b');
  // blend
  var c5 = crossoverBlend(a, b, 0.5);
  assertEq(c5.genes.length, 4, 'GA: blend 4');
}

function testEmpty() {
  var ev = new BotEvolution();
  assertEq(ev.populationSize, 50, 'GA: 50 default');
  assertEq(ev.geneLength, 10, 'GA: 10 default');
  assertEq(ev.population.length, 0, 'GA: empty');
  assertEq(ev.generation, 0, 'GA: 0 gen');
}

function testInitialize() {
  var ev = new BotEvolution({ populationSize: 20, geneLength: 5 });
  var r = ev.initialize();
  assertEq(r.success, true, 'GA: init success');
  assertEq(ev.population.length, 20, 'GA: 20 pop');
  for (var i = 0; i < ev.population.length; i++) {
    assertEq(ev.population[i].genes.length, 5, 'GA: 5 genes each');
  }
  // seed
  var ev2 = new BotEvolution({ populationSize: 3, geneLength: 3 });
  var seeds = [new Genome([0.1, 0.2, 0.3]), new Genome([0.4, 0.5, 0.6]), new Genome([0.7, 0.8, 0.9])];
  ev2.initialize(seeds);
  assertEq(ev2.population[0].genes[0], 0.1, 'GA: seed 0');
  assertEq(ev2.population[2].genes[2], 0.9, 'GA: seed 2');
}

function testEvaluate() {
  var ev = new BotEvolution({ populationSize: 5, geneLength: 3 });
  ev.initialize();
  var r = ev.evaluate(function (g) {
    return g.genes[0] + g.genes[1] + g.genes[2];
  });
  assertEq(r.success, true, 'GA: eval');
  for (var i = 0; i < ev.population.length; i++) {
    assert(typeof ev.population[i].fitness === 'number', 'GA: fitness number');
  }
  // no fitness fn
  var ev2 = new BotEvolution();
  var r2 = ev2.evaluate();
  assertEq(r2.error, 'no_fitness_function', 'GA: no fitness');
}

function testGetBestWorst() {
  var ev = new BotEvolution({ populationSize: 5, geneLength: 3 });
  ev.initialize();
  ev.population[0].fitness = 1;
  ev.population[1].fitness = 5;
  ev.population[2].fitness = 3;
  ev.population[3].fitness = 2;
  ev.population[4].fitness = 4;
  var best = ev.getBest();
  assertEq(best.fitness, 5, 'GA: best 5');
  var worst = ev.getWorst();
  assertEq(worst.fitness, 1, 'GA: worst 1');
  assertEq(ev.getAverage(), 3, 'GA: avg 3');
}

function testSelection() {
  var ev = new BotEvolution({ populationSize: 10, geneLength: 3, selectionMethod: 'tournament' });
  ev.initialize();
  for (var i = 0; i < ev.population.length; i++) ev.population[i].fitness = i;
  var s1 = ev.select();
  assert(s1.genes.length === 3, 'GA: tournament select');
  // roulette
  ev.selectionMethod = 'roulette';
  var s2 = ev.select();
  assert(s2.genes.length === 3, 'GA: roulette select');
  // rank
  ev.selectionMethod = 'rank';
  var s3 = ev.select();
  assert(s3.genes.length === 3, 'GA: rank select');
  // elite
  ev.selectionMethod = 'elite';
  var s4 = ev.select();
  assert(s4.genes.length === 3, 'GA: elite select');
  // unknown defaults to tournament
  ev.selectionMethod = 'unknown';
  var s5 = ev.select();
  assert(s5.genes.length === 3, 'GA: default select');
}

function testEvolve() {
  var ev = new BotEvolution({ populationSize: 10, geneLength: 3, elitism: true, eliteCount: 2 });
  ev.initialize();
  // simple fitness: sum of genes
  var stats = ev.evolve(function (g) { return g.genes[0] + g.genes[1] + g.genes[2]; });
  assertEq(stats.generation, 1, 'GA: gen 1');
  assertEq(ev.population.length, 10, 'GA: 10 pop after');
  assert(typeof stats.best === 'number', 'GA: best number');
  assert(typeof stats.average === 'number', 'GA: avg number');
  // evolve once more
  var stats2 = ev.evolve(function (g) { return g.genes[0] + g.genes[1] + g.genes[2]; });
  assertEq(stats2.generation, 2, 'GA: gen 2');
  var ev2 = new BotEvolution({ populationSize: 10, geneLength: 3, elitism: false });
  ev2.initialize();
  ev2.evolve(function (g) { return 1; });
  assertEq(ev2.population.length, 10, 'GA: no-elitism 10');
  // best ever updates
  assert(ev._bestEver !== null, 'GA: best ever set');
}

function testRun() {
  var ev = new BotEvolution({ populationSize: 10, geneLength: 3 });
  ev.initialize();
  var r = ev.run(5, function (g) { return g.genes.reduce(function (a, b) { return a + b; }, 0); });
  assertEq(r.success, true, 'GA: run success');
  assertEq(r.generations, 5, 'GA: 5 gens');
  assertEq(r.history.length, 5, 'GA: 5 history');
  assertEq(ev.generation, 5, 'GA: 5 gen');
}

function testConvergence() {
  var ev = new BotEvolution({ populationSize: 5, geneLength: 3 });
  ev.initialize();
  assertEq(ev.hasConverged(), false, 'GA: not converged yet');
  ev.history.push({ generation: 1, best: 0.5, worst: 0.4, average: 0.45, bestEver: 0.5 });
  ev.history.push({ generation: 2, best: 0.50001, worst: 0.4, average: 0.45, bestEver: 0.50001 });
  assertEq(ev.hasConverged(0.01), true, 'GA: converged');
  assertEq(ev.hasConverged(0.000001), false, 'GA: not converged strict');
  // exact same
  ev.history.push({ generation: 3, best: 0.50001, worst: 0.4, average: 0.45, bestEver: 0.50001 });
  assertEq(ev.hasConverged(0.000001), true, 'GA: exact same converged');
}

function testExportImport() {
  var ev = new BotEvolution({ populationSize: 5, geneLength: 3 });
  ev.initialize();
  for (var i = 0; i < ev.population.length; i++) ev.population[i].fitness = i;
  ev.evolve(function (g) { return g.genes[0]; });
  var exp = ev.exportPopulation();
  var parsed = JSON.parse(exp);
  assertEq(parsed.generation, 1, 'GA: export gen');
  assertEq(parsed.population.length, 5, 'GA: export 5');
  var ev2 = new BotEvolution();
  var imp = ev2.importPopulation(exp);
  assertEq(imp.success, true, 'GA: import');
  assertEq(ev2.population.length, 5, 'GA: 5 imported');
  // errors
  var e1 = ev2.importPopulation(null);
  assertEq(e1.error, 'invalid_input', 'GA: null import');
  var e2 = ev2.importPopulation('not json');
  assertEq(e2.error, 'parse_error', 'GA: bad json');
}

function testClear() {
  var ev = new BotEvolution();
  ev.initialize();
  ev.evolve(function () { return 1; });
  var c = ev.clear();
  assertEq(c.success, true, 'GA: clear');
  assertEq(ev.population.length, 0, 'GA: 0 pop');
  assertEq(ev.generation, 0, 'GA: 0 gen');
}

function testBestEver() {
  var ev = new BotEvolution({ populationSize: 5, geneLength: 3 });
  ev.initialize();
  // spike
  ev.population[2].fitness = 100;
  ev.evolve(function (g) { return g.fitness; });  // keep current
  var be = ev.getBestEver();
  assert(be !== null, 'GA: best ever');
  assert(be.fitness >= 100, 'GA: best ever >= 100');
}

function testStats() {
  var ev = new BotEvolution({ populationSize: 10, geneLength: 3, selectionMethod: 'tournament' });
  ev.initialize();
  ev.evaluate(function () { return 1; });
  var s = ev.getStats();
  assertEq(s.populationSize, 10, 'GA: stats 10');
  assertEq(s.selectionMethod, 'tournament', 'GA: stats method');
}

function testConstants() {
  assertEq(GA_SELECTION.TOURNAMENT, 'tournament', 'GA: TOURNAMENT');
  assertEq(GA_SELECTION.ROULETTE, 'roulette', 'GA: ROULETTE');
}

testGenome();
testCrossover();
testEmpty();
testInitialize();
testEvaluate();
testGetBestWorst();
testSelection();
testEvolve();
testRun();
testConvergence();
testExportImport();
testClear();
testBestEver();
testStats();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
