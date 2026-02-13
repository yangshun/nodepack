import util from 'util';

const obj = { name: 'test', value: 42 };
const inspected = util.inspect(obj);

const formatted = util.format('Hello %s, you have %d items', 'world', 5);

const isArray = util.types?.isArray([1, 2, 3]);
const isDate = util.types?.isDate(new Date());

export default {
  inspected,
  formatted,
  hasInspect: typeof util.inspect === 'function',
  hasFormat: typeof util.format === 'function',
  hasTypes: util.types !== undefined,
  isArray,
  isDate,
};
