// ============================================================================
// Plugin Marketplace — V277 Direction C Iteration 5/9
// PluginVersion: 语义版本管理 (semver parse/compare/constraint/bump)
// 来源：claude-code tool system + nanobot mesh + thunderbolt PowerSync + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var BUMP_TYPE = {
    MAJOR: 'major',
    MINOR: 'minor',
    PATCH: 'patch'
  };

  function parseSemver(version) {
    if (typeof version !== 'string') return null;
    var match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) return null;
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] || null,
      raw: version
    };
  }

  function compareSemver(a, b) {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;
    // prerelease: no prerelease > prerelease
    if (!a.prerelease && b.prerelease) return 1;
    if (a.prerelease && !b.prerelease) return -1;
    if (a.prerelease < b.prerelease) return -1;
    if (a.prerelease > b.prerelease) return 1;
    return 0;
  }

  function satisfiesConstraint(version, constraint) {
    var v = typeof version === 'string' ? parseSemver(version) : version;
    if (!v) return false;
    if (typeof constraint === 'string') {
      constraint = parseConstraint(constraint);
    }
    if (!constraint || !constraint.ranges) return false;
    // OR: version matches if any range matches
    for (var i = 0; i < constraint.ranges.length; i++) {
      var r = constraint.ranges[i];
      var minOk = compareSemver(v, r.min) > 0 || (compareSemver(v, r.min) === 0 && !r.minExclusive);
      var maxOk = !r.max || compareSemver(v, r.max) < 0 || (compareSemver(v, r.max) === 0 && !r.maxExclusive);
      if (minOk && maxOk) return true;
    }
    return false;
  }

  function parseConstraint(constraint) {
    if (typeof constraint !== 'string') return null;
    constraint = constraint.trim();
    if (constraint === '*' || constraint === '') {
      return { ranges: [{ min: { major: 0, minor: 0, patch: 0, prerelease: null }, max: null, minExclusive: false, maxExclusive: false }] };
    }
    var parts = constraint.split(/\s*\|\|\s*/);
    var ranges = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;
      var range = parseRange(part);
      if (range) ranges.push(range);
    }
    if (ranges.length === 0) return null;
    return { ranges: ranges };
  }

  function parseRange(range) {
    range = range.trim();
    if (range === '*' || range === '') {
      return { min: { major: 0, minor: 0, patch: 0, prerelease: null }, max: null, minExclusive: false, maxExclusive: false };
    }
    // Caret: ^1.2.3 = >=1.2.3 <2.0.0
    if (range[0] === '^') {
      var v = parseSemver(range.substring(1));
      if (!v) return null;
      var max = v.major > 0 ? { major: v.major + 1, minor: 0, patch: 0, prerelease: null } : v.minor > 0 ? { major: 0, minor: v.minor + 1, patch: 0, prerelease: null } : { major: 0, minor: 0, patch: v.patch + 1, prerelease: null };
      return { min: v, max: max, minExclusive: false, maxExclusive: true };
    }
    // Tilde: ~1.2.3 = >=1.2.3 <1.3.0
    if (range[0] === '~') {
      var v2 = parseSemver(range.substring(1));
      if (!v2) return null;
      return { min: v2, max: { major: v2.major, minor: v2.minor + 1, patch: 0, prerelease: null }, minExclusive: false, maxExclusive: true };
    }
    // >=, >, <=, <, =
    var m = range.match(/^(>=|<=|>|<|=|)(\d+\.\d+\.\d+.*)$/);
    if (m) {
      var op = m[1];
      var vv = parseSemver(m[2]);
      if (!vv) return null;
      if (op === '>=' || op === '=') {
        return { min: vv, max: null, minExclusive: false, maxExclusive: false };
      } else if (op === '>') {
        return { min: vv, max: null, minExclusive: true, maxExclusive: false };
      } else if (op === '<=') {
        return { min: { major: 0, minor: 0, patch: 0, prerelease: null }, max: vv, minExclusive: false, maxExclusive: false };
      } else if (op === '<') {
        return { min: { major: 0, minor: 0, patch: 0, prerelease: null }, max: vv, minExclusive: false, maxExclusive: true };
      }
    }
    // exact version
    var exact = parseSemver(range);
    if (exact) {
      return { min: exact, max: exact, minExclusive: false, maxExclusive: false };
    }
    return null;
  }

  function bump(version, type) {
    var v = typeof version === 'string' ? parseSemver(version) : version;
    if (!v) return null;
    var newV = { major: v.major, minor: v.minor, patch: v.patch, prerelease: null };
    if (type === BUMP_TYPE.MAJOR) {
      newV.major++;
      newV.minor = 0;
      newV.patch = 0;
    } else if (type === BUMP_TYPE.MINOR) {
      newV.minor++;
      newV.patch = 0;
    } else if (type === BUMP_TYPE.PATCH) {
      newV.patch++;
    } else {
      return null;
    }
    return formatSemver(newV);
  }

  function formatSemver(v) {
    var s = v.major + '.' + v.minor + '.' + v.patch;
    if (v.prerelease) s += '-' + v.prerelease;
    return s;
  }

  // ---- PluginVersion manager ----
  function PluginVersion(options) {
    options = options || {};
    this.versions = {};  // pluginId -> [{version, ts}]
    this.current = {};  // pluginId -> current version
    this.compatibility = {};  // pluginId -> {min, max}
  }

  PluginVersion.prototype.register = function (pluginId, version) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    var v = typeof version === 'string' ? parseSemver(version) : version;
    if (!v) return { error: 'invalid_version' };
    if (!this.versions[pluginId]) this.versions[pluginId] = [];
    // dedup
    for (var i = 0; i < this.versions[pluginId].length; i++) {
      if (this.versions[pluginId][i].raw === v.raw) {
        return { error: 'duplicate_version' };
      }
    }
    var entry = { version: v, raw: v.raw, ts: Date.now() };
    this.versions[pluginId].push(entry);
    // sort by version
    this.versions[pluginId].sort(function (a, b) { return compareSemver(a.version, b.version); });
    if (!this.current[pluginId]) this.current[pluginId] = v.raw;
    return { success: true, entry: entry };
  };

  PluginVersion.prototype.setCurrent = function (pluginId, version) {
    if (!this.versions[pluginId]) return { error: 'not_registered' };
    var v = typeof version === 'string' ? parseSemver(version) : version;
    if (!v) return { error: 'invalid_version' };
    // check exists (any registered version, by semver not by raw string)
    var found = false;
    for (var i = 0; i < this.versions[pluginId].length; i++) {
      if (this.versions[pluginId][i].raw === v.raw) { found = true; break; }
    }
    if (!found) return { error: 'version_not_found' };
    this.current[pluginId] = v.raw;
    return { success: true };
  };

  PluginVersion.prototype._hasVersion = function (pluginId, version) {
    var v = typeof version === 'string' ? parseSemver(version) : version;
    if (!v) return null;
    var arr = this.versions[pluginId];
    if (!arr) return null;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].raw === v.raw) return arr[i];
    }
    return null;
  };

  PluginVersion.prototype.getCurrent = function (pluginId) {
    return this.current[pluginId] || null;
  };

  PluginVersion.prototype.list = function (pluginId) {
    return (this.versions[pluginId] || []).map(function (e) { return e.raw; });
  };

  PluginVersion.prototype.getLatest = function (pluginId) {
    var vs = this.versions[pluginId];
    if (!vs || vs.length === 0) return null;
    return vs[vs.length - 1].raw;
  };

  PluginVersion.prototype.latestSatisfying = function (pluginId, constraint) {
    var vs = this.versions[pluginId];
    if (!vs || vs.length === 0) return null;
    for (var i = vs.length - 1; i >= 0; i--) {
      if (satisfiesConstraint(vs[i].version, constraint)) return vs[i].raw;
    }
    return null;
  };

  PluginVersion.prototype.satisfies = function (pluginId, constraint) {
    var cur = this.current[pluginId];
    if (!cur) return false;
    return satisfiesConstraint(cur, constraint);
  };

  PluginVersion.prototype.isCompatible = function (pluginId, version) {
    var comp = this.compatibility[pluginId];
    if (!comp) return true;
    return satisfiesConstraint(version, comp.min || '*') && satisfiesConstraint(version, comp.max || '*');
  };

  PluginVersion.prototype.setCompatibility = function (pluginId, minVersion, maxVersion) {
    this.compatibility[pluginId] = { min: minVersion || '*', max: maxVersion || '*' };
    return { success: true };
  };

  PluginVersion.prototype.bump = function (pluginId, type) {
    var cur = this.current[pluginId];
    if (!cur) return { error: 'no_current_version' };
    var newVer = bump(cur, type);
    if (!newVer) return { error: 'invalid_bump_type' };
    return this.register(pluginId, newVer);
  };

  PluginVersion.prototype.upgradePath = function (pluginId, target) {
    var vs = this.versions[pluginId];
    if (!vs) return { error: 'not_registered' };
    var cur = this.current[pluginId];
    if (!cur) return { error: 'no_current' };
    var curV = parseSemver(cur);
    var tarV = parseSemver(target);
    if (!tarV) return { error: 'invalid_target' };
    var path = [];
    for (var i = 0; i < vs.length; i++) {
      if (compareSemver(vs[i].version, curV) > 0 && compareSemver(vs[i].version, tarV) <= 0) {
        path.push(vs[i].raw);
      }
    }
    return { success: true, from: cur, to: target, path: path };
  };

  PluginVersion.prototype.compareVersions = function (a, b) {
    var va = parseSemver(a);
    var vb = parseSemver(b);
    if (!va || !vb) return null;
    return compareSemver(va, vb);
  };

  PluginVersion.prototype.isNewer = function (a, b) {
    return this.compareVersions(a, b) > 0;
  };

  PluginVersion.prototype.isOlder = function (a, b) {
    return this.compareVersions(a, b) < 0;
  };

  PluginVersion.prototype.clear = function () {
    this.versions = {};
    this.current = {};
    this.compatibility = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.PluginVersion = PluginVersion;
    window.BUMP_TYPE = BUMP_TYPE;
    window.parseSemver = parseSemver;
    window.compareSemver = compareSemver;
    window.satisfiesConstraint = satisfiesConstraint;
    window.bump = bump;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PluginVersion: PluginVersion, BUMP_TYPE: BUMP_TYPE, parseSemver: parseSemver, compareSemver: compareSemver, satisfiesConstraint: satisfiesConstraint, bump: bump };
  }
})();
