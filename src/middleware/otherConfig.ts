import express, { Application } from "express";
import logger from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import { corsOrigin } from "../config/envVariables";

const configOtherMiddleware = (app: Application) => {
	app.use(logger("dev"));
	app.use(express.json());
	app.use(express.urlencoded({ extended: false }));
	app.use(cookieParser());
	app.use(cors({ origin: corsOrigin, credentials: true }));

	app.use((req, res, next) => {
		console.log(req.body); // Log the incoming payload
		next();
	});
};

export default configOtherMiddleware;
