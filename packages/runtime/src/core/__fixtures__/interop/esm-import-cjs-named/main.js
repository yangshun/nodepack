import cjsModule from '/cjs-named.js';

const { add, subtract, constant } = cjsModule;

export default {
  sum: add(10, 20),
  diff: subtract(50, 25),
  value: constant,
};
