import type { ExampleDefinition } from '../types';

export const usingNpmPackages: ExampleDefinition = {
  id: 'using-npm-packages',
  label: 'Using npm packages',
  ai: true,
  files: {
    'main.js': `// Example using npm package – Zod
//
// Part 1: Object schema validation
// Part 2: Optional and nullable fields
// Part 3: Array validation

import { z } from 'zod';

console.log('=== Zod validation demo ===');
console.log('');

// Part 1: Object schema validation
console.log('Part 1: Object schema validation');
console.log('');

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(120),
  role: z.enum(['admin', 'user', 'guest'])
});

const validUser = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  role: 'admin'
};

const result = UserSchema.parse(validUser);
console.log('   Valid user:', result.name);

const invalidUser = {
  id: 2,
  name: 'Jane',
  email: 'invalid-email',
  age: 150,
  role: 'admin'
};

const validation = UserSchema.safeParse(invalidUser);
if (!validation.success) {
  console.log('   Invalid user errors:');
  validation.error.errors.forEach(err => {
    console.log(\`     - \${err.path.join('.')}: \${err.message}\`);
  });
}
console.log('');

// Part 2: Optional and nullable fields
console.log('Part 2: Optional and nullable fields');
console.log('');

const ProfileSchema = z.object({
  username: z.string(),
  bio: z.string().optional(),
  avatar: z.string().url().nullable(),
  settings: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    notifications: z.boolean().default(true)
  }).optional()
});

const profile1 = ProfileSchema.parse({
  username: 'alice',
  avatar: null
});
console.log('   Profile with defaults:', profile1);

const profile2 = ProfileSchema.parse({
  username: 'bob',
  bio: 'Software developer',
  avatar: 'https://example.com/avatar.jpg',
  settings: { theme: 'dark', notifications: false }
});
console.log('   Full profile:', profile2);
console.log('');

// Part 3: Array validation
console.log('Part 3: Array validation');
console.log('');

const TagsSchema = z.array(z.string()).min(1).max(5);
const NumbersSchema = z.array(z.number()).nonempty();

console.log('   Valid tags:', TagsSchema.parse(['javascript', 'nodejs', 'zod']));
console.log('   Valid numbers:', NumbersSchema.parse([1, 2, 3, 4, 5]));

const emptyArrayValidation = NumbersSchema.safeParse([]);
if (!emptyArrayValidation.success) {
  console.log('   Empty array error:', emptyArrayValidation.error.errors[0].message);
}
console.log('');

console.log('End of Zod demo');
`,
    'zod.test.js': `// Testing Zod schemas with Node's assert module

import assert from 'node:assert';
import { z } from 'zod';

console.log('Running Zod schema tests...');
console.log('');

// Test 1: String schema validation
const stringSchema = z.string();
assert.strictEqual(stringSchema.parse('hello'), 'hello');
console.log('✓ String schema test passed');

// Test 2: Number schema validation
const numberSchema = z.number();
assert.strictEqual(numberSchema.parse(42), 42);
console.log('✓ Number schema test passed');

// Test 3: Object schema validation
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email()
});

const user = UserSchema.parse({
  id: 1,
  name: 'Alice',
  email: 'alice@example.com'
});

assert.strictEqual(user.id, 1);
assert.strictEqual(user.name, 'Alice');
assert.strictEqual(user.email, 'alice@example.com');
console.log('✓ Object schema test passed');

// Test 4: safeParse returns success: true for valid data
const result = UserSchema.safeParse({
  id: 2,
  name: 'Bob',
  email: 'bob@example.com'
});

assert.strictEqual(result.success, true);
console.log('✓ safeParse success test passed');

// Test 5: safeParse returns success: false for invalid data
const invalidResult = UserSchema.safeParse({
  id: 'not a number',
  name: 'Charlie',
  email: 'invalid-email'
});

assert.strictEqual(invalidResult.success, false);
assert.ok(invalidResult.error.errors.length > 0);
console.log('✓ safeParse validation error test passed');

// Test 6: Array schema validation
const tagsSchema = z.array(z.string());
const tags = tagsSchema.parse(['javascript', 'typescript', 'zod']);

assert.strictEqual(tags.length, 3);
assert.strictEqual(tags[0], 'javascript');
console.log('✓ Array schema test passed');

// Test 7: Optional fields
const ProfileSchema = z.object({
  username: z.string(),
  bio: z.string().optional()
});

const profile = ProfileSchema.parse({ username: 'dev' });
assert.strictEqual(profile.username, 'dev');
assert.strictEqual(profile.bio, undefined);
console.log('✓ Optional field test passed');

// Test 8: Default values
const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light')
});

const settings = SettingsSchema.parse({});
assert.strictEqual(settings.theme, 'light');
console.log('✓ Default value test passed');

console.log('');
console.log('All tests passed!');
`,
    'package.json': JSON.stringify(
      {
        name: 'using-npm-packages',
        version: '1.0.0',
        type: 'module',
        scripts: {
          start: 'node main.js',
          test: 'node zod.test.js',
        },
        dependencies: {
          zod: '^3.24.0',
        },
      },
      null,
      2,
    ),
  },
};
