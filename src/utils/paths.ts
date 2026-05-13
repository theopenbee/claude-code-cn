import { homedir } from 'node:os';
import { join } from 'node:path';

export function stateDir(): string {
  return join(homedir(), '.claude-code-cn');
}

export function binDir(): string {
  return join(stateDir(), 'bin');
}

export function claudeBinPath(): string {
  return join(binDir(), 'claude');
}

export function claudeSettingsPath(): string {
  return join(homedir(), '.claude', 'settings.json');
}

export function claudeJsonPath(): string {
  return join(homedir(), '.claude.json');
}
