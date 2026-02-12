import { describe, it, expect } from 'vitest';
import { detectImports } from './import-detector.js';

describe('detectImports', () => {
  describe('ES Module imports', () => {
    it('should detect default import', () => {
      const code = `import lodash from 'lodash';`;
      const result = detectImports(code);
      expect(result.esModules).toContain('lodash');
      expect(result.allPackages).toContain('lodash');
    });

    it('should detect named imports', () => {
      const code = `import { map, filter } from 'lodash';`;
      const result = detectImports(code);
      expect(result.esModules).toContain('lodash');
    });

    it('should detect namespace imports', () => {
      const code = `import * as _ from 'lodash';`;
      const result = detectImports(code);
      expect(result.esModules).toContain('lodash');
    });

    it('should detect side-effect imports', () => {
      const code = `import 'some-package';`;
      const result = detectImports(code);
      expect(result.esModules).toContain('some-package');
    });

    it('should handle scoped packages', () => {
      const code = `import { babel } from '@babel/core';`;
      const result = detectImports(code);
      expect(result.esModules).toContain('@babel/core');
    });

    it('should extract base package from subpath imports', () => {
      const code = `import fp from 'lodash/fp';`;
      const result = detectImports(code);
      expect(result.esModules).toContain('lodash');
    });

    it('should extract base package from scoped package subpaths', () => {
      const code = `import parser from '@babel/core/lib/parser';`;
      const result = detectImports(code);
      expect(result.esModules).toContain('@babel/core');
    });

    it('should skip relative imports', () => {
      const code = `import utils from './utils.js';`;
      const result = detectImports(code);
      expect(result.esModules).toHaveLength(0);
    });

    it('should skip parent directory imports', () => {
      const code = `import config from '../config.js';`;
      const result = detectImports(code);
      expect(result.esModules).toHaveLength(0);
    });

    it('should skip absolute path imports', () => {
      const code = `import main from '/main.js';`;
      const result = detectImports(code);
      expect(result.esModules).toHaveLength(0);
    });

    it('should skip builtin modules', () => {
      const code = `
        import fs from 'fs';
        import path from 'path';
        import process from 'process';
        import timers from 'timers';
      `;
      const result = detectImports(code);
      expect(result.esModules).toHaveLength(0);
    });

    it('should handle multiple imports', () => {
      const code = `
        import React from 'react';
        import ReactDOM from 'react-dom';
        import { something } from 'lodash';
      `;
      const result = detectImports(code);
      expect(result.esModules).toContain('react');
      expect(result.esModules).toContain('react-dom');
      expect(result.esModules).toContain('lodash');
      expect(result.esModules).toHaveLength(3);
    });

    it('should deduplicate same package imports', () => {
      const code = `
        import { map } from 'lodash';
        import { filter } from 'lodash';
      `;
      const result = detectImports(code);
      expect(result.esModules).toHaveLength(1);
      expect(result.esModules).toContain('lodash');
    });
  });

  describe('CommonJS requires', () => {
    it('should detect simple require', () => {
      const code = `const _ = require('lodash');`;
      const result = detectImports(code);
      expect(result.commonjsModules).toContain('lodash');
      expect(result.allPackages).toContain('lodash');
    });

    it('should detect destructured require', () => {
      const code = `const { map, filter } = require('lodash');`;
      const result = detectImports(code);
      expect(result.commonjsModules).toContain('lodash');
    });

    it('should detect require without assignment', () => {
      const code = `require('some-package');`;
      const result = detectImports(code);
      expect(result.commonjsModules).toContain('some-package');
    });

    it('should handle scoped packages in require', () => {
      const code = `const babel = require('@babel/core');`;
      const result = detectImports(code);
      expect(result.commonjsModules).toContain('@babel/core');
    });

    it('should extract base package from subpath requires', () => {
      const code = `const fp = require('lodash/fp');`;
      const result = detectImports(code);
      expect(result.commonjsModules).toContain('lodash');
    });

    it('should skip relative requires', () => {
      const code = `const utils = require('./utils');`;
      const result = detectImports(code);
      expect(result.commonjsModules).toHaveLength(0);
    });

    it('should skip builtin modules in require', () => {
      const code = `
        const fs = require('fs');
        const path = require('path');
        const process = require('process');
        const timers = require('timers');
      `;
      const result = detectImports(code);
      expect(result.commonjsModules).toHaveLength(0);
    });

    it('should handle multiple requires', () => {
      const code = `
        const express = require('express');
        const cors = require('cors');
        const helmet = require('helmet');
      `;
      const result = detectImports(code);
      expect(result.commonjsModules).toContain('express');
      expect(result.commonjsModules).toContain('cors');
      expect(result.commonjsModules).toContain('helmet');
      expect(result.commonjsModules).toHaveLength(3);
    });

    it('should deduplicate same package requires', () => {
      const code = `
        const map = require('lodash/map');
        const filter = require('lodash/filter');
      `;
      const result = detectImports(code);
      expect(result.commonjsModules).toHaveLength(1);
      expect(result.commonjsModules).toContain('lodash');
    });
  });

  describe('Mixed imports and requires', () => {
    it('should detect both ES imports and CommonJS requires', () => {
      const code = `
        import React from 'react';
        const express = require('express');
      `;
      const result = detectImports(code);
      expect(result.esModules).toContain('react');
      expect(result.commonjsModules).toContain('express');
      expect(result.allPackages).toContain('react');
      expect(result.allPackages).toContain('express');
      expect(result.allPackages).toHaveLength(2);
    });

    it('should deduplicate packages across import and require', () => {
      const code = `
        import lodash from 'lodash';
        const _ = require('lodash');
      `;
      const result = detectImports(code);
      expect(result.esModules).toContain('lodash');
      expect(result.commonjsModules).toContain('lodash');
      expect(result.allPackages).toHaveLength(1);
      expect(result.allPackages).toContain('lodash');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty code', () => {
      const code = ``;
      const result = detectImports(code);
      expect(result.esModules).toHaveLength(0);
      expect(result.commonjsModules).toHaveLength(0);
      expect(result.allPackages).toHaveLength(0);
    });

    it('should handle code with no imports', () => {
      const code = `const x = 5; console.log(x);`;
      const result = detectImports(code);
      expect(result.esModules).toHaveLength(0);
      expect(result.commonjsModules).toHaveLength(0);
      expect(result.allPackages).toHaveLength(0);
    });

    it('should handle imports in comments', () => {
      const code = `
        // import lodash from 'lodash';
        /* const _ = require('lodash'); */
      `;
      const result = detectImports(code);
      // Note: Current implementation doesn't strip comments, so it will detect these
      // This test documents current behavior
      expect(result.esModules).toContain('lodash');
      expect(result.commonjsModules).toContain('lodash');
    });

    it('should handle imports in strings', () => {
      const code = `
        const str = "import lodash from 'lodash'";
        const str2 = 'const _ = require("express")';
      `;
      const result = detectImports(code);
      // Note: Current implementation doesn't handle strings, so it will detect these
      // This test documents current behavior
      expect(result.esModules).toContain('lodash');
      expect(result.commonjsModules).toContain('express');
    });
  });
});
