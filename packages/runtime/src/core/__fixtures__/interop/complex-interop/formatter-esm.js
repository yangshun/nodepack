import stringUtils from '/string-utils-cjs.js';
import { double, triple } from '/number-utils-esm.js';

export function formatNumber(n) {
  return stringUtils.uppercase('number: ' + double(n));
}

export function processData(text, num) {
  return {
    text: stringUtils.lowercase(text),
    number: triple(num),
  };
}
