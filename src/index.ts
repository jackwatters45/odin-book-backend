// External dependencies
import express from "express";
import { createServer } from "http";
import debug from "debug";

// Internal dependencies
import "./models/index";
import configAuthMiddleware from "./middleware/authConfig";
import configOtherMiddleware from "./middleware/otherConfig";
import { configDb } from "./config/database";
import { configSocket, initSocket } from "./config/socket";
import configRoutes from "./routes";
// import configProdMiddleware from "./middleware/prodConfig";
import configErrorMiddleware from "./middleware/errorConfig";
import configCloudinary from "./config/cloudinary";
import { port, appPort } from "./config/envVariables";
import { initRedis } from "./config/redis";

const log = debug("log:index");

const app = express();

const server = createServer(app);

const configApp = async () => {
	// config mongoDB
	await configDb();

	// config socket + redis
	await initSocket(server);
	await initRedis();
	await configSocket();

	// config middleware
	configAuthMiddleware(app);
	configOtherMiddleware(app);
	// configProdMiddleware(app);
	configCloudinary();

	// Config Routes
	configRoutes(app);

	// config error middleware
	configErrorMiddleware(app);
};

configApp().catch(console.error);

server.listen(port, () => {
	log(`Server is running on port ${appPort}`);
});

export default app;
