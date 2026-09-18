/**
 * SpendWise Centralized Multi-Currency Architecture
 * 
 * Single source of truth for currency definitions and formatting.
 * Does NOT alter stored database numbers when display currency changes.
 */

export const CURRENCY_REGISTRY = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN',
    decimals: 2,
    symbolPosition: 'prefix'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    decimals: 2,
    symbolPosition: 'prefix'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    decimals: 2,
    symbolPosition: 'suffix' // or prefix in international display
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    decimals: 2,
    symbolPosition: 'prefix'
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    locale: 'ja-JP',
    decimals: 0,
    symbolPosition: 'prefix'
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    locale: 'ar-AE',
    decimals: 2,
    symbolPosition: 'prefix'
  },
  CAD: {
    code: 'CAD',
    symbol: '$',
    name: 'Canadian Dollar',
    locale: 'en-CA',
    decimals: 2,
    symbolPosition: 'prefix'
  },
  AUD: {
    code: 'AUD',
    symbol: '$',
    name: 'Australian Dollar',
    locale: 'en-AU',
    decimals: 2,
    symbolPosition: 'prefix'
  },
  SGD: {
    code: 'SGD',
    symbol: '$',
    name: 'Singapore Dollar',
    locale: 'en-SG',
    decimals: 2,
    symbolPosition: 'prefix'
  }
};

export const SUPPORTED_CURRENCIES = Object.values(CURRENCY_REGISTRY);

export const DEFAULT_CURRENCY = CURRENCY_REGISTRY.INR;

/**
 * Resolves currency configuration from a code or settings object.
 */
export function getCurrencyConfig(currencyOrSettings) {
  if (!currencyOrSettings) return DEFAULT_CURRENCY;
  
  if (typeof currencyOrSettings === 'string') {
    const upper = currencyOrSettings.toUpperCase();
    return CURRENCY_REGISTRY[upper] || DEFAULT_CURRENCY;
  }

  if (typeof currencyOrSettings === 'object') {
    const code = currencyOrSettings.currencyCode?.toUpperCase();
    if (code && CURRENCY_REGISTRY[code]) {
      return CURRENCY_REGISTRY[code];
    }
    // Custom symbol fallback if code not found
    if (currencyOrSettings.currencySymbol) {
      return {
        code: currencyOrSettings.currencyCode || 'CUSTOM',
        symbol: currencyOrSettings.currencySymbol,
        name: currencyOrSettings.currencyCode || 'Currency',
        locale: 'en-US',
        decimals: 2,
        symbolPosition: 'prefix'
      };
    }
  }

  return DEFAULT_CURRENCY;
}

/**
 * Formats a monetary amount into a clean, localized string using the designated currency.
 * 
 * @param {number} amount Monetary value
 * @param {string|object} [currencyOrSettings] Currency code (e.g. 'INR') or settings object
 * @param {object} [options] Formatting options: showDecimals, forceDecimals, compact
 * @returns {string} Formatted monetary string e.g. "₹40,201" or "$1,250.00"
 */
export function formatMoney(amount, currencyOrSettings = DEFAULT_CURRENCY, options = {}) {
  const num = Number(amount);
  const validNum = isNaN(num) ? 0 : num;
  const isNegative = validNum < 0;
  const absNum = Math.abs(validNum);

  const config = getCurrencyConfig(currencyOrSettings);
  const maxDecimals = config.decimals;
  
  let minDecimals = 0;
  if (options.forceDecimals) {
    minDecimals = maxDecimals;
  } else if (options.showDecimals) {
    // Show 2 decimals only if amount has cents
    minDecimals = (absNum % 1 !== 0) ? Math.min(2, maxDecimals) : 0;
  }

  let formattedNumber = '';
  try {
    formattedNumber = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
      notation: options.compact ? 'compact' : 'standard'
    }).format(absNum);
  } catch {
    formattedNumber = absNum.toFixed(minDecimals);
  }

  const sign = isNegative ? '-' : '';
  return `${sign}${config.symbol}${formattedNumber}`;
}

/**
 * Safely parses string or number input into a positive numeric money value.
 * Strips currency symbols, spaces, and commas.
 * @param {string|number} input
 * @returns {number}
 */
export function parseMoneyInput(input) {
  if (typeof input === 'number') {
    return isNaN(input) || input < 0 ? 0 : input;
  }
  if (!input || typeof input !== 'string') return 0;
  const trimmed = input.trim();
  if (trimmed.startsWith('-')) return 0;
  const sanitized = trimmed.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

