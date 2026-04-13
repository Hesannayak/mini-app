const hi = require('./hi.json');
const ta = require('./ta.json');
const te = require('./te.json');
const en = require('./en.json');

const translations = { hi, ta, te, en };

function t(language, key) {
  const keys = key.split('.');
  let value = translations[language] || translations.en;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}

module.exports = { translations, t, hi, ta, te, en };
