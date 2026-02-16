import type { ExampleDefinition } from '../types';

export const csvProcessing: ExampleDefinition = {
  id: 'csv-processing',
  label: 'CSV processing',
  ai: true,
  files: {
    'main.js': `// CSV parsing and data processing example
// Demonstrates reading CSV files and performing grouping operations

import { readUsers } from './read-users.js';

console.log('=== AI-assisted interview question ===');
console.log('');

const users = await readUsers();

console.log(\`Total users: \${users.length}\`);
console.log('');

console.log('TODO: Calculate average salary by department and city, and find the highest paid user in each department.');
`,
    'read-users.js': `import fs from 'node:fs';
    
// Read the CSV file
export async function readUsers() {
  const csvContent = await fs.readFile('users.csv');

  // Parse CSV manually
  const lines = csvContent.trim().split('\\n');
  const headers = lines[0].split(',');

  const users = lines.slice(1).map(line => {
    const values = line.split(',');
    const user = {};

    headers.forEach((header, index) => {
      const value = values[index];
      // Convert numeric fields
      if (header === 'age' || header === 'salary') {
        user[header] = parseInt(value, 10);
      } else {
        user[header] = value;
      }
    });

    return user;
  });

  return users;
}
`,
    'users.csv': `name,age,department,city,salary
Alice Johnson,28,Engineering,San Francisco,95000
Bob Smith,34,Engineering,New York,102000
Carol White,42,Marketing,San Francisco,78000
David Brown,31,Engineering,Austin,88000
Emma Davis,29,Sales,New York,72000
Frank Wilson,38,Marketing,Austin,81000
Grace Lee,26,Sales,San Francisco,68000
Henry Martinez,45,Engineering,New York,115000
Isabel Garcia,33,Marketing,San Francisco,85000
Jack Anderson,27,Sales,Austin,70000
Karen Taylor,36,Engineering,Austin,98000
Leo Thomas,41,Marketing,New York,89000
Maria Rodriguez,30,Sales,San Francisco,75000
Nathan Moore,35,Engineering,New York,105000
Olivia Jackson,29,Marketing,Austin,79000`,
    'package.json': JSON.stringify(
      {
        name: 'csv-processing',
        version: '1.0.0',
        type: 'module',
        scripts: {
          start: 'node main.js',
        },
      },
      null,
      2,
    ),
  },
};
