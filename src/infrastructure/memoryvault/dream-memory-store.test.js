'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
global.localStorage = (function () {
  var store = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    clear: function () { store = {}; }
  };
})();
eval(fs.readFileSync(path.join(__dirname, 'dream-memory-store.js'), 'utf8'));
var MEMORY_TYPE = window.MEMORY_TYPE;
var MEMORY_LAYER = window.MEMORY_LAYER;
var MemoryEntry = window.MemoryEntry;
var DreamMemoryStore = window.DreamMemoryStore;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

// =========== MEMORY_TYPE / MEMORY_LAYER ===========
{
  assertEq(MEMORY_TYPE.EPISODIC, 'episodic', 'TYPE.EPISODIC');
  assertEq(MEMORY_TYPE.SEMANTIC, 'semantic', 'TYPE.SEMANTIC');
  assertEq(MEMORY_TYPE.PROCEDURAL, 'procedural', 'TYPE.PROCEDURAL');
  assertEq(MEMORY_TYPE.EMOTIONAL, 'emotional', 'TYPE.EMOTIONAL');
  assertEq(MEMORY_TYPE.NPC, 'npc', 'TYPE.NPC');
  assertEq(MEMORY_TYPE.STRATEGIC, 'strategic', 'TYPE.STRATEGIC');
  assertEq(MEMORY_TYPE.META, 'meta', 'TYPE.META');
  assertEq(MEMORY_LAYER.L0_RULE, 'L0', 'LAYER.L0_RULE');
  assertEq(MEMORY_LAYER.L1_INDEX, 'L1', 'LAYER.L1_INDEX');
  assertEq(MEMORY_LAYER.L2_GLOBAL, 'L2', 'LAYER.L2_GLOBAL');
  assertEq(MEMORY_LAYER.L3_SKILL, 'L3', 'LAYER.L3_SKILL');
  assertEq(MEMORY_LAYER.L4_SESSION, 'L4', 'LAYER.L4_SESSION');
}

// =========== MemoryEntry ===========
{
  var e1 = new MemoryEntry('m1', MEMORY_TYPE.EPISODIC, MEMORY_LAYER.L4_SESSION, { battle: 'win' });
  assertEq(e1.id, 'm1', 'Entry: id');
  assertEq(e1.type, MEMORY_TYPE.EPISODIC, 'Entry: type');
  assertEq(e1.layer, MEMORY_LAYER.L4_SESSION, 'Entry: layer');
  assertEq(e1.importance, 0.5, 'Entry: default importance');
  assertEq(e1.decayFactor, 1.0, 'Entry: default decay');
  assertEq(e1.accessCount, 0, 'Entry: default accessCount');
  e1.touch();
  assertEq(e1.accessCount, 1, 'Entry: touch +1');
  var ok = e1.setImportance(0.8);
  assertEq(ok, true, 'Entry: setImportance valid');
  assertEq(e1.importance, 0.8, 'Entry: importance=0.8');
  var ok2 = e1.setImportance(2.5);
  assertEq(ok2, true, 'Entry: clamp high');
  assertEq(e1.importance, 1.0, 'Entry: clamped to 1.0');
  var ok3 = e1.setImportance(-1);
  assertEq(ok3, true, 'Entry: clamp low');
  assertEq(e1.importance, 0, 'Entry: clamped to 0');
  var ok4 = e1.setImportance('abc');
  assertEq(ok4, false, 'Entry: invalid importance');
  var ok5 = e1.applyDecay(0.1);
  assertEq(ok5, true, 'Entry: decay 0.1');
  assertEq(e1.decayFactor < 1.0, true, 'Entry: decay reduced');
  var ok6 = e1.applyDecay(0);
  assertEq(ok6, false, 'Entry: invalid decay 0');
  var ok7 = e1.applyDecay(-1);
  assertEq(ok7, false, 'Entry: invalid decay -1');
  var json = e1.toJSON();
  assertEq(json.id, 'm1', 'Entry.toJSON: id');
  assertEq(typeof json.createdAt, 'number', 'Entry.toJSON: createdAt is number');
  var e2 = MemoryEntry.fromJSON({ id: 'm2', type: 'episodic', layer: 'L4', content: 'c', metadata: { x: 1 }, createdAt: 100, accessedAt: 200, accessCount: 5, importance: 0.7, decayFactor: 0.9 });
  assertEq(e2.id, 'm2', 'Entry.fromJSON: id');
  assertEq(e2.accessCount, 5, 'Entry.fromJSON: accessCount');
  assertEq(e2.importance, 0.7, 'Entry.fromJSON: importance');
  var e3 = MemoryEntry.fromJSON(null);
  assertEq(e3, null, 'Entry.fromJSON: null returns null');
}

// =========== DreamMemoryStore ===========
{
  var store = new DreamMemoryStore();
  assertEq(store.size(), 0, 'Store: empty initial size');
  var s = store.save(MEMORY_TYPE.EPISODIC, MEMORY_LAYER.L4_SESSION, { event: 'battle' }, { sessionId: 'sess_1' });
  assertEq(s.success, true, 'Store: save success');
  assertEq(typeof s.id, 'string', 'Store: save returns id');
  assertEq(store.size(), 1, 'Store: size=1 after save');
  var bad1 = store.save(null, MEMORY_LAYER.L4_SESSION, 'c');
  assertEq(bad1.error, 'invalid_type', 'Store: save invalid type');
  var bad2 = store.save(MEMORY_TYPE.EPISODIC, null, 'c');
  assertEq(bad2.error, 'invalid_layer', 'Store: save invalid layer');
  var got = store.get(s.id);
  assertEq(got.id, s.id, 'Store: get id match');
  assertEq(got.accessCount, 1, 'Store: get touches accessCount');
  var peek = store.peek(s.id);
  assertEq(peek.accessCount, 1, 'Store: peek no extra touch');
  var bad_get = store.get(null);
  assertEq(bad_get, null, 'Store: get null returns null');
  var bad_get2 = store.get('notexist');
  assertEq(bad_get2, null, 'Store: get notexist returns null');
  var del1 = store.delete(s.id);
  assertEq(del1.success, true, 'Store: delete success');
  assertEq(store.size(), 0, 'Store: size=0 after delete');
  var del2 = store.delete('notexist');
  assertEq(del2.error, 'not_found', 'Store: delete not_found');
  var del3 = store.delete(null);
  assertEq(del3.error, 'invalid_id', 'Store: delete invalid_id');
}

// =========== listByType / listByLayer / listBySession ===========
{
  var store2 = new DreamMemoryStore();
  store2.save(MEMORY_TYPE.EPISODIC, MEMORY_LAYER.L4_SESSION, { a: 1 }, { sessionId: 'sA' });
  store2.save(MEMORY_TYPE.EPISODIC, MEMORY_LAYER.L4_SESSION, { a: 2 }, { sessionId: 'sA' });
  store2.save(MEMORY_TYPE.SEMANTIC, MEMORY_LAYER.L2_GLOBAL, { b: 1 });
  store2.save(MEMORY_TYPE.STRATEGIC, MEMORY_LAYER.L3_SKILL, { c: 1 }, { sessionId: 'sB' });
  var episodic = store2.listByType(MEMORY_TYPE.EPISODIC);
  assertEq(episodic.length, 2, 'listByType: episodic=2');
  var semantic = store2.listByType(MEMORY_TYPE.SEMANTIC);
  assertEq(semantic.length, 1, 'listByType: semantic=1');
  var strategic = store2.listByType(MEMORY_TYPE.STRATEGIC);
  assertEq(strategic.length, 1, 'listByType: strategic=1');
  var null_list = store2.listByType(null);
  assertEq(null_list.length, 0, 'listByType: null returns []');
  var l2 = store2.listByLayer(MEMORY_LAYER.L2_GLOBAL);
  assertEq(l2.length, 1, 'listByLayer: L2=1');
  var l4 = store2.listByLayer(MEMORY_LAYER.L4_SESSION);
  assertEq(l4.length, 2, 'listByLayer: L4=2');
  var l3 = store2.listByLayer(MEMORY_LAYER.L3_SKILL);
  assertEq(l3.length, 1, 'listByLayer: L3=1');
  var sessA = store2.listBySession('sA');
  assertEq(sessA.length, 2, 'listBySession: sA=2');
  var sessB = store2.listBySession('sB');
  assertEq(sessB.length, 1, 'listBySession: sB=1');
  var sessNull = store2.listBySession(null);
  assertEq(sessNull.length, 0, 'listBySession: null returns []');
}

// =========== Session lifecycle ===========
{
  var store3 = new DreamMemoryStore();
  var sess1 = store3.startSession('sess_alpha');
  assertEq(sess1.success, true, 'Session: start alpha');
  var sess1dup = store3.startSession('sess_alpha');
  assertEq(sess1dup.error, 'session_exists', 'Session: dup alpha');
  var sessBad = store3.startSession(null);
  assertEq(sessBad.error, 'invalid_session_id', 'Session: invalid id');
  store3.save(MEMORY_TYPE.EPISODIC, MEMORY_LAYER.L4_SESSION, { x: 1 }, { sessionId: 'sess_alpha' });
  store3.save(MEMORY_TYPE.EPISODIC, MEMORY_LAYER.L4_SESSION, { x: 2 }, { sessionId: 'sess_alpha' });
  var end1 = store3.endSession('sess_alpha');
  assertEq(end1.success, true, 'Session: end alpha');
  assertEq(end1.session.count, 2, 'Session: end alpha count=2');
  var end2 = store3.endSession('sess_alpha');
  assertEq(end2.error, 'session_already_ended', 'Session: end twice');
  var endBad = store3.endSession('nonexistent');
  assertEq(endBad.error, 'session_not_found', 'Session: end nonexistent');
  var info = store3.getSession('sess_alpha');
  assertEq(info.count, 2, 'Session: info count');
  var infoBad = store3.getSession(null);
  assertEq(infoBad, null, 'Session: getSession null');
  var sessions = store3.listSessions();
  assertEq(sessions.length, 1, 'Session: listSessions count=1');
}

// =========== Persistence ===========
{
  var store4 = new DreamMemoryStore({ persistence: global.localStorage });
  store4.save(MEMORY_TYPE.EPISODIC, MEMORY_LAYER.L4_SESSION, { x: 'persist' });
  store4.save(MEMORY_TYPE.SEMANTIC, MEMORY_LAYER.L2_GLOBAL, { y: 'persist' });
  var raw = global.localStorage.getItem('dream_memory');
  assertEq(typeof raw, 'string', 'Persistence: localStorage has data');
  // Restore from same localStorage
  var store5 = new DreamMemoryStore({ persistence: global.localStorage });
  assertEq(store5.size(), 2, 'Persistence: restored size=2');
  var store6 = new DreamMemoryStore({ persistence: null });
  store6.save(MEMORY_TYPE.META, MEMORY_LAYER.L0_RULE, 'rule');
  assertEq(store6.size(), 1, 'Persistence: no-persist still works');
}

// =========== Stats & clear ===========
{
  var store7 = new DreamMemoryStore();
  store7.save(MEMORY_TYPE.EPISODIC, MEMORY_LAYER.L4_SESSION, { a: 1 });
  store7.save(MEMORY_TYPE.SEMANTIC, MEMORY_LAYER.L2_GLOBAL, { a: 2 });
  store7.save(MEMORY_TYPE.STRATEGIC, MEMORY_LAYER.L3_SKILL, { a: 3 });
  store7.startSession('s1');
  var stats = store7.getStats();
  assertEq(stats.total, 3, 'Stats: total=3');
  assertEq(stats.byType[MEMORY_TYPE.EPISODIC], 1, 'Stats: episodic=1');
  assertEq(stats.byLayer[MEMORY_LAYER.L4_SESSION], 1, 'Stats: L4=1');
  assertEq(stats.sessions, 1, 'Stats: sessions=1');
  var c = store7.clear();
  assertEq(c.success, true, 'Clear: success');
  assertEq(store7.size(), 0, 'Clear: size=0');
  assertEq(store7.getStats().sessions, 0, 'Clear: sessions=0');
}

// =========== Max size limit ===========
{
  var store8 = new DreamMemoryStore({ maxSize: 3 });
  store8.save(MEMORY_TYPE.META, MEMORY_LAYER.L0_RULE, 'a');
  store8.save(MEMORY_TYPE.META, MEMORY_LAYER.L0_RULE, 'b');
  store8.save(MEMORY_TYPE.META, MEMORY_LAYER.L0_RULE, 'c');
  assertEq(store8.size(), 3, 'MaxSize: filled');
  var full = store8.save(MEMORY_TYPE.META, MEMORY_LAYER.L0_RULE, 'd');
  assertEq(full.error, 'storage_full', 'MaxSize: full error');
}

console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);