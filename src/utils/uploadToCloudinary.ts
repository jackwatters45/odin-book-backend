import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

export const uploadFileToCloudinary = (buffer: Buffer): Promise<string> => {
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

export const uploadFilesToCloudinary = async (
	files: Buffer[],
): Promise<string[]> => {
	return await Promise.all(files.map((file) => uploadFileToCloudinary(file)));
};
