// ============================================================================
// Card Trading Post — V127 Direction U
// ============================================================================
// Decentralized card/deck marketplace: listing, offers, trade matching.
// nanobot distributed mesh (trade routing) + thunderbolt offline-first.
// ============================================================================

'use strict';

class TradeListing {
  constructor(listingId, sellerId, itemType, itemId, wanted, price) {
    this.listingId = listingId;
    this.sellerId = sellerId;
    this.itemType = itemType; // 'card' | 'deck'
    this.itemId = itemId;
    this.wanted = wanted; // { type: 'gold' | 'card' | 'deck', id: string, amount: number }
    this.price = price; // gold
    this.status = 'active'; // 'active' | 'completed' | 'cancelled'
    this.offers = []; // { offerId, buyerId, offerPrice, timestamp }
    this.createdAt = Date.now();
  }

  addOffer(offerId, buyerId, offerPrice) {
    if (this.status !== 'active') return null;
    this.offers.push({ offerId, buyerId, offerPrice, timestamp: Date.now() });
    return this;
  }

  acceptOffer(offerId) {
    const offer = this.offers.find(o => o.offerId === offerId);
    if (!offer) return { error: 'offer_not_found' };
    this.status = 'completed';
    this.closedAt = Date.now();
    return { success: true, acceptedOffer: offer };
  }

  cancel() { this.status = 'cancelled'; this.closedAt = Date.now(); }
}

class TradingPost {
  constructor() {
    this.listings = new Map(); // listingId → TradeListing
    this.transactions = []; // { listingId, sellerId, buyerId, price, timestamp }
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('trading_post') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [lid, ldata] of Object.entries(data.listings || {})) {
          const t = new TradeListing(ldata.listingId, ldata.sellerId, ldata.itemType, ldata.itemId, ldata.wanted, ldata.price);
          t.status = ldata.status || 'active';
          t.offers = ldata.offers || [];
          t.createdAt = ldata.createdAt || Date.now();
          t.closedAt = ldata.closedAt || null;
          this.listings.set(lid, t);
        }
        this.transactions = data.transactions || [];
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        listings: Object.fromEntries(Array.from(this.listings.entries()).map(([k, v]) => [k, { listingId: v.listingId, sellerId: v.sellerId, itemType: v.itemType, itemId: v.itemId, wanted: v.wanted, price: v.price, status: v.status, offers: v.offers, createdAt: v.createdAt, closedAt: v.closedAt }])),
        transactions: this.transactions
      };
      localStorage.setItem('trading_post', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  createListing(sellerId, itemType, itemId, wanted, price) {
    const listingId = `listing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const listing = new TradeListing(listingId, sellerId, itemType, itemId, wanted, price);
    this.listings.set(listingId, listing);
    this._save();
    this._emit('listing_created', { listingId, sellerId, itemType });
    return listing;
  }

  makeOffer(listingId, buyerId, offerPrice) {
    const listing = this.listings.get(listingId);
    if (!listing) return { error: 'listing_not_found' };
    const offerId = `offer_${Date.now()}`;
    listing.addOffer(offerId, buyerId, offerPrice);
    this._save();
    this._emit('offer_made', { listingId, offerId, buyerId, offerPrice });
    return { offerId, offerPrice };
  }

  acceptOffer(listingId, offerId) {
    const listing = this.listings.get(listingId);
    if (!listing) return { error: 'listing_not_found' };
    const result = listing.acceptOffer(offerId);
    if (result.error) return result;
    this.transactions.push({ listingId, sellerId: listing.sellerId, buyerId: result.acceptedOffer.buyerId, price: result.acceptedOffer.offerPrice, timestamp: Date.now() });
    this._save();
    this._emit('trade_completed', { listingId, offerId });
    return result;
  }

  cancelListing(listingId) {
    const listing = this.listings.get(listingId);
    if (!listing) return { error: 'listing_not_found' };
    listing.cancel();
    this._save();
    return { success: true };
  }

  getListing(listingId) { return this.listings.get(listingId) || null; }

  searchListings(criteria) {
    let results = Array.from(this.listings.values()).filter(l => l.status === 'active');
    if (criteria && criteria.itemType) results = results.filter(l => l.itemType === criteria.itemType);
    if (criteria && criteria.maxPrice) results = results.filter(l => l.price <= criteria.maxPrice);
    if (criteria && criteria.sellerId) results = results.filter(l => l.sellerId === criteria.sellerId);
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  getMarketStats() {
    const active = Array.from(this.listings.values()).filter(l => l.status === 'active').length;
    const completed = this.transactions.length;
    const totalVolume = this.transactions.reduce((sum, t) => sum + t.price, 0);
    return { activeListings: active, totalTransactions: completed, totalVolume };
  }
}

const TradingPostTools = {
  'trade.create': {
    description: 'Create a trade listing',
    parameters: { type: 'object', properties: { sellerId: { type: 'string' }, itemType: { type: 'string' }, itemId: { type: 'string' }, wanted: { type: 'object' }, price: { type: 'number' } }, required: ['sellerId', 'itemType', 'itemId', 'price'] },
    handler(args) {
      if (!window._tradingPost) window._tradingPost = new TradingPost();
      return window._tradingPost.createListing(args.sellerId, args.itemType, args.itemId, args.wanted || { type: 'gold', amount: args.price }, args.price);
    }
  },
  'trade.offer': {
    description: 'Make an offer on a listing',
    parameters: { type: 'object', properties: { listingId: { type: 'string' }, buyerId: { type: 'string' }, offerPrice: { type: 'number' } }, required: ['listingId', 'buyerId', 'offerPrice'] },
    handler(args) {
      if (!window._tradingPost) return { error: 'not_init' };
      return window._tradingPost.makeOffer(args.listingId, args.buyerId, args.offerPrice);
    }
  },
  'trade.search': {
    description: 'Search marketplace listings',
    parameters: { type: 'object', properties: { itemType: { type: 'string' }, maxPrice: { type: 'number' } } },
    handler(args) {
      if (!window._tradingPost) window._tradingPost = new TradingPost();
      return window._tradingPost.searchListings(args);
    }
  },
  'trade.stats': {
    description: 'Get trading post stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._tradingPost) window._tradingPost = new TradingPost();
      return window._tradingPost.getMarketStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TradeListing, TradingPost, TradingPostTools };
}
if (typeof window !== 'undefined') {
  window.TradeListing = TradeListing;
  window.TradingPost = TradingPost;
  window.TradingPostTools = TradingPostTools;
}