import puppeteer from 'puppeteer-core';

async function run() {
  console.log('=== AGGRESSIVE DRIVING STRESS TEST (FLIP DETECTION) ===');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=metal'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));

  // Enter free roam
  const btns = await page.$$('button');
  for (const b of btns) {
    const text = await page.evaluate((el) => el.textContent, b);
    if (text && text.includes('ENTER MANHATTAN')) {
      await b.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1000));

  let flipsDetected = 0;
  let maxRollDetected = 0;
  let maxYDetected = 0;

  async function checkStability(label) {
    const data = await page.evaluate(() => {
      // We can inspect vehicle quaternion and pos
      const d = window.__VEHICLE_DEBUG__ || {};
      const vs = window.__VEHICLE_RAW__ || {};
      return { debug: d, raw: vs };
    });

    const y = parseFloat(data.debug.pos?.[1] || '0');
    if (y > maxYDetected) maxYDetected = y;
    if (y > 2.5) {
      console.warn(`[WARNING: ELEVATED Y DETECTED] Y = ${y.toFixed(2)} at ${label}`);
      flipsDetected++;
    }
    return data;
  }

  // 1. Accelerate to high speed
  console.log('\n--- PHASE 1: Full Acceleration ---');
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 100));
    await checkStability(`Acc Step ${i}`);
  }

  // 2. High-speed slalom (rapid left/right steering at 100+ km/h)
  console.log('\n--- PHASE 2: High-Speed Slalom (Alternating Left/Right) ---');
  for (let cycle = 0; cycle < 6; cycle++) {
    console.log(`Slalom Cycle ${cycle}: Hard Left`);
    await page.keyboard.down('KeyA');
    for (let s = 0; s < 4; s++) {
      await new Promise((r) => setTimeout(r, 100));
      await checkStability(`Slalom Left C${cycle} S${s}`);
    }
    await page.keyboard.up('KeyA');

    console.log(`Slalom Cycle ${cycle}: Hard Right`);
    await page.keyboard.down('KeyD');
    for (let s = 0; s < 4; s++) {
      await new Promise((r) => setTimeout(r, 100));
      await checkStability(`Slalom Right C${cycle} S${s}`);
    }
    await page.keyboard.up('KeyD');
  }

  // 3. High-speed Handbrake Drift Scandi-Flick
  console.log('\n--- PHASE 3: Scandinavian Flick / Aggressive Drift Snaps ---');
  await page.keyboard.down('KeyA');
  await page.keyboard.down('Space');
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 100));
    await checkStability(`Drift Left Step ${i}`);
  }
  await page.keyboard.up('KeyA');
  await page.keyboard.up('Space');

  // Snap right with throttle
  await page.keyboard.down('KeyD');
  await page.keyboard.down('Space');
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 100));
    await checkStability(`Drift Snap Right Step ${i}`);
  }
  await page.keyboard.up('KeyD');
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyW');

  // 4. Reverse J-Turn
  console.log('\n--- PHASE 4: Reverse J-Turn ---');
  await page.keyboard.down('KeyS');
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 100));
    await checkStability(`Reverse Step ${i}`);
  }
  // Flick steering in reverse
  await page.keyboard.down('KeyA');
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 100));
    await checkStability(`J-Turn Flick Step ${i}`);
  }
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyS');

  console.log(`\n=== STRESS TEST RESULTS ===`);
  console.log(`Max Y reached: ${maxYDetected.toFixed(2)}m`);
  console.log(`Flips/Airborne anomalies detected: ${flipsDetected}`);

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
