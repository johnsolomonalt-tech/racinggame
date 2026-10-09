import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=metal'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', (msg) => {
    console.log('[BROWSER CONSOLE]', msg.type(), msg.text());
  });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Wait 2s for models
  await new Promise((r) => setTimeout(r, 2000));

  // Click start button if present
  try {
    const btn = await page.$('button');
    if (btn) {
      console.log('Clicking start button...');
      await btn.click();
    }
  } catch (e) {
    console.log('No start button or already in game:', e.message);
  }

  await new Promise((r) => setTimeout(r, 1000));

  console.log('Checking initial position...');
  for (let i = 0; i < 5; i++) {
    const debug = await page.evaluate(() => window.__VEHICLE_DEBUG__);
    console.log(`Frame ${i}:`, debug);
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('Pressing KeyW (Throttle)...');
  await page.keyboard.down('KeyW');

  for (let i = 0; i < 20; i++) {
    const debug = await page.evaluate(() => window.__VEHICLE_DEBUG__);
    console.log(`Driving Step ${i}:`, debug);
    await new Promise((r) => setTimeout(r, 100));
  }

  await page.keyboard.up('KeyW');

  await page.screenshot({ path: 'test_drive.png' });
  console.log('Screenshot saved to test_drive.png');

  await browser.close();
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
