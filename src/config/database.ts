import mongoose from "mongoose";
import dotenv from "dotenv";
import debug from "debug";

const log = debug("log");
dotenv.config();

const configDb = async () => {
	try {
		mongoose.set("strictQuery", false);
		const mongoDB = process.env.MONGODB_URI;
		if (!mongoDB) throw new Error("MONGODB_URI is not defined");

		mongoose.connection.on("connected", () => {
			log("Mongoose connected");
		});

		mongoose.connection.on("error", (err) => {
			console.error("Mongoose connection error:", err);
		});

		await mongoose.connect(mongoDB);
	} catch (err) {
		console.error(err);
	}
};

export default configDb;
