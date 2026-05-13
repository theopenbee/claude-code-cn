import { describe, expect, it } from 'vitest';
import { PROVIDER_ENV_KEYS } from './env-keys.js';

describe('PROVIDER_ENV_KEYS', () => {
  it('contains the 12 anthropic-related keys', () => {
    expect(PROVIDER_ENV_KEYS).toEqual([
      'ANTHROPIC_AUTH_TOKEN',
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_BASE_URL',
      'ANTHROPIC_MODEL',
      'ANTHROPIC_SMALL_FAST_MODEL',
      'ANTHROPIC_DEFAULT_SONNET_MODEL',
      'ANTHROPIC_DEFAULT_OPUS_MODEL',
      'ANTHROPIC_DEFAULT_HAIKU_MODEL',
      'CLAUDE_CODE_SUBAGENT_MODEL',
      'ENABLE_TOOL_SEARCH',
      'API_TIMEOUT_MS',
      'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
    ]);
  });
});
