import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import debug from "debug";

const log = debug("log:uploadToCloudinaryService");

export const uploadFileToCloudinary = (buffer: Buffer): Promise<string> => {
	return new Promise((resolve, reject) => {
		const readableStream = Readable.from(buffer);

		const uploadStream = cloudinary.uploader.upload_stream(
			{ resource_type: "image" },
			(error, result) => {
				if (error) {
					log("Error uploading to cloudinary", error);
					reject(error);
				} else if (!result) {
					log("No result from cloudinary upload");
					reject(new Error("No result from cloudinary"));
				} else {
					log("Upload successful");
					resolve(result.secure_url);
				}
			},
		);

		uploadStream.on("error", (err) => {
			log("Error in uploadStream", err);
			reject(err);
		});

		readableStream.pipe(uploadStream);

		readableStream.on("error", (err) => {
			log("Error in readableStream", err);
			reject(err);
		});
	});
};

export const uploadFilesToCloudinary = async (
	files: Buffer[],
): Promise<string[]> => {
	return await Promise.all(files.map((file) => uploadFileToCloudinary(file)));
};
