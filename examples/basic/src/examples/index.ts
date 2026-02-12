import type { ExampleDefinition } from '../types';
import { hello } from './hello';
import { builtInModules } from './built-in-modules';
import { multifile } from './multifile';
import { lodash } from './lodash';
import { clsx } from './clsx';
import { timers } from './timers';
import { commonjsBasic } from './commonjs-basic';
import { commonjsModules } from './commonjs-modules';
import { commonjsMixed } from './commonjs-mixed';
import { commonjsNested } from './commonjs-nested';
import { multifileMixed } from './multifile-mixed';
import { multifileComplex } from './multifile-complex';
import { packageJson } from './package-json';
import { npmScripts } from './npm-scripts';

export const examples: ExampleDefinition[] = [
  hello,
  builtInModules,
  multifile,
  lodash,
  clsx,
  timers,
  packageJson,
  npmScripts,
  commonjsBasic,
  commonjsModules,
  commonjsMixed,
  commonjsNested,
  multifileMixed,
  multifileComplex,
];
