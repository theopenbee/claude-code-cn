import { existsSync } from 'node:fs';
import { confirm, input, select } from '@inquirer/prompts';
import { InterruptedError } from '../utils/errors.js';
import { mergeJSONFile } from '../utils/json-merge.js';
import { PROVIDER_ENV_KEYS, type ProviderEnv } from './env-keys.js';
import { PROVIDER_SPECS } from './specs.js';

export interface ConfigureOptions {
  settingsPath: string;
  claudeJsonPath: string;
}

function isInterrupt(err: unknown): boolean {
  // @inquirer/prompts throws ExitPromptError on Ctrl+C
  return (err as { name?: string } | null)?.name === 'ExitPromptError';
}

async function ask<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isInterrupt(err)) throw new InterruptedError();
    throw err;
  }
}

export async function configureProvider(
  opts: ConfigureOptions,
): Promise<{ wroteClaudeJSON: boolean }> {
  if (existsSync(opts.settingsPath)) {
    const skip = await ask(() =>
      confirm({ message: '已检测到现有 ~/.claude/settings.json，是否跳过？', default: true }),
    );
    if (skip) return { wroteClaudeJSON: false };
  }

  const providerName = await ask(() =>
    select({
      message: '请选择 Provider',
      choices: PROVIDER_SPECS.map((s) => ({ name: s.name, value: s.name })),
    }),
  );
  const spec = PROVIDER_SPECS.find((s) => s.name === providerName);
  if (!spec) throw new Error(`未知 Provider: ${providerName}`);

  let baseURL: string | undefined;
  if (spec.baseURLPrompt) {
    const message = spec.baseURLPrompt;
    const baseURLOptions = spec.baseURLOptions;
    if (baseURLOptions && baseURLOptions.length > 0) {
      baseURL = await ask(() =>
        select({
          message,
          choices: baseURLOptions.map((o) => ({ name: o.name, value: o.value })),
        }),
      );
    } else {
      baseURL = await ask(() => input({ message }));
    }
  }

  const apiKey = await ask(() => input({ message: spec.keyPrompt }));

  let model: string | undefined;
  const modelOptions = spec.modelOptions;
  if (modelOptions && modelOptions.length > 0) {
    model = await ask(() =>
      select({
        message: '请选择模型',
        choices: modelOptions.map((m) => ({ name: m, value: m })),
        default: spec.modelDefault,
      }),
    );
  }

  const env: ProviderEnv = spec.buildEnv({ apiKey, model, baseURL });

  await mergeJSONFile(opts.settingsPath, (m) => {
    const current = (m.env as Record<string, unknown> | undefined) ?? {};
    for (const k of PROVIDER_ENV_KEYS) delete current[k];
    for (const [k, v] of Object.entries(env)) current[k] = v;
    m.env = current;
  });

  if (spec.needClaudeJSON) {
    await mergeJSONFile(opts.claudeJsonPath, (m) => {
      m.hasCompletedOnboarding = true;
    });
    return { wroteClaudeJSON: true };
  }

  return { wroteClaudeJSON: false };
}
