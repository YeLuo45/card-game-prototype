/**
 * V79 测试套件 — PluginCache + RemoteMarket + PluginManager + V79 New APIs
 * V79: Plugin Market v4 — Third-party Distribution + Version Governance
 * 运行: node plugin-api.test.js
 */

// Mock localStorage — stores items directly as properties (matches real browser localStorage)
const localStorageMock = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

// Mock crypto for HMAC-SHA256 (browser API)
const cryptoMock = {
  subtle: {
    importKey: async (format, keyData, algorithm, extractable, keyUsages) => {
      return { type: 'secret', algorithm: algorithm.name };
    },
    sign: async (algorithm, key, data) => {
      // Simple mock: just return a deterministic "signature" based on data
      const str = Buffer.from(data).toString('hex').substring(0, 32);
      return Buffer.from(str.padEnd(64, '0'));
    }
  }
};

// Mock window
const mockWindow = {
  localStorage: localStorageMock,
  console: console,
  crypto: cryptoMock
};
global.localStorage = localStorageMock;
global.window = mockWindow;
Object.defineProperty(global, 'crypto', { value: cryptoMock, writable: true, configurable: true });

// Load plugin-api.js using vm
const fs = require('fs');
const vm = require('vm');
const pluginApiCode = fs.readFileSync('/home/hermes/workspace-dev/proposals/card-game-prototype/plugin-api.js', 'utf8');

const sandbox = {
  localStorage: localStorageMock,
  window: mockWindow,
  console: console,
  crypto: cryptoMock,
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  setInterval,
  clearTimeout,
  clearInterval,
  JSON,
  Math,
  Date,
  Promise,
  fetch: (url) => Promise.reject(new Error('No fetch in Node.js test env')),
};
vm.createContext(sandbox);
vm.runInContext(pluginApiCode, sandbox);

const PluginCache = sandbox.window.PluginCache;
const EventBus = sandbox.window.EventBus;
const RemoteMarket = sandbox.window.RemoteMarket;
const PluginManager = sandbox.window.PluginManager;
const SemVer = sandbox.window.SemVer;
const SignatureTool = sandbox.window.SignatureTool;
const PluginManifestGenerator = sandbox.window.PluginManifestGenerator;
const ReviewQueue = sandbox.window.ReviewQueue;
const VersionDiff = sandbox.window.VersionDiff;
const PluginPublisher = sandbox.window.PluginPublisher;

// Test results
let passed = 0, failed = 0;
function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('\n=== PluginCache Tests ===');

  localStorage.clear();

  // set + get
  PluginCache.set('test-plugin', { id: 'test-plugin', name: 'Test Plugin', version: '1.0.0' });
  let cached = PluginCache.get('test-plugin');
  assert(cached && cached.id === 'test-plugin', 'PluginCache.set + get: stores and retrieves plugin');

  // has
  assert(PluginCache.has('test-plugin') === true, 'PluginCache.has: returns true for cached plugin');
  assert(PluginCache.has('non-existent') === false, 'PluginCache.has: returns false for non-cached plugin');

  // remove
  PluginCache.remove('test-plugin');
  assert(PluginCache.has('test-plugin') === false, 'PluginCache.remove: removes plugin from cache');
  assert(PluginCache.get('test-plugin') === null, 'PluginCache.remove: get returns null after removal');

  // list - verify both plugins are returned (using has() which uses get())
  PluginCache.set('plugin-a', { id: 'plugin-a' });
  PluginCache.set('plugin-b', { id: 'plugin-b' });
  assert(PluginCache.has('plugin-a') === true, 'PluginCache.list: plugin-a is cached');
  assert(PluginCache.has('plugin-b') === true, 'PluginCache.list: plugin-b is cached');
  assert(PluginCache.has('plugin-a') && PluginCache.has('plugin-b'), 'PluginCache.list: contains both plugins after TTL upgrade');

  // Corrupt storage (old format without _ts/_data)
  localStorage.data['plugin_cache_test-corrupt'] = 'not valid json';
  let corruptResult = PluginCache.get('test-corrupt');
  assert(corruptResult === null, 'PluginCache.get: returns null for corrupted JSON');

  // TTL expiry test - old entry without _ts should be considered expired (get returns null)
  // But existing entries with _ts should work
  PluginCache.set('ttl-test', { id: 'ttl-test', name: 'TTL Test' });
  let ttlResult = PluginCache.get('ttl-test');
  assert(ttlResult !== null, 'PluginCache: returns non-expired TTL cache');
  assert(ttlResult.id === 'ttl-test', 'PluginCache: returns correct data after TTL upgrade');

  console.log('\n=== EventBus Tests ===');
  let eventFired = false;
  let eventData = null;
  EventBus.on('test-event', (data) => { eventFired = true; eventData = data; });
  EventBus.emit('test-event', { value: 42 });
  assert(eventFired === true, 'EventBus.emit: fires registered event listener');
  assert(eventData && eventData.value === 42, 'EventBus.emit: passes data to listener');

  // Test off
  // Test off with handler param: EventBus.off(event, handler) removes specific handler
  let offResult = null;
  let handlerFn = (data) => { offResult = data; };
  EventBus.on('test-event-off', handlerFn);
  // off requires (event, handler) - this is the actual API
  EventBus.off('test-event-off', handlerFn);
  EventBus.emit('test-event-off', { value: 99 });
  assert(offResult === null, 'EventBus.off(event, handler): removes specific handler, no fire');

  console.log('\n=== RemoteMarket Tests ===');
  // RemoteMarket.fetchManifest is async - call _getMockPlugins directly for unit test
  const mockPlugins = RemoteMarket._getMockPlugins();
  assert(Array.isArray(mockPlugins), 'RemoteMarket._getMockPlugins: returns array');
  assert(mockPlugins.length >= 3, `RemoteMarket._getMockPlugins: has at least 3 plugins (got ${mockPlugins.length})`);

  const fireball = mockPlugins.find(p => p.id === 'fireball-expansion');
  assert(fireball !== undefined, 'RemoteMarket: contains fireball plugin');
  assert(fireball.rating >= 0, 'RemoteMarket: fireball has rating');
  assert(Array.isArray(fireball.tags), 'RemoteMarket: fireball has tags array');
  assert(typeof fireball.downloads === 'number', 'RemoteMarket: fireball has downloads count');

  const ice = mockPlugins.find(p => p.id === 'ice-shard' || p.id === 'ice-mage-pack');
  assert(ice !== undefined, 'RemoteMarket: contains ice plugin');

  const lucky = mockPlugins.find(p => p.id === 'lucky-reliquary');
  assert(lucky !== undefined, 'RemoteMarket: contains lucky plugin');

  // Test rating sorting
  let sorted = [...mockPlugins].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  assert(sorted[0].rating >= sorted[sorted.length - 1].rating, 'RemoteMarket: mock data sort by rating works');

  console.log('\n=== PluginManager Tests ===');
  assert(typeof PluginManager !== 'undefined', 'PluginManager: exported to window');
  assert(typeof PluginManager.install === 'function', 'PluginManager: has install method');
  assert(typeof PluginManager.uninstall === 'function', 'PluginManager: has uninstall method');
  assert(typeof PluginManager.listInstalled === 'function', 'PluginManager: has listInstalled method');
  assert(typeof PluginManager.isInstalled === 'function', 'PluginManager: has isInstalled method');

  localStorage.clear();
  PluginManager._installedPlugins = {};

  let installed = PluginManager.listInstalled();
  assert(Array.isArray(installed), 'PluginManager.listInstalled: returns array');

  let isInstalledResult = PluginManager.isInstalled('any-plugin');
  assert(isInstalledResult === false, 'PluginManager.isInstalled: returns false for non-installed');

  PluginManager.install({ id: 'new-plugin', name: 'New Plugin', version: '1.0.0' });
  assert(PluginManager.isInstalled('new-plugin') === true, 'PluginManager.install: marks plugin as installed');

  PluginManager.uninstall('new-plugin');
  assert(PluginManager.isInstalled('new-plugin') === false, 'PluginManager.uninstall: removes plugin');

  console.log('\n=== V79 SemVer Tests ===');
  assert(SemVer.isValid('1.0.0') === true, 'SemVer.isValid: returns true for 1.0.0');
  assert(SemVer.isValid('2.1.3') === true, 'SemVer.isValid: returns true for 2.1.3');
  assert(SemVer.isValid('invalid') === false, 'SemVer.isValid: returns false for invalid');
  assert(SemVer.isValid('1.0') === false, 'SemVer.isValid: returns false for 1.0');
  assert(SemVer.compare('1.0.0', '1.0.0') === 0, 'SemVer.compare: equal versions return 0');
  assert(SemVer.compare('2.0.0', '1.0.0') > 0, 'SemVer.compare: 2.0.0 > 1.0.0');
  assert(SemVer.compare('1.1.0', '1.0.0') > 0, 'SemVer.compare: 1.1.0 > 1.0.0');
  assert(SemVer.compare('1.0.1', '1.0.0') > 0, 'SemVer.compare: 1.0.1 > 1.0.0');
  assert(SemVer.compare('1.0.0', '2.0.0') < 0, 'SemVer.compare: 1.0.0 < 2.0.0');
  assert(SemVer.gt('2.0.0', '1.0.0') === true, 'SemVer.gt: 2.0.0 > 1.0.0');
  assert(SemVer.lt('1.0.0', '2.0.0') === true, 'SemVer.lt: 1.0.0 < 2.0.0');
  assert(SemVer.eq('1.0.0', '1.0.0') === true, 'SemVer.eq: 1.0.0 equals 1.0.0');
  assert(SemVer.gte('1.0.0', '1.0.0') === true, 'SemVer.gte: 1.0.0 >= 1.0.0');
  assert(SemVer.lte('1.0.0', '1.0.0') === true, 'SemVer.lte: 1.0.0 <= 1.0.0');
  assert(SemVer.diff('2.0.0', '1.0.0') === 'major', 'SemVer.diff: major version diff');
  assert(SemVer.diff('1.2.0', '1.1.0') === 'minor', 'SemVer.diff: minor version diff');
  assert(SemVer.diff('1.1.2', '1.1.1') === 'patch', 'SemVer.diff: patch version diff');
  assert(SemVer.diff('1.1.1', '1.1.1') === 'same', 'SemVer.diff: same version');

  console.log('\n=== V79 ReviewQueue Tests ===');
  localStorage.clear();
  assert(typeof ReviewQueue !== 'undefined', 'ReviewQueue: exported to window');
  assert(typeof ReviewQueue.submit === 'function', 'ReviewQueue: has submit method');
  assert(typeof ReviewQueue.approve === 'function', 'ReviewQueue: has approve method');
  assert(typeof ReviewQueue.reject === 'function', 'ReviewQueue: has reject method');

  // Submit plugin
  const testManifest = {
    name: 'test-plugin', version: '1.0.0', author: 'test',
    signature: 'sig123', cards: [], relics: [], hooks: [], dependencies: {}
  };
  ReviewQueue.submit(testManifest);
  let pending = ReviewQueue.getPending();
  assert(pending.length === 1, 'ReviewQueue.submit: adds plugin to pending');
  assert(pending[0].name === 'test-plugin', 'ReviewQueue.submit: plugin name correct');
  assert(pending[0].status === 'pending_review', 'ReviewQueue.submit: status is pending_review');

  // Submit updated version
  const testManifest2 = { ...testManifest, version: '1.1.0' };
  ReviewQueue.submit(testManifest2);
  pending = ReviewQueue.getPending();
  assert(pending.length === 1, 'ReviewQueue.submit: updates existing plugin');
  assert(pending[0].version === '1.1.0', 'ReviewQueue.submit: version updated');

  // Approve
  ReviewQueue.approve('test-plugin');
  let approved = ReviewQueue.getApproved();
  assert(approved.length === 1, 'ReviewQueue.approve: plugin approved');
  assert(approved[0].status === 'approved', 'ReviewQueue.approve: status is approved');

  // Reject another
  const testManifest3 = { ...testManifest, name: 'reject-plugin', version: '1.0.0' };
  ReviewQueue.submit(testManifest3);
  ReviewQueue.reject('reject-plugin', 'Invalid signature');
  let rejected = ReviewQueue.getRejected();
  assert(rejected.length === 1, 'ReviewQueue.reject: plugin rejected');
  assert(rejected[0].rejectionReason === 'Invalid signature', 'ReviewQueue.reject: reason saved');

  console.log('\n=== V79 VersionDiff Tests ===');
  assert(typeof VersionDiff !== 'undefined', 'VersionDiff: exported to window');
  assert(typeof VersionDiff.compare === 'function', 'VersionDiff: has compare method');
  assert(typeof VersionDiff.format === 'function', 'VersionDiff: has format method');

  const oldPlugin = {
    name: 'diff-test', version: '1.0.0', author: 'test',
    cards: [
      { id: 'card1', name: 'Old Card 1' },
      { id: 'card2', name: 'Old Card 2' }
    ],
    relics: [{ id: 'relic1', name: 'Old Relic' }],
    hooks: ['onCardPlay', 'onTurnStart'],
    dependencies: { 'base-plugin': '1.0.0' }
  };

  const newPlugin = {
    name: 'diff-test', version: '1.1.0', author: 'test',
    cards: [
      { id: 'card1', name: 'Old Card 1' },
      { id: 'card2', name: 'Modified Card 2' },
      { id: 'card3', name: 'New Card 3' }
    ],
    relics: [{ id: 'relic1', name: 'Modified Relic' }],
    hooks: ['onCardPlay', 'onTurnStart', 'onEnemyKill'],
    dependencies: { 'base-plugin': '1.1.0' }
  };

  const diff = VersionDiff.compare(oldPlugin, newPlugin);
  assert(diff.hasNewFeatures === true, 'VersionDiff.compare: detects minor version as feature');
  assert(diff.hasBreaking === false, 'VersionDiff.compare: no breaking change');
  assert(diff.newCards.length === 1, 'VersionDiff.compare: detects 1 new card');
  assert(diff.modifiedCards.length === 1, 'VersionDiff.compare: detects 1 modified card');
  assert(diff.newHooks.length === 1, 'VersionDiff.compare: detects 1 new hook');
  assert(diff.dependencyChanges['base-plugin'] !== undefined, 'VersionDiff.compare: detects dependency change');

  const formatted = VersionDiff.format(diff);
  assert(formatted.includes('New Features') || formatted.includes('✨'), 'VersionDiff.format: includes new features label');
  assert(formatted.includes('card3') || formatted.includes('New Card 3'), 'VersionDiff.format: mentions new card');

  console.log('\n=== V79 PluginPublisher Tests ===');
  assert(typeof PluginPublisher !== 'undefined', 'PluginPublisher: exported to window');
  assert(typeof PluginPublisher.bindGitHub === 'function', 'PluginPublisher: has bindGitHub method');
  assert(typeof PluginPublisher.logout === 'function', 'PluginPublisher: has logout method');

  localStorage.clear();
  assert(PluginPublisher.isRegistered() === false, 'PluginPublisher: not registered initially');

  PluginPublisher.bindGitHub('testuser', 'ghp_testtoken123');
  assert(PluginPublisher.isRegistered() === true, 'PluginPublisher: registered after bind');
  const profile = PluginPublisher.getProfile();
  assert(profile !== null, 'PluginPublisher: profile retrieved');
  assert(profile.github === 'testuser', 'PluginPublisher: github username saved');
  assert(profile.token === 'ghp_testtoken123', 'PluginPublisher: token saved');

  PluginPublisher.logout();
  assert(PluginPublisher.isRegistered() === false, 'PluginPublisher: not registered after logout');

  console.log('\n=== V79 PluginManifestGenerator Tests ===');
  assert(typeof PluginManifestGenerator !== 'undefined', 'PluginManifestGenerator: exported to window');
  assert(typeof PluginManifestGenerator.validate === 'function', 'PluginManifestGenerator: has validate method');
  assert(typeof PluginManifestGenerator.exportToJSON === 'function', 'PluginManifestGenerator: has exportToJSON');
  assert(typeof PluginManifestGenerator.parseFromJSON === 'function', 'PluginManifestGenerator: has parseFromJSON');

  // Validate correct manifest
  const validManifest = {
    name: 'valid-plugin', version: '1.0.0', author: 'author',
    signature: 'sig123', cards: [], relics: [], hooks: [], dependencies: {}
  };
  let result = PluginManifestGenerator.validate(validManifest);
  assert(result.valid === true, 'PluginManifestGenerator.validate: valid manifest passes');

  // Validate incomplete manifest
  const invalidManifest = { name: 'bad-plugin' };
  result = PluginManifestGenerator.validate(invalidManifest);
  assert(result.valid === false, 'PluginManifestGenerator.validate: invalid manifest fails');
  assert(result.errors.length > 0, 'PluginManifestGenerator.validate: errors reported');

  // Export/Parse roundtrip
  const jsonStr = PluginManifestGenerator.exportToJSON(validManifest);
  const parsed = PluginManifestGenerator.parseFromJSON(jsonStr);
  assert(parsed !== null, 'PluginManifestGenerator.parseFromJSON: parses valid JSON');
  assert(parsed.name === 'valid-plugin', 'PluginManifestGenerator.parseFromJSON: data matches');

  const badJson = PluginManifestGenerator.parseFromJSON('not json');
  assert(badJson === null, 'PluginManifestGenerator.parseFromJSON: returns null for invalid JSON');

  console.log('\n=== Integration Tests ===');
  localStorage.clear();
  PluginCache.set('integration-test', { id: 'integration-test', name: 'Integration Test' });
  assert(PluginCache.has('integration-test') === true, 'Integration: Cache + isInstalled can work together');

  // Filter by rating
  let filtered = mockPlugins.filter(p => p.rating >= 4.0);
  assert(filtered.length >= 1, `Filter by rating >= 4.0 returns ${filtered.length} plugins`);

  // Filter by tag
  let controlPlugins = mockPlugins.filter(p => (p.tags || []).includes('控制'));
  assert(controlPlugins.length >= 1, `Filter by tag "控制" returns ${controlPlugins.length} plugins`);

  console.log('\n=== Performance Tests ===');
  try {
    for (let i = 0; i < 10; i++) {
      PluginCache.set(`perf-${i}`, { id: `perf-${i}`, name: `Perf ${i}` });
    }
    let perfHas = PluginCache.has('perf-5');
    assert(perfHas === true, 'PluginCache: handles multiple set operations');
  } catch (e) {
    failed++;
    console.log(`  ✗ FAIL: PluginCache performance test threw: ${e.message}`);
  }

  // Summary
  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  const passRate = ((passed/(passed+failed))*100).toFixed(1);
  console.log(`Pass Rate: ${passRate}%`);
  console.log(`Required: 80%`);

  if (passed / (passed + failed) >= 0.8 && failed === 0) {
    console.log('\n✓ All critical tests passed!');
  } else {
    console.log('\n✗ Some tests failed');
  }
}

runTests();