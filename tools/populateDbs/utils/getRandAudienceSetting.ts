import { faker } from "@faker-js/faker";

import { AudienceStatusOptionsType } from "../../../src/constants";

const getRandAudienceSetting = (): AudienceStatusOptionsType =>
	faker.datatype.boolean() ? "Public" : "Friends";

export default getRandAudienceSetting;
