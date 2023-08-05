import mongoose from "mongoose";
import debug from "debug";
import { configDb } from "../../src/config/database";

import createUsersAndSavedPosts from "./createUsersAndPosts";

const log = debug("log:populateDbs");

const dropCollections = async () => {
	log("Dropping collections");
	const collections = await mongoose.connection.db.collections();
	if (collections.length === 0) {
		log("No collections to drop");
		return;
	}

	for (const collection of collections) {
		await collection.drop();
	}
	log("Done dropping collections");
};

const createData = async () => {
	log("Populating DBs");
	await createUsersAndSavedPosts(20);
	log("Done populating DBs");
};

const printData = async () => {
	log("Printing DBs");
	const users = await mongoose.connection.db
		.collection("users")
		.find()
		.toArray();
	const posts = await mongoose.connection.db
		.collection("posts")
		.find()
		.toArray();
	const comments = await mongoose.connection.db
		.collection("comments")
		.find()
		.toArray();
	log("Users: ", users);
	log("Posts: ", posts);
	log("Comments: ", comments);
	log("Done printing DBs");
};

const closeConnection = async () => {
	await mongoose.connection.close();
	log("Connection closed");
};

const run = async () => {
	await configDb();
	await dropCollections();
	await createData();
	await printData();
	await closeConnection();
};

run().catch(console.error);
