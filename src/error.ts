export class SyncError extends Error {
  readonly retryable: boolean = false;
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}
export class TransientError extends SyncError {
  override readonly retryable= true;
}
export class LoginError extends SyncError {}

export class OtpRequiredError extends SyncError {}

export class DownloadError extends SyncError {}

export class DataValidationError extends SyncError {}
