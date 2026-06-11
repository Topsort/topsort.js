class AppError {
  public readonly status: number; //change later to http status code
  public readonly statusText: string;
  public readonly body: unknown;
  public readonly retry: boolean;

  constructor(status: number, statusText: string, body: unknown, retry = false) {
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.retry = retry;
  }
}

export default AppError;
