import { chromium } from 'playwright';

async function checkConsole() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  try {
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 30000 });
    // Wait a bit for any async errors
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('Navigation error:', e);
  }
  
  await browser.close();
  
  console.log('=== CONSOLE ERRORS ===');
  errors.forEach(e => console.log('ERROR:', e));
  
  console.log('\n=== CONSOLE WARNINGS ===');
  warnings.forEach(w => console.log('WARNING:', w));
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('No console errors or warnings!');
  }
}

checkConsole().catch(console.error);
