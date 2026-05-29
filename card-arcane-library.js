// ============================================================================
// Card Arcane Library — V198 Direction C
// Arcane library with book collection, spell research, and knowledge archives
// thunderbolt feedback loops + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // ArcaneBook: A magical book in the library
  // -----------------------------------------------------------------------
  function ArcaneBook(bookId, title, author, pages, rarity, subject) {
    this.bookId = bookId;
    this.title = title || bookId;
    this.author = author || 'Unknown';
    this.pages = pages || 100;
    this.rarity = rarity || 'common'; // common, uncommon, rare, epic, legendary
    this.subject = subject || 'general'; // general, spell, lore, history, alchemy
    this.readCount = 0;
    this.lastReadAt = null;
    this.digitized = false;
    this.checkedOut = false;
  }

  ArcaneBook.prototype.read = function () {
    this.readCount++;
    this.lastReadAt = Date.now();
    return { success: true, readCount: this.readCount, knowledge: this._computeKnowledge() };
  };

  ArcaneBook.prototype._computeKnowledge = function () {
    var rarityMult = { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 16 };
    return Math.floor(this.pages * (rarityMult[this.rarity] || 1) * 0.1);
  };

  ArcaneBook.prototype.getKnowledgeYield = function () { return this._computeKnowledge(); };

  ArcaneBook.prototype.digitize = function () {
    if (this.digitized) return { error: 'already_digitized' };
    this.digitized = true;
    return { success: true };
  };

  // -----------------------------------------------------------------------
  // SpellResearch: Research on a spell topic
  // -----------------------------------------------------------------------
  function SpellResearch(researchId, topic, priority, funding, progress) {
    this.researchId = researchId;
    this.topic = topic || 'general';
    this.priority = priority || 1; // 1-5
    this.funding = funding || 100; // gold allocated
    this.progress = progress || 0; // 0-100
    this.active = true;
    this.completed = false;
    this.findings = [];
  }

  SpellResearch.prototype.allocateFunds = function (amount) {
    this.funding += amount;
    return { success: true, funding: this.funding };
  };

  SpellResearch.prototype.conduct = function (cycles) {
    if (!this.active) return { error: 'research_inactive' };
    if (this.completed) return { error: 'already_completed' };
    var increment = Math.floor(this.funding * 0.05 * cycles * this.priority);
    this.progress = Math.min(100, this.progress + increment);
    if (this.progress >= 100) {
      this.completed = true;
      this.active = false;
    }
    return { success: true, progress: this.progress, completed: this.completed };
  };

  SpellResearch.prototype.addFinding = function (finding) {
    this.findings.push({ finding: finding, timestamp: Date.now() });
    return { success: true, findingCount: this.findings.length };
  };

  SpellResearch.prototype.getCompletionPercent = function () { return this.progress; };

  // -----------------------------------------------------------------------
  // KnowledgeArchive: Archive of knowledge
  // -----------------------------------------------------------------------
  function KnowledgeArchive(archiveId, name, maxCapacity, accessionNumber) {
    this.archiveId = archiveId;
    this.name = name || archiveId;
    this.maxCapacity = maxCapacity || 50;
    this.accessionNumber = accessionNumber || 0;
    this.catalog = {}; // bookId -> ArcaneBook
    this.researchProjects = {};
    this.totalKnowledge = 0;
  }

  KnowledgeArchive.prototype.addBook = function (book) {
    if (Object.keys(this.catalog).length >= this.maxCapacity) return { error: 'archive_full' };
    this.catalog[book.bookId] = book;
    this.accessionNumber++;
    return { success: true, accession: this.accessionNumber };
  };

  KnowledgeArchive.prototype.checkoutBook = function (bookId) {
    var book = this.catalog[bookId];
    if (!book) return { error: 'book_not_found' };
    if (book.checkedOut) return { error: 'already_checked_out' };
    book.checkedOut = true;
    return { success: true, title: book.title };
  };

  KnowledgeArchive.prototype.returnBook = function (bookId) {
    var book = this.catalog[bookId];
    if (!book) return { error: 'book_not_found' };
    if (!book.checkedOut) return { error: 'not_checked_out' };
    book.checkedOut = false;
    return { success: true };
  };

  KnowledgeArchive.prototype.readBook = function (bookId) {
    var book = this.catalog[bookId];
    if (!book) return { error: 'book_not_found' };
    if (!book.checkedOut) return { error: 'not_checked_out' };
    var r = book.read();
    this.totalKnowledge += r.knowledge;
    return r;
  };

  KnowledgeArchive.prototype.getTotalKnowledge = function () { return this.totalKnowledge; };

  KnowledgeArchive.prototype.getCatalogCount = function () { return Object.keys(this.catalog).length; };

  // -----------------------------------------------------------------------
  // ArcaneLibrary: Main library manager
  // -----------------------------------------------------------------------
  function ArcaneLibrary(libraryId, name) {
    this.libraryId = libraryId || ('lib_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Arcane Library';
    this.archives = {};
    this.researchProjects = {};
    this.books = {};
    this.archiveCounter = 0;
    this.bookCounter = 0;
    this.researchCounter = 0;
    this._seedDefault();
  }

  ArcaneLibrary.prototype._seedDefault = function () {
    var archive = new KnowledgeArchive('archive_default', 'Main Archive', 100, 0);
    this.archives['archive_default'] = archive;
  };

  ArcaneLibrary.prototype.addBookToCatalog = function (book) {
    this.books[book.bookId] = book;
    return { success: true, count: Object.keys(this.books).length };
  };

  ArcaneLibrary.prototype.addArchive = function (archive) {
    this.archives[archive.archiveId] = archive;
    return { success: true, count: Object.keys(this.archives).length };
  };

  ArcaneLibrary.prototype.addResearch = function (research) {
    this.researchProjects[research.researchId] = research;
    return { success: true, count: Object.keys(this.researchProjects).length };
  };

  ArcaneLibrary.prototype.getArchive = function (id) { return this.archives[id] || null; };
  ArcaneLibrary.prototype.getResearch = function (id) { return this.researchProjects[id] || null; };

  ArcaneLibrary.prototype.getAllArchives = function () {
    return Object.keys(this.archives).map(function (k) { return this.archives[k]; }.bind(this));
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.ArcaneBook = ArcaneBook;
  window.SpellResearch = SpellResearch;
  window.KnowledgeArchive = KnowledgeArchive;
  window.ArcaneLibrary = ArcaneLibrary;
})();