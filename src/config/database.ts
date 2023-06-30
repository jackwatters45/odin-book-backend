import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const configDb = async () => {
	try {
		mongoose.set("strictQuery", false);
		const mongoDB = process.env.MONGODB_URI;
		if (!mongoDB) throw new Error("MONGODB_URI is not defined");
		await mongoose.connect(mongoDB);
	} catch (err) {
		console.log(err);
	}
};

export default configDb;