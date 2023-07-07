import { v2 as cloudinary } from "cloudinary";
import {
	cloudinaryApiKey,
	cloudinaryCloudName,
	cloudinarySecretKey,
} from "./envVariables";

const configCloudinary = () => {
	cloudinary.config({
		cloud_name: cloudinaryCloudName,
		api_key: cloudinaryApiKey,
		api_secret: cloudinarySecretKey,
	});
};

export default configCloudinary;
