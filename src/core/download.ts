// src/core/download.ts
import type { Hash } from 'node:crypto';
import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { Presets, SingleBar } from 'cli-progress';

export interface DownloadOptions {
  showProgress?: boolean;
  label?: string;
}

export async function downloadFile(
  url: string,
  destPath: string,
  hash: Hash | null,
  opts: DownloadOptions = {},
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`下载失败: ${url} (HTTP ${res.status})`);
  }

  const total = Number(res.headers.get('content-length') ?? 0);
  const bar =
    opts.showProgress !== false && total > 0
      ? new SingleBar(
          { format: `${opts.label ?? '下载中'} [{bar}] {percentage}% | {value}/{total} bytes` },
          Presets.shades_classic,
        )
      : null;
  bar?.start(total, 0);

  const file = createWriteStream(destPath);
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  let received = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      if (hash) hash.update(value);
      received += value.length;
      bar?.update(received);
      if (!file.write(Buffer.from(value))) {
        await once(file, 'drain');
      }
    }
  } catch (err) {
    file.destroy();
    throw err;
  } finally {
    bar?.stop();
  }
  await new Promise<void>((resolve, reject) => {
    file.once('error', reject);
    file.end(() => resolve());
  });
}
