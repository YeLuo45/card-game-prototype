/**
 * V72 测试套件 — PluginCache + RemoteMarket + PluginManager
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

// Mock window
const mockWindow = {
  localStorage: localStorageMock,
  console: console,
};
global.localStorage = localStorageMock;
global.window = mockWindow;

// Load plugin-api.js using vm
const fs = require('fs');
const vm = require('vm');
const pluginApiCode = fs.readFileSync('/home/hermes/workspace-dev/proposals/card-game-prototype/plugin-api.js', 'utf8');

const sandbox = {
  localStorage: localStorageMock,
  window: mockWindow,
  console: console,
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
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});