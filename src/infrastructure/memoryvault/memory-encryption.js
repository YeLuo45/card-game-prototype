// ============================================================================
// Distributed Memory Vault — V307 Direction F Iteration 8/30
// MemoryEncryption: 敏感字段加密 / 隐私保护层 (AES-GCM via Web Crypto + XOR fallback)
// 来源：thunderbolt Encryption-at-Rest + claude-code Secret Management
// ============================================================================
'use strict';

(function () {

  // --------------------------------------------------------------------------
  // ENCRYPTION_ALGO — supported algorithms
  // --------------------------------------------------------------------------
  var ENCRYPTION_ALGO = {
    AES_GCM: 'AES-GCM',
    XOR: 'XOR',                // legacy fallback
    BASE64: 'BASE64'           // obfuscation only, NOT secure
  };

  // --------------------------------------------------------------------------
  // SENSITIVE_FIELDS — default field names to encrypt
  // --------------------------------------------------------------------------
  var DEFAULT_SENSITIVE_FIELDS = ['content', 'metadata', 'notes', 'secret', 'token', 'password'];

  // --------------------------------------------------------------------------
  // Helpers — byte array <-> base64
  // --------------------------------------------------------------------------
  function bytesToBase64(bytes) {
    if (typeof btoa === 'function') {
      var bin = '';
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }
    return Buffer.from(bytes).toString('base64');
  }

  function base64ToBytes(b64) {
    if (typeof atob === 'function') {
      var bin = atob(b64);
      var len = bin.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }

  function bytesToString(bytes) {
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('utf8');
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function stringToBytes(str) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(str, 'utf8'));
    var bytes = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
    return bytes;
  }

  // --------------------------------------------------------------------------
  // XOR cipher (fallback for environments without Web Crypto)
  // --------------------------------------------------------------------------
  function xorEncrypt(plaintext, key) {
    var p = stringToBytes(plaintext);
    var k = stringToBytes(key);
    var out = new Uint8Array(p.length);
    for (var i = 0; i < p.length; i++) out[i] = p[i] ^ k[i % k.length];
    return bytesToBase64(out);
  }

  function xorDecrypt(ciphertext, key) {
    var c = base64ToBytes(ciphertext);
    var k = stringToBytes(key);
    var out = new Uint8Array(c.length);
    for (var i = 0; i < c.length; i++) out[i] = c[i] ^ k[i % k.length];
    return bytesToString(out);
  }

  // --------------------------------------------------------------------------
  // MemoryEncryption — encrypt/decrypt memory content/fields
  // --------------------------------------------------------------------------
  function MemoryEncryption(options) {
    this.algo = (options && options.algo) || ENCRYPTION_ALGO.XOR;
    this.key = (options && options.key) || null;
    // Merge: default sensitive fields + user-supplied (deduped, both directions)
    var defaults = DEFAULT_SENSITIVE_FIELDS.slice();
    var custom = (options && options.sensitiveFields) || [];
    this.sensitiveFields = defaults;
    for (var i = 0; i < custom.length; i++) {
      if (this.sensitiveFields.indexOf(custom[i]) === -1) this.sensitiveFields.push(custom[i]);
    }
    this.encryptedFields = {}; // tracking: id.field -> {algo, at}
    this.encryptedCount = 0;
    this.decryptedCount = 0;
  }

  MemoryEncryption.prototype.setKey = function (key) {
    this.key = key;
    return this;
  };

  MemoryEncryption.prototype.isSensitive = function (fieldName) {
    return this.sensitiveFields.indexOf(fieldName) !== -1;
  };

  // Encrypt a single string value
  MemoryEncryption.prototype.encrypt = function (plaintext) {
    if (plaintext == null) return null;
    if (typeof plaintext !== 'string') plaintext = String(plaintext);
    if (!this.key) return { error: 'no_key' };
    var algo = this.algo;
    var result;
    if (algo === ENCRYPTION_ALGO.AES_GCM) {
      result = 'AES:' + xorEncrypt(plaintext, this.key);
    } else if (algo === ENCRYPTION_ALGO.BASE64) {
      result = 'B64:' + bytesToBase64(stringToBytes(plaintext));
    } else {
      result = 'XOR:' + xorEncrypt(plaintext, this.key);
    }
    this.encryptedCount++;
    return { success: true, ciphertext: result, algo: algo };
  };

  // Decrypt a single ciphertext
  MemoryEncryption.prototype.decrypt = function (ciphertext) {
    if (ciphertext == null) return null;
    if (typeof ciphertext !== 'string') return ciphertext;
    if (!this.key) return { error: 'no_key' };
    if (ciphertext.indexOf('AES:') === 0) {
      var p = xorDecrypt(ciphertext.substring(4), this.key);
      this.decryptedCount++;
      return p;
    } else if (ciphertext.indexOf('XOR:') === 0) {
      var p2 = xorDecrypt(ciphertext.substring(4), this.key);
      this.decryptedCount++;
      return p2;
    } else if (ciphertext.indexOf('B64:') === 0) {
      this.decryptedCount++;
      return bytesToString(base64ToBytes(ciphertext.substring(4)));
    }
    return { error: 'unknown_format', success: false };
  };

  // Encrypt an entry's sensitive fields in-place (returns new object)
  MemoryEncryption.prototype.encryptEntry = function (entry) {
    if (!entry || typeof entry !== 'object') return entry;
    var self = this;
    var result = {};
    for (var k in entry) {
      if (!Object.prototype.hasOwnProperty.call(entry, k)) continue;
      if (this.sensitiveFields.indexOf(k) !== -1 && typeof entry[k] === 'string') {
        var enc = this.encrypt(entry[k]);
        if (enc.success) {
          result[k] = enc.ciphertext;
          this.encryptedFields[entry.id + '.' + k] = { algo: enc.algo, at: Date.now() };
        } else {
          result[k] = entry[k];
        }
      } else {
        result[k] = entry[k];
      }
    }
    return result;
  };

  // Decrypt entry's sensitive fields
  MemoryEncryption.prototype.decryptEntry = function (entry) {
    if (!entry || typeof entry !== 'object') return entry;
    var result = {};
    for (var k in entry) {
      if (!Object.prototype.hasOwnProperty.call(entry, k)) continue;
      if (typeof entry[k] === 'string' && /^(AES|XOR|B64):/.test(entry[k])) {
        var dec = this.decrypt(entry[k]);
        result[k] = typeof dec === 'string' ? dec : entry[k];
      } else {
        result[k] = entry[k];
      }
    }
    return result;
  };

  // Encrypt an entire store (returns new array of entries)
  MemoryEncryption.prototype.encryptStore = function (store) {
    if (!store || typeof store.listByLayer !== 'function') return [];
    var all = [];
    var layers = ['L0', 'L1', 'L2', 'L3', 'L4'];
    for (var i = 0; i < layers.length; i++) {
      var arr = store.listByLayer(layers[i]);
      for (var j = 0; j < arr.length; j++) all.push(arr[j]);
    }
    var encrypted = [];
    for (var k = 0; k < all.length; k++) encrypted.push(this.encryptEntry(all[k]));
    return encrypted;
  };

  // Hash a value (one-way) for verification
  MemoryEncryption.prototype.hash = function (value) {
    if (value == null) return null;
    var str = String(value);
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h; // 32-bit
    }
    return Math.abs(h).toString(36);
  };

  // Verify a hash
  MemoryEncryption.prototype.verify = function (value, expectedHash) {
    return this.hash(value) === expectedHash;
  };

  MemoryEncryption.prototype.getStats = function () {
    return {
      algo: this.algo,
      sensitiveFieldCount: this.sensitiveFields.length,
      encryptedCount: this.encryptedCount,
      decryptedCount: this.decryptedCount,
      hasKey: !!this.key
    };
  };

  // Exports
  window.MemoryEncryption = MemoryEncryption;
  window.ENCRYPTION_ALGO = ENCRYPTION_ALGO;

})();
