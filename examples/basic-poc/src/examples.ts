import { ExampleDefinition } from './types';

export const examples: ExampleDefinition[] = [
  {
    id: 'hello',
    label: 'Hello World',
    code: `console.log('Hello from Node.js in the browser!');
console.log('This is a proof of concept');
console.log('Date:', new Date().toISOString());

export default { status: 'success', message: 'Hello World!' };`,
  },
  {
    id: 'fs',
    label: 'File Operations',
    code: `// File system operations using ES module imports
import { writeFileSync, readFileSync, mkdirSync, readdirSync } from 'fs';

writeFileSync('/hello.txt', 'Hello from virtual filesystem!');
const content = readFileSync('/hello.txt', 'utf8');

console.log('File content:', content);

// Create a directory and list files
mkdirSync('/data', { recursive: true });
writeFileSync('/data/test.txt', 'Test file');

const files = readdirSync('/');
console.log('Root directory files:', files);

export default { content, files };`,
  },
  {
    id: 'modules',
    label: 'Built-in Modules',
    code: `// Using ES module imports
import { join, dirname, basename, extname } from 'path';
import process from 'process';

const fullPath = join('/home', 'user', 'documents', 'file.txt');
const dir = dirname(fullPath);
const file = basename(fullPath);
const ext = extname(fullPath);

console.log('Full path:', fullPath);
console.log('Directory:', dir);
console.log('Filename:', file);
console.log('Extension:', ext);

// Using process module
console.log('Platform:', process.platform);
console.log('Version:', process.version);
console.log('Working dir:', process.cwd());

export default { fullPath, dir, file, ext };`,
  },
  {
    id: 'multifile',
    label: 'Multi-file Import',
    code: `// Multi-file project with local module imports! 🎉
// Files /utils.js and /math-helpers.js were created during initialization

// Import from our custom utility module
import { greet, add, multiply, PI, version } from './utils.js';

console.log(greet('World'));
console.log('2 + 3 =', add(2, 3));
console.log('4 × 5 =', multiply(4, 5));
console.log('PI =', PI);
console.log('Utils version:', version);

// Import from another custom module
import { square, cube, factorial } from './math-helpers.js';

console.log('');
console.log('5² =', square(5));
console.log('3³ =', cube(3));
console.log('5! =', factorial(5));

// You can also mix builtin and custom imports
import { existsSync } from 'fs';

console.log('');
console.log('Does /utils.js exist?', existsSync('/utils.js'));
console.log('Does /math-helpers.js exist?', existsSync('/math-helpers.js'));

export default {
  greeting: greet('User'),
  sum: add(10, 20),
  square: square(7),
  version
};`,
    files: {
      'utils.js': `export function greet(name) {
  return 'Hello, ' + name + '!';
}

export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

export const PI = 3.14159;
export const version = '1.0.0';`,
      'math-helpers.js': `export function square(x) {
  return x * x;
}

export function cube(x) {
  return x * x * x;
}

export function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
    },
  },
  {
    id: 'packages',
    label: 'NPM Packages',
    code: `// NPM packages from jsDelivr CDN! 🎉
import _ from 'lodash';

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

console.log('Numbers:', numbers);
console.log('Sum:', _.sum(numbers));
console.log('Average:', _.mean(numbers));
console.log('Max:', _.max(numbers));
console.log('Min:', _.min(numbers));

console.log('');
console.log('Doubled:', _.map(numbers, n => n * 2));
console.log('Evens:', _.filter(numbers, n => n % 2 === 0));
console.log('First 3:', _.take(numbers, 3));
console.log('Last 3:', _.takeRight(numbers, 3));

console.log('');
console.log('Unique:', _.uniq([1, 2, 2, 3, 3, 4, 4, 5]));
console.log('Shuffle:', _.shuffle([1, 2, 3, 4, 5]));

export default {
  sum: _.sum(numbers),
  average: _.mean(numbers),
  doubled: _.map(numbers, n => n * 2)
};`,
  },
  {
    id: 'react',
    label: 'React + Tailwind 🎨',
    code: `// React Components + Tailwind-style utilities 🎨
// Demonstrating component patterns with npm packages

import _ from 'lodash';

// Component: UserCard
// Displays user information in a card format
function UserCard({ user, className = '' }) {
  const fullName = \`\${user.firstName} \${user.lastName}\`;
  const initials = \`\${user.firstName[0]}\${user.lastName[0]}\`;

  return {
    type: 'div',
    className: \`card \${className}\`,
    children: [
      {
        type: 'div',
        className: 'avatar',
        children: [{ type: 'text', value: initials }]
      },
      {
        type: 'div',
        className: 'card-content',
        children: [
          { type: 'h3', children: [{ type: 'text', value: fullName }] },
          { type: 'p', className: 'text-gray', children: [{ type: 'text', value: user.email }] },
          { type: 'p', className: 'text-sm', children: [{ type: 'text', value: \`Role: \${user.role}\` }] }
        ]
      }
    ]
  };
}

// Component: UserList
// Displays a list of users with filtering and sorting
function UserList({ users, sortBy = 'firstName' }) {
  // Sort users using lodash
  const sortedUsers = _.sortBy(users, [sortBy]);

  return {
    type: 'div',
    className: 'user-list',
    children: sortedUsers.map(user => UserCard({ user, className: 'mb-4' }))
  };
}

// Component: StatsCard
// Displays statistical information
function StatsCard({ title, value, subtitle, icon }) {
  return {
    type: 'div',
    className: 'stats-card',
    children: [
      { type: 'div', className: 'stats-icon', children: [{ type: 'text', value: icon }] },
      {
        type: 'div',
        className: 'stats-content',
        children: [
          { type: 'h4', className: 'text-sm', children: [{ type: 'text', value: title }] },
          { type: 'p', className: 'text-2xl font-bold', children: [{ type: 'text', value: String(value) }] },
          { type: 'p', className: 'text-xs text-gray', children: [{ type: 'text', value: subtitle }] }
        ]
      }
    ]
  };
}

// Component: Dashboard
// Main dashboard component combining multiple components
function Dashboard({ users }) {
  // Calculate stats using lodash
  const totalUsers = users.length;
  const adminCount = _.filter(users, { role: 'admin' }).length;
  const avgAge = _.meanBy(users, 'age');
  const departments = _.uniq(_.map(users, 'department')).length;

  return {
    type: 'div',
    className: 'dashboard',
    children: [
      {
        type: 'h1',
        className: 'text-3xl font-bold mb-6',
        children: [{ type: 'text', value: 'User Dashboard' }]
      },
      {
        type: 'div',
        className: 'stats-grid',
        children: [
          StatsCard({ title: 'Total Users', value: totalUsers, subtitle: 'Active members', icon: '👥' }),
          StatsCard({ title: 'Administrators', value: adminCount, subtitle: 'System admins', icon: '👑' }),
          StatsCard({ title: 'Average Age', value: avgAge.toFixed(1), subtitle: 'Years old', icon: '📊' }),
          StatsCard({ title: 'Departments', value: departments, subtitle: 'Active depts', icon: '🏢' })
        ]
      },
      {
        type: 'h2',
        className: 'text-2xl font-bold mt-8 mb-4',
        children: [{ type: 'text', value: 'Team Members' }]
      },
      UserList({ users, sortBy: 'firstName' })
    ]
  };
}

// Utility: Render virtual DOM to console
function renderToConsole(vdom, indent = 0) {
  const spaces = '  '.repeat(indent);

  if (vdom.type === 'text') {
    console.log(\`\${spaces}\${vdom.value}\`);
    return;
  }

  const className = vdom.className ? \` className="\${vdom.className}"\` : '';
  console.log(\`\${spaces}<\${vdom.type}\${className}>\`);

  if (vdom.children) {
    vdom.children.forEach(child => renderToConsole(child, indent + 1));
  }

  console.log(\`\${spaces}</\${vdom.type}>\`);
}

// Sample data
const users = [
  { firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', role: 'admin', age: 32, department: 'Engineering' },
  { firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com', role: 'user', age: 28, department: 'Sales' },
  { firstName: 'Carol', lastName: 'Williams', email: 'carol@example.com', role: 'user', age: 35, department: 'Engineering' },
  { firstName: 'David', lastName: 'Brown', email: 'david@example.com', role: 'admin', age: 41, department: 'HR' },
  { firstName: 'Eve', lastName: 'Davis', email: 'eve@example.com', role: 'user', age: 29, department: 'Sales' }
];

console.log('🎨 React-style Component Demo');
console.log('================================\\n');

// Render the dashboard
const dashboard = Dashboard({ users });
renderToConsole(dashboard);

console.log('\\n✨ Component tree rendered successfully!');
console.log('\\n📊 Computed Statistics:');
console.log(\`  • Total Users: \${users.length}\`);
console.log(\`  • Administrators: \${_.filter(users, { role: 'admin' }).length}\`);
console.log(\`  • Departments: \${_.uniq(_.map(users, 'department')).join(', ')}\`);

export default {
  totalUsers: users.length,
  users: _.map(users, u => \`\${u.firstName} \${u.lastName}\`)
};`,
  },
];
