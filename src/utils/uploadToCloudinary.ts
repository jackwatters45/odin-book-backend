import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

const uploadToCloudinary = (buffer: Buffer): Promise<string> => {
	return new Promise((resolve, reject) => {
		const readableStream = Readable.from(buffer);

		const uploadStream = cloudinary.uploader.upload_stream(
			{ resource_type: "image" },
			(error, result) => {
				if (error || !result) reject(error);
				else resolve(result.secure_url);
			},
		);

		readableStream.pipe(uploadStream);
	});
};

export default uploadToCloudinary;
