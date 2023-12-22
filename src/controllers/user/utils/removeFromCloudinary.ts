import { v2 as cloudinary } from "cloudinary";
import debug from "debug";

const log = debug("log:removeFromCloudinaryService");

function extractPublicId(url: string): string | null {
	const urlObj = new URL(url);

	if (urlObj.hostname !== "res.cloudinary.com") return null;

	const parts = urlObj.pathname.split("/");

	return parts[parts.length - 1].split(".")[0] ?? null;
}

const removeFromCloudinary = async (shareLink: string) => {
	const publicId = extractPublicId(shareLink);
	if (!publicId) return;

	log("Removing file from Cloudinary:", publicId);

	try {
		const result = await cloudinary.uploader.destroy(publicId);
		log("removeFromCloudinary", result);
	} catch (error) {
		console.error("Failed to delete file from Cloudinary:", error);
	}
};

export default removeFromCloudinary;
