import { v2 as cloudinary } from "cloudinary";
import { match } from "path-to-regexp";
import debug = require("debug");

const log = debug("log:removeFromCloudinaryService");

interface CloudinaryParams {
	cloudName: string;
	version: string;
	publicId: string;
}

function extractPublicId(url: string): string | null {
	const matcher = match<CloudinaryParams>(
		"https://res.cloudinary.com/:cloudName/image/upload/:version/:publicId.:format",
	);
	const result = matcher(url);
	if (!result) return null;

	return result.params?.publicId ?? null;
}

const removeFromCloudinary = async (shareLink: string) => {
	const publicId = extractPublicId(shareLink);
	if (!publicId) {
		throw new Error("Invalid share link");
	}

	try {
		const result = await cloudinary.uploader.destroy(publicId);
		log(result);
	} catch (error) {
		console.error("Failed to delete file from Cloudinary:", error);
	}
};

export default removeFromCloudinary;
