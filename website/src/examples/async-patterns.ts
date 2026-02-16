import type { ExampleDefinition } from '../types';

export const asyncPatterns: ExampleDefinition = {
  id: 'async-patterns',
  label: 'Async patterns',
  ai: true,
  files: {
    'main.js': `// Async patterns demo
//
// Part 1: Promises and async/await
// Part 2: Timers with setInterval
// Part 3: Parallel execution with Promise.all

console.log('=== Async patterns demo ===');
console.log('');

// Part 1: Promises and async/await
console.log('Part 1: Promises and async/await');
console.log('');

// Create a promise that simulates fetching user data
function fetchUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id === 999) {
        reject(new Error('User not found'));
      } else {
        resolve({ id: id, name: \`User \${id}\`, email: \`user\${id}@example.com\` });
      }
    }, 100);
  });
}

// Using async/await to handle the promise
async function getUserData() {
  try {
    const user = await fetchUser(1);
    console.log('   Fetched user:', user.name);
    console.log('   Email:', user.email);

    // Handle errors
    await fetchUser(999);
  } catch (error) {
    console.log('   Error:', error.message);
  }
}

await getUserData();
console.log('');

// Part 2: Timers with setInterval
console.log('Part 2: Timers with setInterval');
console.log('');

let count = 0;
const maxTicks = 5;

// Create a promise that resolves when interval completes
const intervalPromise = new Promise((resolve) => {
  const intervalId = setInterval(() => {
    count++;
    console.log(\`   Tick \${count}\`);

    if (count >= maxTicks) {
      clearInterval(intervalId);
      resolve();
    }
  }, 200);
});

// Wait for interval to complete
await intervalPromise;
console.log('   Interval completed');
console.log('');

// Part 3: Parallel execution with Promise.all
console.log('Part 3: Parallel execution with Promise.all');
console.log('');

// Simulate fetching multiple resources
function fetchPosts(userId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, title: 'Post 1' },
        { id: 2, title: 'Post 2' }
      ]);
    }, 150);
  });
}

function fetchComments(userId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, text: 'Great!' },
        { id: 2, text: 'Thanks!' }
      ]);
    }, 120);
  });
}

// Sequential execution
console.log('   Sequential execution:');
const startSeq = Date.now();
const user1 = await fetchUser(2);
const posts1 = await fetchPosts(2);
const comments1 = await fetchComments(2);
const seqTime = Date.now() - startSeq;
console.log(\`   - Time taken: \${seqTime}ms\`);
console.log('');

// Parallel execution with Promise.all
console.log('   Parallel execution:');
const startPar = Date.now();
const [user2, posts2, comments2] = await Promise.all([
  fetchUser(3),
  fetchPosts(3),
  fetchComments(3)
]);
const parTime = Date.now() - startPar;
console.log(\`   - Time taken: \${parTime}ms\`);
console.log(\`   - Parallel is \${seqTime - parTime}ms faster!\`);
console.log('');

console.log('End of async demo');
console.log('');
`,
  },
};
