// External dependencies
import express from "express";

// Internal dependencies
import configAuthMiddleware from "./middleware/authConfig";
import configOtherMiddleware from "./middleware/otherConfig";
import { configDb } from "./config/database";
import configRoutes from "./routes";
import configProdMiddleware from "./middleware/prodConfig";
import configErrorMiddleware from "./middleware/errorConfig";
import configCloudinary from "./config/cloudinary";
import { port } from "./config/envVariables";

const app = express();

// config middleware + mongoDB
// TODO make configDb async
configDb();
configAuthMiddleware(app);
configOtherMiddleware(app);
configProdMiddleware(app);
configCloudinary();

// Config Routes
configRoutes(app);

// config error middleware
configErrorMiddleware(app);

app.listen(port, () => {
	console.log(`Server is running on port http://127.0.0.1/${port}`);
});

export default app;
