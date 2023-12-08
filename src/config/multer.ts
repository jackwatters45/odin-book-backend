import debug from "debug";
import multer, { MulterError } from "multer";

const log = debug("log:multer");

const upload = multer({
	limits: {
		fileSize: 1024 * 1024 * 50, // limit file size to 50MB
	},
	fileFilter: (req, file, cb) => {
		log(file.mimetype);
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new MulterError("LIMIT_UNEXPECTED_FILE"));
		}
	},
});

export default upload;
