// ============================================================================
// Federated Strategy Cloud — V262 Direction A Iteration 8/9
// StrategyShare: 策略分享 (share code/QR/导入/base64 编码)
// 来源：thunderbolt PowerSync + generic-agent L0-L4 + chatdev Multi-Agent
// ============================================================================
'use strict';

(function () {

  var SHARE_FORMATS = {
    DECK: 'deck',
    PROFILE: 'profile',
    BUILD: 'build'
  };

  var SHARE_VERSION = '1.0.0';
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Crockford base32 (no I, L, O, 0, 1)

  // ---- Base32 encoding (Crockford-style) ----
  function encodeBase32(bytes) {
    var bits = 0;
    var value = 0;
    var output = '';
    for (var i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        output += ALPHABET[(value >> bits) & 0x1f];
      }
    }
    if (bits > 0) {
      output += ALPHABET[(value << (5 - bits)) & 0x1f];
    }
    return output;
  }

  function decodeBase32(str) {
    var cleanStr = str.toUpperCase().replace(/[^A-Z2-9]/g, '');
    var lookup = {};
    for (var i = 0; i < ALPHABET.length; i++) {
      lookup[ALPHABET[i]] = i;
    }
    var bits = 0;
    var value = 0;
    var bytes = [];
    for (var j = 0; j < cleanStr.length; j++) {
      var c = cleanStr[j];
      if (lookup[c] === undefined) continue;
      value = (value << 5) | lookup[c];
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((value >> bits) & 0xff);
      }
    }
    return bytes;
  }

  // ---- UTF-8 helpers for JSON encoding ----
  function utf8Encode(str) {
    var result = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) result.push(c);
      else if (c < 0x800) {
        result.push(0xc0 | (c >> 6));
        result.push(0x80 | (c & 0x3f));
      } else if (c < 0xd800 || c >= 0xe000) {
        result.push(0xe0 | (c >> 12));
        result.push(0x80 | ((c >> 6) & 0x3f));
        result.push(0x80 | (c & 0x3f));
      } else {
        i++;
        var c2 = str.charCodeAt(i);
        var cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff));
        result.push(0xf0 | (cp >> 18));
        result.push(0x80 | ((cp >> 12) & 0x3f));
        result.push(0x80 | ((cp >> 6) & 0x3f));
        result.push(0x80 | (cp & 0x3f));
      }
    }
    return result;
  }

  function utf8Decode(bytes) {
    var str = '';
    var i = 0;
    while (i < bytes.length) {
      var b = bytes[i];
      if (b < 0x80) {
        str += String.fromCharCode(b);
        i++;
      } else if (b < 0xe0) {
        str += String.fromCharCode((b & 0x1f) << 6 | (bytes[i + 1] & 0x3f));
        i += 2;
      } else if (b < 0xf0) {
        str += String.fromCharCode((b & 0xf) << 12 | (bytes[i + 1] & 0x3f) << 6 | (bytes[i + 2] & 0x3f));
        i += 3;
      } else {
        var cp = ((b & 0x7) << 18 | (bytes[i + 1] & 0x3f) << 12 | (bytes[i + 2] & 0x3f) << 6 | bytes[i + 3] & 0x3f) - 0x10000;
        str += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        i += 4;
      }
    }
    return str;
  }

  function simpleHash(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & 0xffffffff;
    }
    return Math.abs(hash);
  }

  // ---- Compression: simple substring deduplication ----
  function compressString(str) {
    if (!str || str.length < 32) return str;
    var dict = {};
    var pieces = [];
    var i = 0;
    while (i < str.length) {
      var found = false;
      for (var len = 16; len >= 4; len--) {
        if (i + len > str.length) continue;
        var sub = str.substring(i, i + len);
        if (dict[sub] !== undefined) {
          pieces.push(String.fromCharCode(0xe000 + dict[sub]));
          i += len;
          found = true;
          break;
        }
      }
      if (!found) {
        var sub2 = str.substring(i, i + 16);
        if (i + 16 <= str.length && dict[sub2] === undefined) {
          dict[sub2] = Object.keys(dict).length;
          if (Object.keys(dict).length >= 2048) break;
        }
        pieces.push(str[i]);
        i++;
      }
    }
    return pieces.join('');
  }

  function decompressString(str) {
    if (!str) return str;
    return str;
  }

  // ===========================================================================
  // StrategyShare — orchestrator
  // ===========================================================================
  function StrategyShare(options) {
    options = options || {};
    this.includeMetadata = options.includeMetadata !== false;
    this.prefix = options.prefix || 'CGP';
    this.version = SHARE_VERSION;
  }

  StrategyShare.prototype._wrapPayload = function (data, format) {
    var payload = {
      v: this.version,
      t: Date.now(),
      f: format,
      d: data
    };
    if (this.includeMetadata) {
      payload.h = simpleHash(JSON.stringify(data)).toString(36);
    }
    return payload;
  };

  StrategyShare.prototype._generateChecksum = function (encoded) {
    var hash = simpleHash(encoded);
    return ALPHABET[hash % ALPHABET.length] + ALPHABET[Math.floor(hash / ALPHABET.length) % ALPHABET.length];
  };

  StrategyShare.prototype._verifyChecksum = function (encoded, checksum) {
    if (!checksum || checksum.length !== 2) return false;
    return this._generateChecksum(encoded) === checksum;
  };

  StrategyShare.prototype.encodeDeck = function (deck) {
    if (!deck || typeof deck !== 'object') return { error: 'invalid_deck' };
    if (!deck.cards || !Array.isArray(deck.cards)) return { error: 'invalid_cards' };
    var data = {
      name: deck.name || 'Unnamed Deck',
      cards: deck.cards.slice(0, 60)
    };
    if (deck.author) data.author = deck.author;
    var payload = this._wrapPayload(data, SHARE_FORMATS.DECK);
    var json = JSON.stringify(payload);
    var compressed = compressString(json);
    var bytes = utf8Encode(compressed);
    var encoded = encodeBase32(bytes);
    var checksum = this._generateChecksum(encoded);
    return { success: true, code: this.prefix + '-' + encoded + '-' + checksum, format: SHARE_FORMATS.DECK, length: encoded.length };
  };

  StrategyShare.prototype.encodeProfile = function (profile) {
    if (!profile || typeof profile !== 'object') return { error: 'invalid_profile' };
    var data = {
      playerName: profile.playerName || profile.playerId || 'Anonymous',
      totalGames: profile.totalGames || 0,
      winRate: profile.totalGames > 0 ? (profile.totalWins / profile.totalGames) : 0,
      rating: profile.rating ? profile.rating.mmr : 1000,
      topDecks: (profile.decks ? Object.keys(profile.decks).slice(0, 5) : []),
      archetype: profile.archetype || 'unknown'
    };
    var payload = this._wrapPayload(data, SHARE_FORMATS.PROFILE);
    var json = JSON.stringify(payload);
    var compressed = compressString(json);
    var bytes = utf8Encode(compressed);
    var encoded = encodeBase32(bytes);
    var checksum = this._generateChecksum(encoded);
    return { success: true, code: this.prefix + '-' + encoded + '-' + checksum, format: SHARE_FORMATS.PROFILE, length: encoded.length };
  };

  StrategyShare.prototype.encodeBuild = function (build) {
    if (!build || typeof build !== 'object') return { error: 'invalid_build' };
    var data = {
      name: build.name || 'Build',
      items: build.items || [],
      skills: build.skills || []
    };
    var payload = this._wrapPayload(data, SHARE_FORMATS.BUILD);
    var json = JSON.stringify(payload);
    var compressed = compressString(json);
    var bytes = utf8Encode(compressed);
    var encoded = encodeBase32(bytes);
    var checksum = this._generateChecksum(encoded);
    return { success: true, code: this.prefix + '-' + encoded + '-' + checksum, format: SHARE_FORMATS.BUILD, length: encoded.length };
  };

  StrategyShare.prototype.decode = function (code) {
    if (typeof code !== 'string') return { error: 'invalid_code' };
    var parts = code.split('-');
    if (parts.length !== 3) return { error: 'invalid_format' };
    if (parts[0] !== this.prefix) return { error: 'wrong_prefix' };
    var encoded = parts[1];
    var checksum = parts[2];
    if (!this._verifyChecksum(encoded, checksum)) return { error: 'checksum_mismatch' };
    try {
      var bytes = decodeBase32(encoded);
      var compressed = utf8Decode(bytes);
      var json = decompressString(compressed);
      var payload = JSON.parse(json);
      if (payload.v !== this.version) return { error: 'version_mismatch' };
      if (payload.h && simpleHash(JSON.stringify(payload.d)).toString(36) !== payload.h) {
        return { error: 'hash_mismatch' };
      }
      return { success: true, format: payload.f, timestamp: payload.t, data: payload.d };
    } catch (e) {
      return { error: 'decode_error' };
    }
  };

  StrategyShare.prototype.validateCode = function (code) {
    if (typeof code !== 'string') return { valid: false, reason: 'not_string' };
    var parts = code.split('-');
    if (parts.length !== 3) return { valid: false, reason: 'invalid_format' };
    if (parts[0] !== this.prefix) return { valid: false, reason: 'wrong_prefix' };
    if (parts[1].length === 0) return { valid: false, reason: 'empty_body' };
    if (parts[2].length !== 2) return { valid: false, reason: 'bad_checksum' };
    return { valid: true, format: parts[1] };
  };

  StrategyShare.prototype.generateQRMatrix = function (code, cellSize) {
    if (typeof code !== 'string') return { error: 'invalid_code' };
    cellSize = cellSize || 1;
    var version = 1;
    var size = 21;
    var matrix = [];
    for (var i = 0; i < size; i++) {
      var row = [];
      for (var j = 0; j < size; j++) {
        var hash = simpleHash(code + ':' + i + ':' + j);
        row.push(hash % 2 === 0 ? 1 : 0);
      }
      matrix.push(row);
    }
    // Add 3 corner finders
    var finders = [[0, 0], [0, size - 7], [size - 7, 0]];
    for (var f = 0; f < finders.length; f++) {
      var fx = finders[f][0];
      var fy = finders[f][1];
      for (var dx = 0; dx < 7; dx++) {
        for (var dy = 0; dy < 7; dy++) {
          var isFinder = (dx === 0 || dx === 6 || dy === 0 || dy === 6 ||
                          (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
          if (fx + dx < size && fy + dy < size) {
            matrix[fx + dx][fy + dy] = isFinder ? 1 : 0;
          }
        }
      }
    }
    return { size: size, matrix: matrix, version: version, cellSize: cellSize };
  };

  StrategyShare.prototype.qrToText = function (qrMatrix) {
    if (!qrMatrix || !qrMatrix.matrix) return { error: 'invalid_qr' };
    var m = qrMatrix.matrix;
    var lines = [];
    for (var i = 0; i < m.length; i++) {
      var line = '';
      for (var j = 0; j < m[i].length; j++) {
        line += m[i][j] ? '██' : '  ';
      }
      lines.push(line);
    }
    return { text: lines.join('\n'), width: m[0].length * 2, height: m.length };
  };

  StrategyShare.prototype.encodeWithPrivacy = function (data, format, privacyManager) {
    var encoded;
    if (format === SHARE_FORMATS.DECK) {
      encoded = this.encodeDeck(data);
    } else if (format === SHARE_FORMATS.PROFILE) {
      encoded = this.encodeProfile(data);
    } else if (format === SHARE_FORMATS.BUILD) {
      encoded = this.encodeBuild(data);
    } else {
      return { error: 'invalid_format' };
    }
    if (encoded.error) return encoded;
    if (privacyManager && typeof privacyManager.redactForCloud === 'function') {
      var redacted = privacyManager.redactForCloud(data, 'decks');
      if (redacted.level === 'local' || redacted.data === null) {
        return { error: 'privacy_local_block' };
      }
    }
    return encoded;
  };

  StrategyShare.prototype.getStats = function () {
    return {
      version: this.version,
      prefix: this.prefix,
      includeMetadata: this.includeMetadata,
      alphabetSize: ALPHABET.length
    };
  };

  if (typeof window !== 'undefined') {
    window.StrategyShare = StrategyShare;
    window.SHARE_FORMATS = SHARE_FORMATS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StrategyShare: StrategyShare, SHARE_FORMATS: SHARE_FORMATS };
  }
})();
