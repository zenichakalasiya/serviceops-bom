/** Screenshot the BOM module end to end. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'out', 'bom');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await p.goto(process.env.APP_URL || 'http://localhost:5190/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);

  await p.locator('.railitem').hover();
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, '01-rail-flyout.png') });

  await p.locator('.railflyout button', { hasText: 'BOM Inventory' }).click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, '02-inventory.png') });
  console.log('inventory rows :', await p.locator('table.datagrid tbody tr').count());
  console.log('Ingest BOM CTA :', await p.locator('.btn-primary.sm').count() === 1);

  await p.locator('table.datagrid tbody .idlink').first().click();
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(OUT, '03-endpoint-bom-tab.png') });
  console.log('detail shell   :', await p.locator('.rechead').count() === 1
    && await p.locator('.side').count() === 1 && await p.locator('.siderail').count() === 1);
  console.log('tabs           :', (await p.locator('.tabbar button').allInnerTexts()).join(' | '));
  console.log('active tab     :', await p.locator('.tabbar button.active').innerText());

  // manage scan paths drawer, then the stacked add-product drawer
  await p.locator('.btn-primary', { hasText: 'Manage scan paths' }).click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(OUT, '05-drawer-paths.png') });
  await p.locator('.drawer .btn-primary', { hasText: 'Add product' }).first().click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(OUT, '06-drawer-add-stacked.png') });
  console.log('stacked drawers:', await p.locator('.drawer').count());
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  console.log('after Esc      :', await p.locator('.drawer').count(), '(should be 1)');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);

  // compare versions modal
  await p.locator('.btn-outline', { hasText: 'Compare versions' }).click();
  await p.waitForTimeout(600);
  await p.locator('.cmp-rowhead').first().click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, '08-compare.png') });
  console.log('compare modal :', await p.locator('.cmp').count() === 1,
    '| groups', await p.locator('.cmp-group').count());
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  // components page
  await p.locator('.vercard .viewlink').first().click();
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, '07-components.png') });
  console.log('components page:', await p.locator('.crumb').count() === 1,
    '| rows', await p.locator('table.datagrid tbody tr').count());

  // back to vulnerabilities via the shield
  await p.locator('.iconrail > button').nth(7).click();
  await p.waitForTimeout(700);
  console.log('back to vuln   :', (await p.locator('.pagehead h1').innerText()) === 'Vulnerabilities');

  console.log(errors.length ? 'CONSOLE ERRORS:\n  ' + errors.join('\n  ') : 'no console errors');
  await b.close();
})();
