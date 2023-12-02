import type { Application } from "express";

import comment from "./comment.router";
import post from "./post.router";
import user from "./user.router";
import auth from "./auth.router";
import search from "./search.router";
import notification from "./notification.router";

const API_VERSION = "/api/v1";

const configRoutes = (app: Application) => {
	app.use(`${API_VERSION}/auth`, auth);
	app.use(`${API_VERSION}/users`, user);
	app.use(`${API_VERSION}/posts`, post);
	app.use(`${API_VERSION}/posts/:post/comments`, comment);
	app.use(`${API_VERSION}/search`, search);
	app.use(`${API_VERSION}/notifications`, notification);
};

export default configRoutes;
