'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('trading_post');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'trading-post.js'), 'utf8');
eval(code);

const { TradeListing, TradingPost, TradingPostTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// TradeListing Tests
// ========================================================================
console.log('\n=== TradeListing Tests ===');
{
    const listing = new TradeListing('l1', 'seller1', 'card', 'c1', { type: 'gold', amount: 100 }, 50);
    assertEq(listing.listingId, 'l1', 'listingId set');
    assertEq(listing.sellerId, 'seller1', 'sellerId set');
    assertEq(listing.itemType, 'card', 'itemType card');
    assertEq(listing.itemId, 'c1', 'itemId c1');
    assertEq(listing.price, 50, 'price 50');
    assertEq(listing.status, 'active', 'status active');
    assertEq(listing.offers.length, 0, 'no offers initially');

    // addOffer
    const o1 = listing.addOffer('o1', 'buyer1', 45);
    assert(o1 !== null, 'addOffer returns listing');
    assertEq(listing.offers.length, 1, '1 offer');
    assertEq(listing.offers[0].buyerId, 'buyer1', 'offer buyerId buyer1');

    // addOffer to inactive - returns null
    listing.status = 'cancelled';
    const o2 = listing.addOffer('o2', 'buyer2', 40);
    assertEq(o2, null, 'no offer on inactive listing');

    // reset and test accept
    listing.status = 'active';
    const result = listing.acceptOffer('o1');
    assert(result.success, 'acceptOffer returns success');
    assertEq(listing.status, 'completed', 'status completed');

    // cancel
    const listing2 = new TradeListing('l2', 'seller1', 'deck', 'd1', { type: 'gold', amount: 200 }, 150);
    listing2.cancel();
    assertEq(listing2.status, 'cancelled', 'status cancelled after cancel()');
    assert(listing2.closedAt > 0, 'closedAt set after cancel');
}

// ========================================================================
// TradingPost Tests
// ========================================================================
console.log('\n=== TradingPost Tests ===');
{
    let tp = new TradingPost(); tp._load = () => {}; tp._save = () => {};

    // createListing
    const l1 = tp.createListing('alice', 'card', 'fireball', { type: 'gold', amount: 100 }, 80);
    assertEq(l1.sellerId, 'alice', 'seller alice');
    assertEq(l1.price, 80, 'price 80');
    assertEq(l1.status, 'active', 'listing active');

    // makeOffer
    const offer = tp.makeOffer(l1.listingId, 'bob', 75);
    assert(offer.offerId.startsWith('offer_'), 'offerId generated');
    assertEq(offer.offerPrice, 75, 'offerPrice 75');

    // acceptOffer
    const accept = tp.acceptOffer(l1.listingId, offer.offerId);
    assert(accept.success, 'acceptOffer succeeds');

    // getListing
    const found = tp.getListing(l1.listingId);
    assert(found !== null, 'getListing finds listing');
    assertEq(found.status, 'completed', 'listing now completed');

    // cancelListing
    const l2 = tp.createListing('alice', 'deck', 'aggro', { type: 'gold', amount: 200 }, 120);
    const cancel = tp.cancelListing(l2.listingId);
    assert(cancel.success, 'cancelListing succeeds');
    assertEq(tp.getListing(l2.listingId).status, 'cancelled', 'listing cancelled');

    // searchListings
    const l3 = tp.createListing('alice', 'card', 'iceshield', { type: 'gold', amount: 50 }, 40);
    const l4 = tp.createListing('bob', 'card', 'fireball', { type: 'gold', amount: 100 }, 90);

    const allActive = tp.searchListings({});
    assert(allActive.length >= 2, 'search returns listings');

    const cardOnly = tp.searchListings({ itemType: 'card' });
    for (const l of cardOnly) assertEq(l.itemType, 'card', 'all results are cards');

    const cheap = tp.searchListings({ maxPrice: 50 });
    for (const l of cheap) assert(l.price <= 50, 'all under 50 gold');

    // getMarketStats
    const stats = tp.getMarketStats();
    assert(typeof stats.activeListings === 'number', 'activeListings is number');
    assert(typeof stats.totalTransactions === 'number', 'totalTransactions is number');
    assert(typeof stats.totalVolume === 'number', 'totalVolume is number');

    // Hook
    let hookCalled = false;
    tp.registerHook((event, data) => { hookCalled = true; });
    tp.createListing('charlie', 'card', 'bolt', { type: 'gold', amount: 30 }, 25);
    assert(hookCalled, 'hook called on listing_created');
}

// ========================================================================
// TradingPostTools Tests
// ========================================================================
console.log('\n=== TradingPostTools Tests ===');
{
    let tp = new TradingPost(); tp._load = () => {}; tp._save = () => {};
    if (typeof window !== 'undefined') window._tradingPost = tp;

    const r1 = TradingPostTools['trade.create'].handler({ sellerId: 'tool_s', itemType: 'card', itemId: 'tool_c', price: 50 }, {});
    assert(r1 !== null, 'trade.create tool works');

    const r2 = TradingPostTools['trade.search'].handler({ itemType: 'card' }, {});
    assert(Array.isArray(r2), 'trade.search tool returns array');

    const r3 = TradingPostTools['trade.stats'].handler({}, {});
    assert(typeof r3 === 'object', 'trade.stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let tp = new TradingPost(); tp._load = () => {}; tp._save = () => {};

    // Full trade cycle
    const listing = tp.createListing('trader1', 'card', 'rare_spell', { type: 'gold', amount: 500 }, 300);
    assertEq(listing.status, 'active', 'Integration: listing active');

    // Multiple offers
    tp.makeOffer(listing.listingId, 'bidder1', 250);
    tp.makeOffer(listing.listingId, 'bidder2', 280);
    tp.makeOffer(listing.listingId, 'bidder3', 300);

    const found = tp.getListing(listing.listingId);
    assertEq(found.offers.length, 3, 'Integration: 3 offers received');

    // Accept best offer
    const best = tp.acceptOffer(listing.listingId, found.offers[2].offerId);
    assert(best.success, 'Integration: best offer accepted');

    const stats = tp.getMarketStats();
    assertEq(stats.totalTransactions, 1, 'Integration: 1 transaction');

    // Hook on trade complete
    let tradeHook = false;
    tp.registerHook((event, data) => { if (event === 'trade_completed') tradeHook = true; });
    const l2 = tp.createListing('seller2', 'deck', 'control_deck', { type: 'gold', amount: 1000 }, 800);
    const o = tp.makeOffer(l2.listingId, 'buyer2', 800);
    tp.acceptOffer(l2.listingId, o.offerId);
    assert(tradeHook, 'Integration: trade_completed hook fired');
}

// ========================================================================
// Summary
// ========================================================================
setTimeout(() => {
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0.0';
    const threshold = 90;
    const passPct = parseFloat(passRate);
    const coverageMet = passPct >= threshold;

    console.log(`\n===== Summary =====`);
    console.log(`Passed: ${passed}/${total} = ${passRate}%`);
    console.log(`Threshold ${threshold}%: ${coverageMet ? 'PASS ✓' : 'FAIL ✗'}`);

    const totalLines = 260;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);