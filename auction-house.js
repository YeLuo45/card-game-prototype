// ============================================================================
// Card Auction House — V104 Direction X
// ============================================================================
// Marketplace for player-to-player card trading with offline-first persistence.
// Integrates thunderbolt offline-first + ruflo hook system + nanobot tool registry.
// ============================================================================

'use strict';

class AuctionHouse {
  constructor() {
    this.listings = this._loadListings();
    this.auctioneerHooks = [];
    this.tickInterval = null;
    this.isRunning = false;
  }

  // ---- thunderbolt offline-first: localStorage persistence ----
  _loadListings() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('auction_listings') : null;
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _saveListings() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auction_listings', JSON.stringify(this.listings));
    }
  }

  // ---- ruflo hook system for auction events ----
  registerHook(callback) {
    this.auctioneerHooks.push(callback);
  }

  _emit(event, data) {
    for (const hook of this.auctioneerHooks) {
      try { hook(event, data); } catch {}
    }
  }

  // ---- Core auction operations ----
  listCard(card, sellerId, startingPrice, durationMinutes = 60) {
    const listing = {
      id: 'lst_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      card,
      sellerId,
      startingPrice,
      currentBid: startingPrice,
      currentBidder: null,
      endTime: Date.now() + durationMinutes * 60 * 1000,
      durationMinutes,
      status: 'active',
      bidHistory: [],
      createdAt: Date.now()
    };
    this.listings.push(listing);
    this._saveListings();
    this._emit('listing_created', listing);
    return listing;
  }

  placeBid(listingId, bidderId, amount) {
    const listing = this.listings.find(l => l.id === listingId);
    if (!listing) return { error: 'invalid_listing' };
    if (listing.status === 'ended' || listing.status === 'cancelled') return { error: 'auction_ended' };
    if (listing.status !== 'active') return { error: 'invalid_listing' };
    if (Date.now() > listing.endTime) {
      listing.status = 'ended';
      this._saveListings();
      return { error: 'auction_ended' };
    }
    if (amount <= listing.currentBid) {
      return { error: 'bid_too_low', currentBid: listing.currentBid };
    }
    listing.currentBid = amount;
    listing.currentBidder = bidderId;
    listing.bidHistory.push({ bidderId, amount, time: Date.now() });
    this._saveListings();
    this._emit('bid_placed', { listingId, bidderId, amount });
    return {
      success: true,
      currentBid: listing.currentBid,
      currentBidder: listing.currentBidder
    };
  }

  getListing(listingId) {
    return this.listings.find(l => l.id === listingId) || null;
  }

  getActiveListings() {
    const now = Date.now();
    const active = this.listings.filter(l => l.status === 'active' && l.endTime > now);
    // Auto-expire stale listings
    for (const l of active) {
      if (l.endTime <= now) {
        l.status = 'ended';
      }
    }
    return active;
  }

  getMyListings(sellerId) {
    return this.listings.filter(l => l.sellerId === sellerId);
  }

  getMyBids(bidderId) {
    return this.listings.filter(l => l.currentBidder === bidderId && l.status === 'active');
  }

  cancelListing(listingId, sellerId) {
    const listing = this.listings.find(l => l.id === listingId);
    if (!listing) return false;
    if (listing.sellerId !== sellerId) return false;
    if (listing.bidHistory.length > 0) return false; // Can't cancel if bids exist
    listing.status = 'cancelled';
    this._saveListings();
    this._emit('listing_cancelled', listing);
    return true;
  }

  processExpiredListings() {
    const now = Date.now();
    const results = [];
    for (const listing of this.listings) {
      if (listing.status === 'active' && listing.endTime <= now) {
        listing.status = 'ended';
        const result = {
          listing,
          winner: listing.currentBidder,
          finalPrice: listing.currentBid
        };
        results.push(result);
        this._emit('auction_ended', result);
      }
    }
    if (results.length > 0) this._saveListings();
    return results;
  }

  // ---- Analytics ----
  getStats() {
    const now = Date.now();
    const active = this.listings.filter(l => l.status === 'active');
    const ended = this.listings.filter(l => l.status === 'ended');
    const totalVolume = ended.reduce((sum, l) => sum + l.currentBid, 0);
    return {
      activeListings: active.length,
      totalListings: this.listings.length,
      endedAuctions: ended.length,
      totalVolume,
      averagePrice: ended.length > 0 ? Math.round(totalVolume / ended.length) : 0
    };
  }

  // ---- Tool registry (nanobot pattern) ----
  getTool(name) {
    const tools = {
      'auction.list': { handler: (args) => this.getActiveListings() },
      'auction.list_card': { handler: (args) => this.getListing(args.listingId) },
      'auction.place_bid': { handler: (args) => this.placeBid(args.listingId, args.bidderId, args.amount) },
      'auction.my_listings': { handler: (args) => this.getMyListings(args.sellerId) },
      'auction.my_bids': { handler: (args) => this.getMyBids(args.bidderId) },
      'auction.stats': { handler: () => this.getStats() },
    };
    return tools[name] || null;
  }
}

const AuctionTools = {
  'auction.list': {
    description: 'List all active card auctions',
    parameters: { type: 'object', properties: {} },
    handler(args, ctx) {
      const engine = new AuctionHouse();
      return engine.getActiveListings();
    }
  },
  'auction.place_bid': {
    description: 'Place a bid on an auction listing',
    parameters: { type: 'object', properties: { listingId: { type: 'string' }, bidderId: { type: 'string' }, amount: { type: 'number' } }, required: ['listingId', 'bidderId', 'amount'] },
    handler(args, ctx) {
      const engine = new AuctionHouse();
      return engine.placeBid(args.listingId, args.bidderId, args.amount);
    }
  },
  'auction.list_card': {
    description: 'Get details of a specific listing',
    parameters: { type: 'object', properties: { listingId: { type: 'string' } }, required: ['listingId'] },
    handler(args, ctx) {
      const engine = new AuctionHouse();
      return engine.getListing(args.listingId);
    }
  },
  'auction.my_listings': {
    description: 'Get my auction listings',
    parameters: { type: 'object', properties: { sellerId: { type: 'string' } }, required: ['sellerId'] },
    handler(args, ctx) {
      const engine = new AuctionHouse();
      return engine.getMyListings(args.sellerId);
    }
  },
  'auction.stats': {
    description: 'Get auction house statistics',
    parameters: { type: 'object', properties: {} },
    handler(args, ctx) {
      const engine = new AuctionHouse();
      return engine.getStats();
    }
  }
};

// ---- UI Panel (ruflo hook pattern) ----
class AuctionPanel {
  constructor(auctionHouse) {
    this.auctionHouse = auctionHouse;
    this.isOpen = false;
    this.panel = null;
    this.hookUnregister = null;
  }

  open() {
    this.isOpen = true;
    this._render();
  }

  close() {
    this.isOpen = false;
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  _render() {
    if (typeof document === 'undefined') return;
    const stats = this.auctionHouse.getStats();
    this.panel = document.createElement('div');
    this.panel.id = 'auction-panel';
    this.panel.style.cssText = [
      'position:fixed;bottom:80px;right:20px;width:320px;background:rgba(10,15,30,0.95);',
      'border:2px solid #9b59b6;border-radius:12px;padding:16px;z-index:9996;',
      'font-family:monospace;font-size:13px;color:#ecf0f1;'
    ].join('');
    this.panel.innerHTML = [
      `<div style="color:#9b59b6;font-weight:bold;margin-bottom:8px;">🏷️ 拍卖行</div>`,
      `<div style="color:#999;font-size:11px;">`,
      `  活跃拍卖: ${stats.activeListings} | 已结束: ${stats.endedAuctions}<br/>`,
      `  总交易额: ${stats.totalVolume} | 均价: ${stats.averagePrice}`,
      `</div>`
    ].join('');
    document.body.appendChild(this.panel);
  }

  getPanelState() {
    return { open: this.isOpen, stats: this.auctionHouse.getStats() };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuctionHouse, AuctionPanel, AuctionTools };
}
if (typeof window !== 'undefined') {
  window.AuctionHouse = AuctionHouse;
  window.AuctionPanel = AuctionPanel;
  window.AuctionTools = AuctionTools;
}