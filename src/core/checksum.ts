export function parseChecksumFile(content: string, assetName: string): string {
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const [hash, name] = parts;
    if (name === assetName) return hash as string;
  }
  throw new Error(`未找到资产 ${assetName}`);
}
