class AppError {
  public readonly status: number; //change later to http status code
  public readonly statusText: string;
  public readonly body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export default AppError;
