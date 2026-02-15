import type { ExampleDefinition } from '../types';
import { hello } from './hello';
import { builtInModules } from './built-in-modules';
import { multifile } from './multifile';
import { lodash } from './lodash';
import { clsx } from './clsx';
import { timers } from './timers';
import { promises } from './promises';
import { commonjsBasic } from './commonjs-basic';
import { commonjsModules } from './commonjs-modules';
import { commonjsMixed } from './commonjs-mixed';
import { commonjsNested } from './commonjs-nested';
import { multifileMixed } from './multifile-mixed';
import { multifileComplex } from './multifile-complex';
import { packageJson } from './package-json';
import { npmScripts } from './npm-scripts';
import { npmBin } from './npm-bin';
import { assert } from './assert';

export const examples: ExampleDefinition[] = [
  hello,
  builtInModules,
  assert,
  multifile,
  lodash,
  clsx,
  timers,
  promises,
  packageJson,
  npmScripts,
  npmBin,
  commonjsBasic,
  commonjsModules,
  commonjsMixed,
  commonjsNested,
  multifileMixed,
  multifileComplex,
];
