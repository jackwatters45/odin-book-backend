// External dependencies
import express from "express";

// Internal dependencies
import configAuthMiddleware from "./middleware/authConfig";
import configOtherMiddleware from "./middleware/otherConfig";
import { configDb } from "./config/database";
import configRoutes from "./routes";
// import configProdMiddleware from "./middleware/prodConfig";
import configErrorMiddleware from "./middleware/errorConfig";
import configCloudinary from "./config/cloudinary";
import { port, appUrl } from "./config/envVariables";

const app = express();

const configApp = async () => {
	// config middleware + mongoDB
	await configDb();
	configAuthMiddleware(app);
	configOtherMiddleware(app);
	// configProdMiddleware(app);
	configCloudinary();

	// Config Routes
	configRoutes(app);

	// config error middleware
	configErrorMiddleware(app);
};

configApp();

app.listen(port, () => {
	console.log(`Server is running on port ${appUrl}`);
});

export default app;
