/**
 * Drive every interactive surface of the rebuild and screenshot each state.
 * Fails loudly on console errors or empty panes — a tab that renders nothing
 * still screenshots fine, so assert content, not absence of crash.
 *
 *   node BOM/capture/interact.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/* Drives the running app — start it with `npm run preview` (or `npm run dev`)
   first, or use `npm run test:ui` which does both. */
const URL = process.env.APP_URL || 'http://localhost:5190/';
const OUT = path.join(__dirname, 'out', 'interactive');
fs.mkdirSync(OUT, { recursive: true });

const TABS = ['Overview', 'Vulnerabilities', 'Endpoint', 'Deployment', 'Superseded', 'Audit Trail'];
const PANELS = ['Patch Properties', 'Affected Products', 'File Details', 'Keyboard Shortcuts'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const fail = [];
  const check = (cond, msg) => { if (!cond) fail.push(msg); };

  /* ============================ LISTING ================================= */
  // 16 captured product icons, plus the BOM entry appended after them
  check(await page.locator('.iconrail > button').count() === 16,
    'left rail should keep the 16 captured product icons');
  check(await page.locator('.iconrail .railitem').count() === 1, 'BOM rail entry missing');
  check(await page.locator('.topbar').count() === 1, 'listing should show the product top bar');
  check(await page.locator('table.datagrid').count() === 1, 'listing grid missing');

  // the Tailwind `.grid` utility once hijacked this table's display and threw
  // away every column width — assert the table is still a table
  const disp = await page.evaluate(() =>
    getComputedStyle(document.querySelector('table.datagrid')).display);
  check(disp === 'table', `listing table display should be "table", got "${disp}"`);

  const colWidths = await page.evaluate(() => [...document.querySelectorAll('table.datagrid thead th')]
    .map((h) => Math.round(h.getBoundingClientRect().width)));
  check(colWidths.reduce((a, b) => a + b, 0) > 1800,
    `columns should fill the grid, got ${colWidths.reduce((a, b) => a + b, 0)}px`);

  const listRows = await page.locator('table.datagrid tbody tr').count();
  check(listRows === 20, `listing should show 20 rows, got ${listRows}`);
  await page.screenshot({ path: path.join(OUT, 'listing-00.png') });

  // search filters
  await page.locator('.searchfield input').fill('chrome');
  await page.waitForTimeout(300);
  const afterSearch = await page.locator('table.datagrid tbody tr').count();
  check(afterSearch > 0 && afterSearch < listRows, `listing search did not filter (${listRows} -> ${afterSearch})`);
  await page.screenshot({ path: path.join(OUT, 'listing-search.png') });
  await page.locator('.searchfield .clear').click();
  await page.waitForTimeout(250);
  check(await page.locator('table.datagrid tbody tr').count() === listRows, 'clearing search did not restore rows');

  // sort by header
  await page.locator('table.datagrid th', { hasText: 'CVSS 3.1 Score' }).click();
  await page.waitForTimeout(250);
  check(await page.locator('table.datagrid th.sorted').count() === 1, 'sorting did not mark a column');
  await page.locator('table.datagrid th', { hasText: 'CVSS 3.1 Score' }).click();
  await page.locator('table.datagrid th', { hasText: 'CVSS 3.1 Score' }).click();
  await page.waitForTimeout(250);
  check(await page.locator('table.datagrid th.sorted').count() === 0, 'third click should clear the sort');

  // selection bar
  await page.locator('table.datagrid thead input[type=checkbox]').check();
  await page.waitForTimeout(300);
  check(await page.locator('.selbar').count() === 1, 'selection bar did not appear');
  await page.screenshot({ path: path.join(OUT, 'listing-selected.png') });
  await page.locator('.selbar .acts button', { hasText: 'Clear' }).click();
  await page.waitForTimeout(250);
  check(await page.locator('.selbar').count() === 0, 'selection bar did not clear');

  // column chooser hides a column
  await page.locator('.toolbtn[title="Columns"]').click();
  await page.waitForTimeout(300);
  check(await page.locator('.popover').count() === 1, 'column chooser did not open');
  await page.locator('.popover label', { hasText: 'Category' }).locator('input').uncheck();
  await page.waitForTimeout(300);
  const heads = await page.locator('table.datagrid thead th').allInnerTexts();
  check(!heads.some((h) => h.includes('Category')), 'hiding a column had no effect');
  await page.screenshot({ path: path.join(OUT, 'listing-columns.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // view switcher + overflow menu
  await page.locator('.viewswitch').click();
  await page.waitForTimeout(250);
  check(await page.locator('.popover').count() === 1, 'view switcher did not open');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.locator('.toolbtn[title="More"]').click();
  await page.waitForTimeout(250);
  check(await page.locator('.popover').count() === 1, 'overflow menu did not open');
  await page.locator('.popover button', { hasText: 'Reset columns' }).click();
  await page.waitForTimeout(300);
  check((await page.locator('table.datagrid thead th').allInnerTexts()).some((h) => h.includes('Category')),
    'reset columns did not restore Category');

  // pagination
  await page.locator('.gridfoot select').selectOption('10');
  await page.waitForTimeout(300);
  check(await page.locator('table.datagrid tbody tr').count() === 10, 'rows-per-page did not apply');
  await page.locator('.pagebtn[data-p="2"]').click();
  await page.waitForTimeout(300);
  check(await page.locator('.pagebtn.active').innerText() === '2', 'listing page 2 did not activate');
  await page.locator('.gridfoot select').selectOption('25');
  await page.waitForTimeout(300);

  /* ---- listing -> detail ------------------------------------------------ */
  await page.locator('.idlink', { hasText: 'PCH-4811' }).first().click();
  await page.waitForTimeout(900);
  check(await page.locator('.rechead').count() === 1, 'clicking an id did not open the detail page');
  check((await page.locator('.tabstrip .tid').innerText()) === 'PCH-4811', 'detail opened the wrong record');

  /* ============================ DETAIL ================================== */
  check(await page.locator('.siderail button').count() === 4, 'right rail should have 4 icons');
  check(await page.locator('.tabbar button').count() === 6, 'should have 6 tabs');

  // ---- each tab renders real content ------------------------------------
  for (const [i, tab] of TABS.entries()) {
    await page.locator('.tabbar button', { hasText: new RegExp(`^${tab}$`) }).click();
    await page.waitForTimeout(450);
    const txt = (await page.locator('.pane').innerText()).trim();
    check(txt.length > 40, `tab "${tab}" rendered almost nothing (${txt.length} chars)`);
    const active = await page.locator('.tabbar button.active').innerText();
    check(active === tab, `tab "${tab}" did not become active (got "${active}")`);
    await page.screenshot({ path: path.join(OUT, `tab-${i + 1}-${tab.toLowerCase().replace(/\s/g, '-')}.png`) });
  }

  /* ---- no icon may blow out its control -------------------------------
     The extracted SVGs have width/height stripped so CSS can size them; any
     spot that forgets a size rule lets the glyph expand to fill its button,
     which silently wraps the label and doubles the control's height. Catch it
     everywhere rather than by eye. */
  await page.locator('.tabbar button', { hasText: /^Endpoint$/ }).click();
  await page.waitForTimeout(450);
  const oversized = await page.evaluate(() => {
    const bad = [];
    for (const s of document.querySelectorAll('button svg, .subtab svg, .glabel svg')) {
      const r = s.getBoundingClientRect();
      if (r.width > 24 || r.height > 24)
        bad.push(`${s.closest('button,.subtab')?.textContent.trim().slice(0, 22) || '?'} → ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return bad;
  });
  check(oversized.length === 0, 'oversized icons: ' + oversized.join(', '));

  const tallCtl = await page.evaluate(() => [...document.querySelectorAll('.subtab')]
    .filter(b => b.getBoundingClientRect().height > 40)
    .map(b => b.textContent.trim().slice(0, 24) + ' h=' + Math.round(b.getBoundingClientRect().height)));
  check(tallCtl.length === 0, 'sub-tab/CTA too tall (label wrapped): ' + tallCtl.join(', '));

  // no table row may be entirely the product's "---" placeholder
  const emptyRows = await page.evaluate(() => [...document.querySelectorAll('table.dt tbody tr')]
    .filter(tr => {
      const tds = [...tr.querySelectorAll('td')].slice(1);
      return tds.length && tds.every(td => !td.textContent.trim() || td.textContent.trim() === '---');
    }).length);
  check(emptyRows === 0, `${emptyRows} all-empty rows rendered in the table`);

  // ---- table interactions on Vulnerabilities -----------------------------
  await page.locator('.tabbar button', { hasText: /^Vulnerabilities$/ }).click();
  await page.waitForTimeout(400);
  const rowsBefore = await page.locator('table.dt tbody tr').count();
  check(rowsBefore > 0, 'vulnerabilities table has no rows');
  await page.locator('.searchbar input').fill('kernel');
  await page.waitForTimeout(300);
  const rowsAfter = await page.locator('table.dt tbody tr').count();
  check(rowsAfter < rowsBefore, `search did not filter (${rowsBefore} -> ${rowsAfter})`);
  await page.screenshot({ path: path.join(OUT, 'table-search.png') });
  await page.locator('.searchbar input').fill('');
  await page.waitForTimeout(250);

  // sub-tab + select-all
  await page.locator('.subtab', { hasText: 'Declined' }).click();
  await page.waitForTimeout(250);
  await page.locator('#all').check();
  const checked = await page.locator('table.dt tbody .chk:checked').count();
  check(checked > 0, 'select-all checked nothing');
  await page.screenshot({ path: path.join(OUT, 'table-subtab-selectall.png') });

  // pagination
  await page.locator('.tabbar button', { hasText: /^Endpoint$/ }).click();
  await page.waitForTimeout(400);
  const pageBtns = await page.locator('.pager button[data-p]').count();
  check(pageBtns >= 3, 'pager did not render page buttons');
  const p2 = page.locator('.pager button[data-p="2"]');
  if (await p2.count()) {
    await p2.click(); await page.waitForTimeout(300);
    check(await page.locator('.pager button.active').innerText() === '2', 'page 2 did not activate');
    await page.screenshot({ path: path.join(OUT, 'table-page2.png') });
  }

  // ---- header 3-dot menu -------------------------------------------------
  await page.locator('.tabbar button', { hasText: /^Overview$/ }).click();
  await page.waitForTimeout(300);
  await page.locator('.actions .iconbtn[title="More"]').click();
  await page.waitForTimeout(250);
  check(await page.locator('.menu:not([hidden])').count() === 1, '3-dot menu did not open');
  check((await page.locator('.menu').innerText()).includes('Deploy Patch'), 'menu missing Deploy Patch');
  await page.screenshot({ path: path.join(OUT, 'menu-3dot.png') });
  await page.keyboard.press('Escape');
  await page.mouse.click(700, 700);
  await page.waitForTimeout(250);
  check(await page.locator('.menu:not([hidden])').count() === 0, '3-dot menu did not close');

  // ---- Approve / Decline mutate state ------------------------------------
  await page.locator('.btn-decline').click();
  await page.waitForTimeout(300);
  check((await page.locator('#approvalVal').innerText()) === 'Declined', 'Decline did not update header');
  await page.screenshot({ path: path.join(OUT, 'cta-declined.png') });
  await page.locator('.btn-approve').click();
  await page.waitForTimeout(300);
  check((await page.locator('#approvalVal').innerText()) === 'Approved', 'Approve did not restore header');

  // ---- right rail panels --------------------------------------------------
  for (const [i, name] of PANELS.entries()) {
    await page.locator(`.siderail button[title="${name}"]`).click();
    await page.waitForTimeout(350);
    const t = await page.locator('.sidehead').innerText();
    check(t.includes(name), `rail panel "${name}" did not open (head="${t.split('\n')[0]}")`);
    await page.screenshot({ path: path.join(OUT, `rail-${i + 1}-${name.toLowerCase().replace(/\s/g, '-')}.png`) });
  }

  // ---- properties: collapse, field search, tag remove ---------------------
  await page.locator('.siderail button[title="Patch Properties"]').click();
  await page.waitForTimeout(300);
  await page.locator('.section-head').click();
  await page.waitForTimeout(250);
  check(await page.locator('.section.collapsed').count() === 1, 'section did not collapse');
  await page.locator('.section-head').click();
  await page.waitForTimeout(250);

  await page.locator('.sidehead input').fill('tag');
  await page.waitForTimeout(300);
  const visible = await page.locator('.field:not([hidden])').count();
  check(visible >= 1 && visible < 14, `field search did not filter (${visible} visible)`);
  await page.screenshot({ path: path.join(OUT, 'sidebar-fieldsearch.png') });
  await page.locator('.sidehead input').fill('');
  await page.waitForTimeout(250);

  const tagsBefore = await page.locator('.tagchip').count();
  await page.locator('.tagchip button').first().click();
  await page.waitForTimeout(250);
  check(await page.locator('.tagchip').count() === tagsBefore - 1, 'tag was not removed');

  // ---- sidebar collapse + resize -----------------------------------------
  const w0 = (await page.locator('.side').boundingBox()).width;
  await page.locator('.handle .grip').click();
  await page.waitForTimeout(350);
  const w1 = (await page.locator('.side').boundingBox()).width;
  check(w1 < w0, `collapse did not shrink sidebar (${w0} -> ${w1})`);
  await page.screenshot({ path: path.join(OUT, 'sidebar-collapsed.png') });
  await page.locator('.handle .grip').click();
  await page.waitForTimeout(350);

  // drag the resizer
  const box = await page.locator('.resizer').boundingBox();
  await page.mouse.move(box.x + 3, box.y + 400);
  await page.mouse.down();
  await page.mouse.move(box.x - 160, box.y + 400, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  const w2 = (await page.locator('.side').boundingBox()).width;
  check(w2 > w0 + 100, `resize drag did not widen sidebar (${w0} -> ${w2})`);
  await page.screenshot({ path: path.join(OUT, 'sidebar-resized.png') });

  /* ============================== BOM =================================== */
  // rail entry + hover flyout
  await page.locator('.railitem').hover();
  await page.waitForTimeout(400);
  check(await page.locator('.railflyout').count() === 1, 'BOM rail flyout did not open on hover');
  /* Existence is not enough: `overflow:hidden` on the rail once clipped this
     panel to nothing while leaving it in the DOM. Assert it is actually on
     screen and to the right of the rail. */
  const fly = await page.locator('.railflyout').boundingBox();
  check(!!fly && fly.width > 150 && fly.height > 40,
    `flyout is in the DOM but not visible (box ${JSON.stringify(fly)})`);
  check(!!fly && fly.x >= 54, `flyout should sit right of the 54px rail, x=${fly?.x}`);
  const flyoutItems = await page.locator('.railflyout button').allInnerTexts();
  check(flyoutItems.length === 1 && flyoutItems[0].includes('BOM Inventory'),
    `flyout should list only "BOM Inventory", got ${JSON.stringify(flyoutItems)}`);
  check((await page.locator('.railbadge').innerText()).toLowerCase() === 'new', 'NEW badge missing');
  await page.screenshot({ path: path.join(OUT, 'bom-01-flyout.png') });

  await page.locator('.railflyout button', { hasText: 'BOM Inventory' }).click();
  await page.waitForTimeout(800);

  // inventory
  check((await page.locator('.pagehead h1').innerText()) === 'BOM Inventory', 'BOM page title wrong');
  check(await page.locator('.viewswitch').count() === 0,
    'BOM inventory should scope with segmented tabs, not a view switcher');
  const bomRows = await page.locator('table.datagrid tbody tr').count();
  check(bomRows === 6, `BOM inventory should show 6 rows, got ${bomRows}`);
  check(await page.locator('.summarystrip').count() === 0, 'summary strip should be removed');
  check(await page.locator('.openbom').count() === 0, 'Open BOM column should be removed');
  check(await page.locator('.host .chev').count() === 0, 'host-name chevron should be removed');
  check(await page.locator('table.datagrid tbody .idlink').count() === 6,
    'CI ids should render as id pills, like the Vulnerabilities listing');
  check(await page.locator('.chip.ok').count() === 5, 'expected 5 Generated chips');
  check(await page.locator('.chip.warn').count() === 1, 'expected 1 Partial chip');
  check(await page.locator('.dash').count() === 2, 'expected 2 em-dashes in Crypto Assets');
  await page.screenshot({ path: path.join(OUT, 'bom-02-inventory.png') });

  // segmented scope switch — Managed CIs has no supplied row, so it must be empty
  await page.locator('.segmented button', { hasText: 'Managed CIs' }).click();
  await page.waitForTimeout(400);
  check(await page.locator('.gridempty').count() === 1, 'Managed CIs should render the empty state');
  await page.locator('.segmented button', { hasText: 'Agent CIs' }).click();
  await page.waitForTimeout(400);
  check(await page.locator('table.datagrid tbody tr').count() === 6, 'switching back lost the rows');

  // BOM listing icons must not blow out, same guard as elsewhere
  const bomOversized = await page.evaluate(() => [...document.querySelectorAll('button svg, .chip svg')]
    .filter((s) => s.getBoundingClientRect().width > 24).length);
  check(bomOversized === 0, `${bomOversized} oversized icons on the BOM listing`);

  /* Two class-name collisions have already shipped bugs: `.grid` picked up a
     Tailwind utility, and a card's inner `.main` picked up the app shell's
     flex column. Assert the shell owns exactly one `.main`. */
  const mainCount = await page.evaluate(() => document.querySelectorAll('.main').length);
  check(mainCount <= 1, `.main should belong to the app shell only, found ${mainCount}`);

  // the CI id pill opens the endpoint detail on the BOM tab
  await page.locator('table.datagrid tbody .idlink').first().click();
  await page.waitForTimeout(800);
  check(await page.locator('.rechead').count() === 1, 'CI id did not open the endpoint detail');
  check((await page.locator('.rectitle').innerText()) === 'WIN-6SA2JMQEV36', 'wrong endpoint opened');
  check((await page.locator('.idbadge').innerText()) === 'EP-4', 'record header should show EP-4');
  check((await page.locator('.tabbar button.active').innerText()).startsWith('BOM'),
    'endpoint detail should default to the BOM tab');

  // the detail must use the prototype's shell, not a bespoke one
  for (const sel of ['.tabstrip', '.rechead', '.tabbar', '.side', '.siderail', '.askai', '.resizer'])
    check(await page.locator(sel).count() === 1, `endpoint detail missing prototype shell part ${sel}`);
  const epTabs = await page.locator('.tabbar button').allInnerTexts();
  check(!epTabs.some((t) => t.includes('Products & scan scopes')),
    '"Products & scan scopes" tab should be removed');
  check((await page.locator('.side').innerText()).includes('Endpoint Properties'),
    'side panel should mirror Patch Properties');
  await page.screenshot({ path: path.join(OUT, 'bom-03-endpoint.png') });

  // the metadata card and agent banner are gone from the main column …
  check(await page.locator('.metagrid').count() === 0,
    'the product metadata card should be removed from the main column');
  check(await page.locator('.agentbanner').count() === 0,
    'the agent banner should be removed from the main column');
  // … and the BOM fields now live inside Other Info, not a separate rail panel
  check(await page.locator('.siderail button[title="BOM Info"]').count() === 0,
    'the BOM Info rail panel should be removed');
  check(await page.locator('.siderail button').count() === 2, 'rail should have 2 panels');
  const sideText = await page.locator('.side').innerText();
  check(sideText.includes('Resource throttle') && sideText.includes('CMDB link'),
    'BOM fields missing from the side panel');

  // BOM Info is its own section, and sits above Other Info
  const sectionTitles = await page.locator('.side .section-head h3').allInnerTexts();
  check(sectionTitles[0] === 'BOM Info',
    `BOM Info should be the first section, got ${JSON.stringify(sectionTitles)}`);
  check(sectionTitles.indexOf('BOM Info') < sectionTitles.indexOf('Other Info'),
    'BOM Info should sit above Other Info');
  check(await page.locator('.side .sectionscope').count() === 1,
    'BOM Info needs a scope line — it is product-scoped inside an endpoint-scoped panel');

  // and it collapses independently of Other Info
  await page.locator('.side .section-head').first().click();
  await page.waitForTimeout(250);
  check(await page.locator('.side .section.collapsed').count() === 1,
    'BOM Info should collapse on its own');
  await page.locator('.side .section-head').first().click();
  await page.waitForTimeout(250);

  /* ---- manage scan paths drawer ------------------------------------------ */
  await page.locator('.scoperow .btn-primary', { hasText: 'Manage scan paths' }).click();
  await page.waitForTimeout(600);
  const pathHeads = await page.locator('.pathtable thead th').allInnerTexts();
  check(pathHeads.some((h) => /last scan/i.test(h)), 'scan paths table needs a last-scan column');
  check(pathHeads.some((h) => /actions/i.test(h)), 'scan paths table needs an Actions column');

  /* Every cell is single-line now, including Status. Assert the behaviour
     (nowrap + ellipsis) rather than inferring it from cell height: cells share
     the row's height, so a tall row says nothing about which one wrapped. */
  const notTruncating = await page.evaluate(() =>
    [...document.querySelectorAll('.pathtable tbody td, .pathtable thead th')]
      .filter((el) => {
        const s = getComputedStyle(el);
        return s.whiteSpace !== 'nowrap' || s.textOverflow !== 'ellipsis';
      }).length);
  check(notTruncating === 0, `${notTruncating} scan-path cells can still wrap`);

  // the status chip and its count must sit on one line
  const stackedStatus = await page.evaluate(() =>
    [...document.querySelectorAll('.pathtable .statuscell')]
      .filter((el) => el.getBoundingClientRect().height > 26).length);
  check(stackedStatus === 0, `${stackedStatus} status cells still stack onto two lines`);

  /* A single-line row measures ~53px (12px padding + a 29px line box + 12px);
     a two-line row would be ~72px. 60 sits between them. */
  const tallRows = await page.evaluate(() => [...document.querySelectorAll('.pathtable tbody tr')]
    .filter((tr) => tr.getBoundingClientRect().height > 60).length);
  check(tallRows === 0, `${tallRows} scan-path rows are taller than one line`);
  check(await page.locator('.pathtable tbody tr').first().locator('.ghosticon').count() === 2,
    'each row should offer edit and delete, not a single close icon');
  check(await page.locator('.excludepanel .countpill').innerText() === '8',
    'exclude panel should count its patterns');
  check(await page.locator('.excludepanel .chipwell .patternchip').count() === 8,
    'exclude chips missing from the well');
  await page.screenshot({ path: path.join(OUT, 'bom-07-scan-paths.png') });

  // edit opens the stacked drawer prefilled, and a discovered path is locked
  await page.locator('.pathtable tbody tr').first().locator('.ghosticon').first().click();
  await page.waitForTimeout(500);
  check(await page.locator('.drawer').count() === 2, 'edit should stack over the paths drawer');
  check((await page.locator('.drawer').last().locator('h2').innerText()) === 'Edit product',
    'edit drawer title wrong');
  check(await page.locator('#ap-name').inputValue() === 'Payments Web', 'edit form not prefilled');
  check(await page.locator('#ap-path').isDisabled(), 'a discovered path must not be editable');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  check(await page.locator('.drawer').count() === 1, 'Esc should close only the edit drawer');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  /* ---- BOM tab surfaces -------------------------------------------------- */
  // caption sits below the switcher, and the section is type-aware
  check(await page.locator('.typerow + .typecaption').count() === 1,
    'the caption should sit below the type switcher');
  check((await page.locator('.sectionhead h3').innerText()) === 'SBOM versions',
    'version section should be named for the selected BOM type');

  // scan history drawer off the "N scans" link
  await page.locator('.vercard .scans').first().click();
  await page.waitForTimeout(500);
  check(await page.locator('.drawer').count() === 1, 'scan history drawer did not open');
  check((await page.locator('.drawer h2').innerText()).startsWith('Scan history'),
    'wrong drawer opened from the scans link');
  check(await page.locator('.scantable tbody tr').count() === 3, 'scan history should list 3 runs');
  await page.screenshot({ path: path.join(OUT, 'bom-04-scan-history.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);

  /* ---- version cards ------------------------------------------------------ */
  check(await page.locator('.vercard .chk').count() === 0,
    'selection checkboxes should be removed from the version cards');
  check(await page.locator('.vercard .ghostx').count() === 0,
    'the ⋯ overflow should be removed from the version cards');
  check(await page.locator('.vercard.current').count() === 1,
    'exactly one card should be styled as the current version');
  check(await page.locator('.vercard .chip-past').count() === 2,
    'superseded versions should read differently from the current one');
  check(await page.locator('.vercard .viewlink').count() === 3,
    '"View components" should be a text link on every card');
  check(await page.locator('.vercard .vcacts .iconbtn.tip').count() === 6,
    'each card needs download + re-scan icon buttons with instant tooltips');
  check((await page.locator('.vercard .iconbtn.tip').first().getAttribute('data-tip')) === 'Download BOM',
    'icon buttons need an instant tooltip label');

  /* download opens a dialog with a radio choice, Cancel and Download — the
     pick and the commit are separate steps, so nothing downloads on open */
  await page.locator('.vercard .iconbtn.tip').first().click();
  await page.waitForTimeout(400);
  check(await page.locator('.dlg').count() === 1, 'download dialog did not open');
  const radios = await page.locator('.dlg .radiorow').allInnerTexts();
  check(radios.length === 2
    && radios.some((t) => t.includes('CycloneDX'))
    && radios.some((t) => t.includes('SPDX')),
    `dialog should offer CycloneDX and SPDX, got ${JSON.stringify(radios)}`);
  check(await page.locator('.dlg input[type=radio]:checked').count() === 1,
    'exactly one format must be preselected');
  check(await page.locator('.dlg .radiorow.on').first().innerText().then((t) => t.includes('CycloneDX')),
    'the native format should be preselected');
  await page.screenshot({ path: path.join(OUT, 'bom-09-download.png') });

  // switching the radio moves the selection
  await page.locator('.dlg input[type=radio]').nth(1).check();
  await page.waitForTimeout(250);
  check((await page.locator('.dlg .radiorow.on').innerText()).includes('SPDX'),
    'selecting SPDX did not move the highlight');

  // Cancel closes without committing
  await page.locator('.dlg .btn-secondary', { hasText: 'Cancel' }).click();
  await page.waitForTimeout(300);
  check(await page.locator('.dlg').count() === 0, 'Cancel did not close the dialog');

  // reopening resets to the native format rather than remembering the pick
  await page.locator('.vercard .iconbtn.tip').first().click();
  await page.waitForTimeout(350);
  check((await page.locator('.dlg .radiorow.on').innerText()).includes('CycloneDX'),
    'the dialog should reopen on the native format');
  await page.locator('.dlg .btn-primary', { hasText: 'Download' }).click();
  await page.waitForTimeout(300);
  check(await page.locator('.dlg').count() === 0, 'Download did not close the dialog');

  // compare is available without selecting anything
  const compare = page.locator('.btn-outline', { hasText: 'Compare versions' });
  check(await compare.isEnabled(), 'Compare versions should be enabled by default');

  // the scan-paths CTA sits beside the product control, and is prominent
  const cta = page.locator('.scoperow .btn-primary', { hasText: 'Manage scan paths' });
  check(await cta.count() === 1, 'Manage scan paths should be a primary CTA inside the scope row');
  const [selBox, ctaBox] = [await page.locator('.selectbtn').boundingBox(),
    await cta.boundingBox()];
  check(!!selBox && !!ctaBox && ctaBox.x - (selBox.x + selBox.width) < 40,
    'the CTA should sit beside the product dropdown, not at the far edge');

  // compare modal
  await compare.click();
  await page.waitForTimeout(600);
  check(await page.locator('.cmp').count() === 1, 'compare modal did not open');
  check(await page.locator('.cmp-group').count() === 3, 'expected Updated / Added / Removed groups');
  check(await page.locator('.cmp-stat').count() === 4, 'expected 4 summary stats');
  check(await page.locator('.cmp-detail').count() === 0, 'rows should start collapsed');
  await page.locator('.cmp-rowhead').first().click();
  await page.waitForTimeout(300);
  check(await page.locator('.cmp-detail').count() === 1, 'row did not expand');
  // clicking a stat filters the list
  await page.locator('.cmp-stat', { hasText: 'Added' }).click();
  await page.waitForTimeout(300);
  check(await page.locator('.cmp-group').count() === 1, 'stat click should filter to one group');
  await page.locator('.cmp-stat.on').click();
  await page.waitForTimeout(300);
  check(await page.locator('.cmp-group').count() === 3, 'clicking the active stat should clear the filter');
  await page.screenshot({ path: path.join(OUT, 'bom-08-compare.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check(await page.locator('.cmp').count() === 0, 'Esc should close the compare modal');

  // cosign chips are gone from the version cards
  check(!(await page.locator('.vercards').innerText()).includes('cosign'),
    'cosign chip should be removed from the version cards');
  // the scan count sits on the delta line, not its own row
  check(await page.locator('.vercard .delta .scans').count() === 3,
    'the scans link should sit inside the delta line');

  // type switcher keeps its selection when the product changes (spec §2)
  await page.locator('.typeswitch button', { hasText: 'CBOM' }).click();
  await page.waitForTimeout(300);
  await page.locator('.selectbtn').click();
  await page.waitForTimeout(300);
  await page.locator('.popover button', { hasText: 'Reporting Service' }).click();
  await page.waitForTimeout(400);
  check((await page.locator('.typeswitch button.active').innerText()).startsWith('CBOM'),
    'BOM type selection must survive a product change');
  // the metadata now lives in the rail, and must follow the product change
  check((await page.locator('.side').innerText()).includes('Reporting Service'),
    'the rail BOM block did not follow the product change');

  // a product with 0 of the selected type shows an empty state, does not auto-switch
  await page.locator('.typeswitch button', { hasText: 'AI BOM' }).click();
  await page.waitForTimeout(400);
  check((await page.locator('.typeswitch button.active').innerText()).startsWith('AI BOM'),
    'must not auto-switch away from an empty type');
  check(await page.locator('.panel-placeholder').count() === 1, 'expected an empty state for 0 items');
  await page.screenshot({ path: path.join(OUT, 'bom-05-empty-type.png') });

  // back to a populated scope
  await page.locator('.typeswitch button', { hasText: 'SBOM' }).click();
  await page.waitForTimeout(400);

  // components page: column chooser, export menu, row -> component drawer
  await page.locator('.vercard .viewlink').first().click();
  await page.waitForTimeout(700);
  check(await page.locator('.crumb').count() === 1, 'components page missing its breadcrumb');
  await page.locator('.toolbtn[title="Columns"]').click();
  await page.waitForTimeout(300);
  check(await page.locator('.popover label').count() === 7, 'column chooser should list 7 columns');
  await page.locator('.popover label', { hasText: 'License' }).locator('input').uncheck();
  await page.waitForTimeout(300);
  check(!(await page.locator('table.datagrid thead').innerText()).includes('License'),
    'hiding License had no effect');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // Export reuses the same format dialog as the version cards
  await page.locator('.tools .btn-secondary', { hasText: 'Export' }).click();
  await page.waitForTimeout(400);
  check(await page.locator('.dlg').count() === 1, 'export dialog did not open');
  check((await page.locator('.dlg').innerText()).includes('SPDX'), 'export dialog missing SPDX');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(await page.locator('.dlg').count() === 0, 'Esc should close the export dialog');

  await page.locator('table.datagrid tbody tr').first().click();
  await page.waitForTimeout(500);
  check(await page.locator('.drawer').count() === 1, 'component detail drawer did not open');
  await page.screenshot({ path: path.join(OUT, 'bom-06-component-detail.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);

  // returning restores the scope the user drilled in from
  await page.locator('.crumb button', { hasText: 'EP-4' }).click();
  await page.waitForTimeout(700);
  check((await page.locator('.typeswitch button.active').innerText()).startsWith('SBOM'),
    'returning from components lost the BOM type');
  check((await page.locator('.selectbtn').innerText()).includes('Reporting Service'),
    'returning from components lost the selected product');

  // back, then a plain row click — must also land on BOM
  await page.locator('.tabstrip .x').click();
  await page.waitForTimeout(600);
  check(await page.locator('table.datagrid').count() === 1, 'back did not return to the inventory');
  await page.locator('table.datagrid tbody tr').first().click();
  await page.waitForTimeout(800);
  check((await page.locator('.tabbar button.active').innerText()).startsWith('BOM'),
    'row click should also open the BOM tab');

  // ---- report -------------------------------------------------------------
  console.log('\n=== interaction report ===');
  console.log(fail.length ? 'FAILURES:\n  - ' + fail.join('\n  - ') : 'all interaction checks passed');
  console.log(errors.length ? '\nCONSOLE ERRORS:\n  - ' + errors.join('\n  - ') : '\nno console errors');
  console.log('\nshots in', OUT);
  await browser.close();
  if (fail.length || errors.length) process.exit(1);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
