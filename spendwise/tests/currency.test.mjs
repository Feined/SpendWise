import assert from 'node:assert/strict';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyConfig,
  formatMoney,
  parseMoneyInput,
} from '../src/lib/currency.js';

console.log('[TEST] Running SpendWise Currency Engine Tests...');

// 1. Supported currencies count & schema
{
  assert.equal(SUPPORTED_CURRENCIES.length, 9, 'Must support 9 world currencies');
  const expectedCodes = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'CAD', 'AUD', 'SGD'];
  expectedCodes.forEach((code) => {
    const config = getCurrencyConfig(code);
    assert.ok(config, `Currency config for ${code} must exist`);
    assert.equal(config.code, code);
  });
}

// 2. formatMoney formatting
{
  // INR
  const inrResult = formatMoney(40201.5, { currencyCode: 'INR', currencySymbol: '₹' }, { forceDecimals: true });
  assert.ok(inrResult.includes('₹'), 'INR must include ₹');
  assert.ok(inrResult.includes('40,201.50'), 'INR should format with commas and 2 decimals');

  // USD
  const usdResult = formatMoney(1250.75, { currencyCode: 'USD', currencySymbol: '$' });
  assert.ok(usdResult.includes('$'), 'USD must include $');
  assert.ok(usdResult.includes('1,250.75'), 'USD should format with commas and 2 decimals');

  // JPY (0 decimals)
  const jpyResult = formatMoney(50000, { currencyCode: 'JPY', currencySymbol: '¥' });
  assert.ok(jpyResult.includes('¥'), 'JPY must include ¥');
  assert.ok(!jpyResult.includes('.'), 'JPY should not have decimal places');

  // EUR
  const eurResult = formatMoney(320.0, { currencyCode: 'EUR', currencySymbol: '€' });
  assert.ok(eurResult.includes('€'), 'EUR must include €');

  // AED
  const aedResult = formatMoney(150, { currencyCode: 'AED', currencySymbol: 'د.إ' });
  assert.ok(aedResult.includes('د.إ'), 'AED must include dirham symbol');
}

// 3. Compact mode
{
  const compact = formatMoney(1500000, { currencyCode: 'USD' }, { compact: true });
  assert.ok(compact.includes('M') || compact.includes('1.5'), `Compact should format large numbers: ${compact}`);
}

// 4. Input parsing
{
  assert.equal(parseMoneyInput('₹ 1,250.50'), 1250.5);
  assert.equal(parseMoneyInput('1200'), 1200);
  assert.equal(parseMoneyInput('invalid'), 0);
  assert.equal(parseMoneyInput('-50'), 0);
}

console.log('✔ All SpendWise Currency Engine Tests PASSED successfully!');
