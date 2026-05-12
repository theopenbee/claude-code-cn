export class InterruptedError extends Error {
  constructor() {
    super('interrupted');
    this.name = 'InterruptedError';
  }
}

export class UnsupportedPlatformError extends Error {
  constructor(
    public readonly os: string,
    public readonly arch: string,
  ) {
    super(
      `当前平台 (${os}/${arch}) 不支持 Claude Code 自动下载。\n支持的平台: darwin-arm64, darwin-x64, linux-arm64, linux-x64, linux-arm64-musl, linux-x64-musl\n请手动安装。`,
    );
    this.name = 'UnsupportedPlatformError';
  }
}
