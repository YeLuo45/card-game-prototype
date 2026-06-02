import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://localhost:8080';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => {
  const btn = document.getElementById('start-btn');
  return btn && !btn.disabled;
}, { timeout: 120000 });

const beforeStartScreen = await page.locator('#start-screen').isVisible();
await page.click('#start-btn');

try {
  await page.waitForFunction(() => {
    const modal = document.getElementById('deck-select-modal');
    const relic = document.getElementById('relic-selection-overlay');
    const startHidden = document.getElementById('start-screen')?.style.display === 'none';
    return (modal && modal.classList.contains('show')) ||
      (relic && getComputedStyle(relic).display !== 'none') ||
      startHidden;
  }, { timeout: 15000 });
} catch (e) {
  // fall through to diagnostic output below
}

const post = await page.evaluate(() => ({
  startDisplay: document.getElementById('start-screen')?.style.display,
  deckModal: document.getElementById('deck-select-modal')?.classList.contains('show'),
  relicOverlay: (() => {
    const el = document.getElementById('relic-selection-overlay');
    if (!el) return null;
    const style = getComputedStyle(el);
    return { display: style.display, visibility: style.visibility };
  })(),
  gameContainer: document.getElementById('game-container')?.style.display,
  gameState: !!window.gameState,
}));

const ok = post.startDisplay === 'none' || post.deckModal || post.relicOverlay?.display === 'flex';

console.log(JSON.stringify({
  ok,
  beforeStartScreen,
  after: post,
  consoleErrors: consoleErrors.filter((e) => !e.includes('Service Worker')),
}, null, 2));

if (!ok) process.exitCode = 1;
await browser.close();
process.exit(ok ? 0 : 1);
