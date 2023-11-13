import { faker } from "@faker-js/faker";

const createRandomBasicAndLoginInfo = (birthDay: Date) => {
	const randomValue = faker.number.int(99);

	let genderDefaultType;
	if (randomValue < 45) {
		genderDefaultType = "Male";
	} else if (randomValue < 90) {
		genderDefaultType = "Female";
	} else if (randomValue < 95) {
		genderDefaultType = "Nonbinary";
	} else {
		genderDefaultType = "Other";
	}

	const gender = {
		defaultType: genderDefaultType,
		other: genderDefaultType === "Other" ? faker.person.gender() : undefined,
	};

	const pronouns =
		genderDefaultType === "Female"
			? "she/her"
			: genderDefaultType === "Male"
			? "he/him"
			: "they/them";

	const firstName =
		genderDefaultType === "Female" || genderDefaultType === "Male"
			? faker.person.firstName(
					genderDefaultType.toLowerCase() as "female" | "male",
			  )
			: faker.person.firstName();
	const lastName = faker.person.lastName();
	const fullName = `${firstName} ${lastName}`;
	const birthday = birthDay;

	const email = faker.internet.email({
		firstName,
		lastName,
	});
	const phoneNumber = faker.phone.number("+1##########");
	const password = faker.internet.password({ length: 10, prefix: "Aa1!" });

	return {
		firstName,
		lastName,
		fullName,
		birthday,
		email,
		phoneNumber,
		password,
		gender,
		pronouns,
	};
};

export default createRandomBasicAndLoginInfo;
