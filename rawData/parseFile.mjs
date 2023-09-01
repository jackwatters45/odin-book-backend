import fs from "fs";
import Papa from "papaparse";

const parseFile = (inputPath, outputPath, arrayName) => {
	const csvFile = fs.readFileSync(inputPath, "utf8");

	const hobbies = [];
	Papa.parse(csvFile, {
		header: true,
		step: (row) => {
			// Assuming the column name in your CSV is 'hobby'
			hobbies.push(row.data.HOBBIES);
		},
		complete: () => {
			// Convert the hobbies array to desired string format
			const hobbiesString = `const ${arrayName}Bank = ${JSON.stringify(
				hobbies,
			)};
			
			export default ${arrayName}Bank;
			`;
			// Write the string to the output file
			fs.writeFileSync(outputPath, hobbiesString, "utf8");
		},
	});
};

parseFile("./rawData/hobbies.csv", "./src/models/data/hobbies.ts");
