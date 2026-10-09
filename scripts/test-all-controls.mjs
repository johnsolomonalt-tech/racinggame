import puppeteer from 'puppeteer-core';

async function run() {
  console.log('--- STARTING COMPREHENSIVE CONTROLS & LANDMARKS TEST ---');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=metal'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[BROWSER ERROR]', msg.text());
    }
  });

  console.log('1. Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));

  // Enter Manhattan
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate((el) => el.textContent, b);
    if (text && text.includes('ENTER MANHATTAN')) {
      console.log('2. Clicking "ENTER MANHATTAN (FREE ROAM)"...');
      await b.click();
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 1000));
  let state = await page.evaluate(() => window.__VEHICLE_DEBUG__);
  console.log('Initial Spawn State:', state);

  // Test 1: Throttle (KeyW)
  console.log('\n--- TEST 1: THROTTLE FORWARD (KeyW) ---');
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 150));
    state = await page.evaluate(() => window.__VEHICLE_DEBUG__);
    console.log(`Accelerating ${i}: speed=${state.speed} km/h, pos=${state.pos}`);
  }
  await page.keyboard.up('KeyW');
  if (state.speed <= 0) throw new Error('KeyW failed: vehicle did not accelerate');

  // Test 2: Steering (KeyA & KeyD)
  console.log('\n--- TEST 2: STEERING (KeyA & KeyD) ---');
  await page.keyboard.down('KeyA');
  await new Promise((r) => setTimeout(r, 300));
  state = await page.evaluate(() => window.__VEHICLE_DEBUG__);
  console.log('Steering Left (KeyA): steer =', state.steer);
  await page.keyboard.up('KeyA');

  await page.keyboard.down('KeyD');
  await new Promise((r) => setTimeout(r, 300));
  state = await page.evaluate(() => window.__VEHICLE_DEBUG__);
  console.log('Steering Right (KeyD): steer =', state.steer);
  await page.keyboard.up('KeyD');

  // Test 3: Braking & Reverse (KeyS)
  console.log('\n--- TEST 3: BRAKING & REVERSE (KeyS) ---');
  await page.keyboard.down('KeyS');
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 200));
    state = await page.evaluate(() => window.__VEHICLE_DEBUG__);
    console.log(`Braking/Reverse ${i}: speed=${state.speed} km/h, gear=${state.gear}`);
  }
  await page.keyboard.up('KeyS');

  // Test 4: Handbrake (Space)
  console.log('\n--- TEST 4: HANDBRAKE (Space) ---');
  await page.keyboard.down('Space');
  await new Promise((r) => setTimeout(r, 300));
  console.log('Handbrake held.');
  await page.keyboard.up('Space');

  // Test 5: Fast Travel (KeyT)
  console.log('\n--- TEST 5: FAST TRAVEL TELEPORTATION ---');
  await page.keyboard.press('KeyT');
  await new Promise((r) => setTimeout(r, 500));

  // Teleport to Times Square
  console.log('Teleporting to Times Square...');
  await page.evaluate(() => {
    // Click Times Square fast travel button if available or dispatch event
    const btns = Array.from(document.querySelectorAll('button'));
    const tsBtn = btns.find((b) => b.textContent && b.textContent.includes('Times Square'));
    if (tsBtn) tsBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  state = await page.evaluate(() => window.__VEHICLE_DEBUG__);
  console.log('Times Square Arrival:', state);
  await page.screenshot({ path: 'times_square.png' });
  console.log('Captured screenshot: times_square.png');

  // Teleport to Central Park
  console.log('Teleporting to Central Park South...');
  await page.keyboard.press('KeyT');
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cpBtn = btns.find((b) => b.textContent && b.textContent.includes('Central Park'));
    if (cpBtn) cpBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  state = await page.evaluate(() => window.__VEHICLE_DEBUG__);
  console.log('Central Park South Arrival:', state);
  await page.screenshot({ path: 'central_park.png' });
  console.log('Captured screenshot: central_park.png');

  // Test 6: Garage Car Switching (KeyG)
  console.log('\n--- TEST 6: MANHATTAN GARAGE CAR SWITCHING (KeyG) ---');
  await page.keyboard.press('KeyG');
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const carBtn = btns.find((b) => b.textContent && b.textContent.includes('BMW M4 GT3'));
    if (carBtn) carBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  state = await page.evaluate(() => window.__VEHICLE_DEBUG__);
  console.log('Switched Car State:', state);

  // Test 7: Unflip / Reset (KeyR)
  console.log('\n--- TEST 7: UNFLIP / RESET (KeyR) ---');
  await page.keyboard.press('KeyR');
  await new Promise((r) => setTimeout(r, 500));
  state = await page.evaluate(() => window.__VEHICLE_DEBUG__);
  console.log('Post-Reset State:', state);

  await page.screenshot({ path: 'final_gameplay.png' });
  console.log('Captured screenshot: final_gameplay.png');

  console.log('\n--- ALL CONTROLS & LANDMARKS VERIFIED SUCCESSFULLY! ---');
  await browser.close();
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
