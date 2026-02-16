import type { ExampleDefinition } from '../types';
import { nodejsModules } from './nodejs-modules';
import { usingNpmPackages } from './using-npm-packages';
import { asyncPatterns } from './async-patterns';
import { moduleInterop } from './module-interop';
// import { assertUnitTests } from './assert-unit-tests';
import { npmBin } from './npm-bin';
import { csvProcessing } from './csv-processing';

export const examples: ExampleDefinition[] = [
  nodejsModules,
  moduleInterop,
  asyncPatterns,
  usingNpmPackages,
  // assertUnitTests,
  npmBin,
  csvProcessing,
];
