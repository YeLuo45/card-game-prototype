import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:8080';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err}`));

await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(3000);

const pre = await page.evaluate(() => ({
  boot: !!window.Boot,
  startDisabled: document.getElementById('start-btn')?.disabled,
  startOnclick: typeof document.getElementById('start-btn')?.onclick,
  AIMemory: typeof window.AIMemory,
  hasStartNewGame: typeof window.startNewGame,
}));

await page.waitForFunction(() => {
  const btn = document.getElementById('start-btn');
  return btn && !btn.disabled;
}, { timeout: 120000 });

await page.click('#start-btn');
await page.waitForTimeout(2000);

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

console.log(JSON.stringify({ pre, post, logs: logs.slice(-30) }, null, 2));
await browser.close();
