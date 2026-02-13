import path from 'path';

const joined = path.join('/foo', 'bar', 'baz');
const resolved = path.resolve('foo', 'bar');
const basename = path.basename('/foo/bar/file.txt');
const dirname = path.dirname('/foo/bar/file.txt');
const extname = path.extname('file.txt');

export default {
  joined,
  basename,
  dirname,
  extname,
  hasResolve: typeof resolved === 'string',
};
