import type { ExampleDefinition } from '../types';

export const promises: ExampleDefinition = {
  id: 'promises',
  label: 'Promises',
  code: `// Demonstrating Promises and async/await in the browser runtime

// 1. Basic Promise creation
console.log('1. Creating a basic promise...');
const basicPromise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('Promise resolved after 500ms!');
  }, 500);
});

basicPromise.then((result) => {
  console.log('Basic promise result:', result);
});

// 2. Promise chaining
console.log('\\n2. Demonstrating promise chaining...');
function fetchUser(userId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: userId, name: 'Alice' });
    }, 300);
  });
}

function fetchUserPosts(user) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { title: 'First Post', author: user.name },
        { title: 'Second Post', author: user.name }
      ]);
    }, 300);
  });
}

fetchUser(1)
  .then((user) => {
    console.log('Fetched user:', user);
    return fetchUserPosts(user);
  })
  .then((posts) => {
    console.log('Fetched posts:', posts);
    return posts.length;
  })
  .then((count) => {
    console.log('Total posts:', count);
  });

// 3. Error handling with promises
console.log('\\n3. Error handling with .catch()...');
function riskyOperation(shouldFail) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Operation failed!'));
      } else {
        resolve('Success!');
      }
    }, 200);
  });
}

riskyOperation(false)
  .then((result) => {
    console.log('Success case:', result);
  })
  .catch((error) => {
    console.error('Caught error:', error.message);
  });

riskyOperation(true)
  .then((result) => {
    console.log('This will not run');
  })
  .catch((error) => {
    console.error('Caught error:', error.message);
  });

// 4. Promise.all for parallel execution
console.log('\\n4. Using Promise.all for parallel execution...');
const promise1 = new Promise((resolve) => setTimeout(() => resolve('First'), 400));
const promise2 = new Promise((resolve) => setTimeout(() => resolve('Second'), 200));
const promise3 = new Promise((resolve) => setTimeout(() => resolve('Third'), 300));

Promise.all([promise1, promise2, promise3])
  .then((results) => {
    console.log('Promise.all results:', results);
  });

// 5. Promise.race - returns the first resolved promise
console.log('\\n5. Using Promise.race...');
const slow = new Promise((resolve) => setTimeout(() => resolve('Slow response'), 800));
const fast = new Promise((resolve) => setTimeout(() => resolve('Fast response'), 100));

Promise.race([slow, fast])
  .then((result) => {
    console.log('Promise.race winner:', result);
  });

// 6. Async/await syntax
console.log('\\n6. Using async/await syntax...');
async function processData() {
  try {
    console.log('Starting async operation...');

    const user = await fetchUser(2);
    console.log('Async: Got user:', user);

    const posts = await fetchUserPosts(user);
    console.log('Async: Got posts:', posts);

    const result = await riskyOperation(false);
    console.log('Async: Operation result:', result);

    return 'All operations completed!';
  } catch (error) {
    console.error('Async error:', error.message);
  }
}

processData().then((finalResult) => {
  console.log('Async function final result:', finalResult);
});

// 7. Promise.allSettled - waits for all promises regardless of success/failure
console.log('\\n7. Using Promise.allSettled...');
const mixedPromises = [
  Promise.resolve('Success 1'),
  Promise.reject('Error 1'),
  Promise.resolve('Success 2'),
  Promise.reject('Error 2')
];

Promise.allSettled(mixedPromises)
  .then((results) => {
    console.log('Promise.allSettled results:');
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(\`  [\${index}] Fulfilled:\`, result.value);
      } else {
        console.log(\`  [\${index}] Rejected:\`, result.reason);
      }
    });
  });

// 8. Chaining with transformation
console.log('\\n8. Promise chaining with data transformation...');
Promise.resolve(5)
  .then((num) => {
    console.log('Starting with:', num);
    return num * 2;
  })
  .then((num) => {
    console.log('After doubling:', num);
    return num + 3;
  })
  .then((num) => {
    console.log('After adding 3:', num);
    return num.toString();
  })
  .then((str) => {
    console.log('Final result as string:', str);
  });

console.log('\\nAll promise examples scheduled!');
console.log('Watch the output appear as promises resolve...');
`,
};
