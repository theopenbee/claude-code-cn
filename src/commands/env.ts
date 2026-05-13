import pc from 'picocolors';
import { configureProvider } from '../providers/configure.js';
import { InterruptedError } from '../utils/errors.js';
import { claudeJsonPath, claudeSettingsPath } from '../utils/paths.js';

export async function runEnv(): Promise<void> {
  try {
    const result = await configureProvider({
      settingsPath: claudeSettingsPath(),
      claudeJsonPath: claudeJsonPath(),
    });
    process.stdout.write(pc.green(`已写入 ${claudeSettingsPath()}\n`));
    if (result.wroteClaudeJSON) {
      process.stdout.write(pc.green(`已写入 ${claudeJsonPath()}\n`));
    }
  } catch (err) {
    if (err instanceof InterruptedError) {
      process.stdout.write(pc.dim('已取消\n'));
      return;
    }
    throw err;
  }
}
