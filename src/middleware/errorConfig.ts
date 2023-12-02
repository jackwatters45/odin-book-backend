import {
	Request,
	Response,
	ErrorRequestHandler,
	Application,
	NextFunction,
} from "express";
import debug from "debug";
import { MulterError } from "multer";

const log = debug("log:configErrorMiddleware");

export class BadRequestError extends Error {
	statusCode = 400;
	constructor(message: string) {
		super(message);
	}
}

export class NotFoundError extends Error {
	statusCode = 404;
	constructor(message: string) {
		super(message);
	}
}

const configErrorMiddleware = (app: Application) => {
	const errorHandler: ErrorRequestHandler = (
		err: Error,
		_req: Request,
		res: Response,
		next: NextFunction,
	) => {
		if (err instanceof MulterError) {
			if (err.code === "LIMIT_UNEXPECTED_FILE") {
				log("File too large");
				res.status(400).json({
					message: "Invalid file type. Only image types are allowed.",
				});
			} else {
				log(err.message);
				res.status(500).json({ message: "Internal Server Error" });
			}
		} else if (err instanceof BadRequestError || err instanceof NotFoundError) {
			log(err.message);
			res.status(err.statusCode).json({ message: err.message });
		} else if (err instanceof Error) {
			log(err.message);
			res.status(500).json({ message: err.message || "Internal Server Error" });
		} else {
			next();
		}
	};

	app.use(errorHandler);
};

export default configErrorMiddleware;
