export class MalamuteError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'MalamuteError';
  }
}

export class ConfigError extends MalamuteError {
  constructor(message: string) {
    super(message, 'E_CONFIG');
    this.name = 'ConfigError';
  }
}

export class ProviderError extends MalamuteError {
  constructor(message: string) {
    super(message, 'E_PROVIDER');
    this.name = 'ProviderError';
  }
}

export class GitError extends MalamuteError {
  constructor(message: string) {
    super(message, 'E_GIT');
    this.name = 'GitError';
  }
}

export class HookInstallError extends MalamuteError {
  constructor(message: string) {
    super(message, 'E_HOOK_INSTALL');
    this.name = 'HookInstallError';
  }
}
