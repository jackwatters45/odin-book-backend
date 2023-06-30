import { Request, Response, ErrorRequestHandler, Application } from "express";

const configErrorMiddleware = (app: Application) => {
	const errorHandler: ErrorRequestHandler = (
		err: { status?: number; message?: string },
		_req: Request,
		res: Response,
	) => {
		res.status(err.status || 500);
		res.send(err.message || "Internal Server Error");
	};

	app.use(errorHandler);
};

export default configErrorMiddleware;
