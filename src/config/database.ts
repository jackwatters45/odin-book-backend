import mongoose from "mongoose";
import debug from "debug";
import { mongoDbUri } from "./envVariables";

const log = debug("log");

export const configDb = async () => {
	try {
		mongoose.set("strictQuery", false);

		mongoose.connection.on("connected", () => {
			log("Mongoose connected");
		});

		mongoose.connection.on("error", (err) => {
			log("Mongoose connection error:", err);
			console.error("Mongoose connection error:", err);
		});

		log("Connecting to MongoDB...");
		await mongoose.connect(mongoDbUri);
		log("Connected to MongoDB");
	} catch (err) {
		log("Error connecting to MongoDB");
		console.error(err);
	}
};

export const disconnectFromDatabase = async () => {
	try {
		log("Disconnecting from MongoDB...");
		await mongoose.disconnect();
	} catch (err) {
		console.error(err);
	}
};
