class AppError {
	public readonly status: number; //change later to http status code
	public readonly statusText: string;
	public readonly body: any;

	constructor(status: number, statusText: string, body: any) {
		this.status = status;
		this.statusText = statusText;
		this.body = body;
	}
}

export default AppError;
