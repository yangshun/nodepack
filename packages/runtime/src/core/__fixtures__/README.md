# Test Fixtures

This directory contains test fixtures for multi-file module tests in `runtime-execution.test.ts`.

## Structure

Fixtures are organized into subdirectories by category. Each fixture represents a test case with multiple files that interact with each other. The fixtures test various module system features including:

- ESM (ES Modules) importing other ESM files
- CommonJS (CJS) requiring other CJS files
- CJS/ESM interoperability in both directions
- Complex module chains and circular dependencies

## Fixture Organization

Fixtures are organized into the following categories:

- **basic/** - Simple execution tests
- **modules/** - Module system basics
- **esm/** - ESM-specific tests
- **cjs/** - CJS-specific tests
- **interop/** - CJS/ESM interoperability tests
- **errors/** - Error handling tests
- **console/** - Console output tests

Each fixture directory must contain:

- A `main.js` file that serves as the entry point
- One or more supporting module files

### Example Structure

```
esm/import-esm/
  ├── utils.js      # Helper module with utility functions
  └── main.js       # Entry point that imports utils.js
```

## Available Fixtures

### basic/

- **simple** - Simple JavaScript code execution with math operations
- **console** - Console.log output capture
- **error** - Basic error throwing and handling

### modules/

- **esm** - ES module importing and using built-in path module
- **cjs** - CommonJS module requiring and using built-in path module

### esm/

- **import-esm** - ESM importing another ESM with named exports
- **default-named** - ESM with both default and named exports
- **chain** - Chain of ESM imports (3 levels deep)
- **reexports** - ESM module that re-exports from another module

### cjs/

- **require-cjs** - CJS requiring another CJS module
- **exports-shorthand** - CJS using `exports.x` syntax
- **nested** - Nested CJS requires (3 levels deep)

### interop/

- **esm-import-cjs** - ESM importing a CJS module
- **esm-import-cjs-named** - ESM importing CJS with named exports
- **cjs-require-esm** - CJS requiring an ESM module
- **cjs-require-esm-default** - CJS requiring ESM default export
- **mixed-chain** - Mixed CJS and ESM in dependency chain
- **complex-interop** - Complex scenario with multiple CJS and ESM modules
- **circular-deps** - Circular dependencies between CJS and ESM

### errors/

- **runtime** - Runtime error (null property access)
- **imported** - Error thrown from an imported module
- **missing-import** - Importing a non-existent module

### console/

- **clear-first** - First execution for log clearing test
- **clear-second** - Second execution for log clearing test
- **stream** - Multiple console.log statements for streaming test
- **from-module** - Console.log calls from imported modules

## Adding New Fixtures

To add a new test fixture:

1. Choose the appropriate category and create a new directory:

   ```bash
   mkdir __fixtures__/esm/my-new-test
   ```

2. Add your module files:

   ```bash
   # Create supporting modules
   echo "export const value = 42;" > __fixtures__/esm/my-new-test/helper.js

   # Create main.js entry point
   echo "import { value } from '/helper.js'; export default value;" > __fixtures__/esm/my-new-test/main.js
   ```

3. Use the fixture in your test:

   ```typescript
   it('should handle my new test case', async () => {
     const fixture = loadFixture('esm/my-new-test');
     loadFixtureIntoFilesystem(runtime, fixture);

     const result = await runtime.execute(fixture.mainFile);

     expect(result.ok).toBe(true);
     expect(result.data).toBe(42);
   });
   ```

## Fixture Loader API

The `fixture-loader.ts` module provides:

### `loadFixture(name: string): Fixture`

Loads a fixture by name or path from the `__fixtures__` directory. Supports subdirectories for organization.

Examples:
- `loadFixture('basic/simple')` - loads from `__fixtures__/basic/simple/`
- `loadFixture('esm/import-esm')` - loads from `__fixtures__/esm/import-esm/`

Returns:

```typescript
{
  name: string;           // Fixture name or path
  files: FixtureFile[];   // Array of all files in the fixture
  mainFile: string;       // Content of main.js
}
```

### `loadFixtureIntoFilesystem(runtime: NodepackRuntime, fixture: Fixture): void`

Helper function to write all fixture files into the virtual filesystem.

## File Paths

All file paths in fixtures are absolute paths starting with `/`. For example:

- `/utils.js`
- `/config.js`
- `/lib/helper.js`

This matches how modules are resolved in the Nodepack runtime's virtual filesystem.

## Best Practices

1. **Keep fixtures focused** - Each fixture should test one specific scenario
2. **Use descriptive names** - Name fixtures to clearly indicate what they test
3. **Keep files small** - Fixture files should be concise and focused
4. **Document complex scenarios** - Add comments in fixture files for clarity
5. **Test both success and error cases** - Include fixtures that test error handling
6. **Maintain consistency** - Follow the same patterns as existing fixtures
