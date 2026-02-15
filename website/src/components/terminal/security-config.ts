/**
 * Security Configuration for just-bash
 *
 * Configures execution limits and network access for the bash environment.
 * These settings prevent abuse and ensure the terminal is safe for educational use.
 */

import type { BashOptions } from 'just-bash';

export const bashSecurityConfig: Partial<BashOptions> = {
  // Network access is disabled by default (no allowedUrlPrefixes configured)
  network: {},

  // Execution limits to prevent infinite loops and resource exhaustion
  executionLimits: {
    maxCallDepth: 100,
    maxLoopIterations: 10000,
    maxCommandCount: 1000,
  },
};
