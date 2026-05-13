export function normalizeTag(tag: string): string {
  const t = tag.trim();
  if (!t) throw new Error('版本号为空');
  return t.startsWith('v') ? t : `v${t}`;
}

export async function fetchLatestVersion(cdnBase: string): Promise<string> {
  const url = `${cdnBase}/claude-code-releases/latest.txt`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`获取最新版本失败: ${url} 返回 ${res.status}`);
  }
  return normalizeTag(await res.text());
}
