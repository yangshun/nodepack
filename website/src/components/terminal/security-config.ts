/**
 * Security Configuration for just-bash
 *
 * Configures execution limits and network access for the bash environment.
 * These settings prevent abuse and ensure the terminal is safe for educational use.
 */

import type { BashOptions } from 'just-bash';

export const bashSecurityConfig: Partial<BashOptions> = {
  // Disable network access by default
  // Can be enabled later with allowlisted domains if needed
  network: {
    enabled: false,
    // Example allowlist (uncomment to enable):
    // allowedPrefixes: [
    //   'https://api.github.com',
    //   'https://jsonplaceholder.typicode.com'
    // ],
    // allowedMethods: ['GET', 'POST']
  },

  // Execution limits to prevent infinite loops and resource exhaustion
  limits: {
    // Maximum recursion depth for functions and command substitutions
    maxRecursionDepth: 100,

    // Maximum number of loop iterations
    maxLoopIterations: 10000,

    // Maximum number of commands in a single execution
    maxCommandCount: 1000,
  },
};
