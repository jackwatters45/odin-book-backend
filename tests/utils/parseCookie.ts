import debug from "debug";

interface CookieObject {
	Expires: Date;
	Path: string;
	HttpOnly: undefined;
	[key: string]: string | Date | undefined;
}
export const parseCookie = (cookieString: string) => {
	const cookieArray = cookieString.split("; ");
	const cookieObject: Record<string, unknown> = {};

	for (let i = 0; i < cookieArray.length; i++) {
		const [key, value] = cookieArray[i].split("=");
		if (key === "Expires") {
			cookieObject[key] = new Date(value);
		} else {
			cookieObject[key] = value;
		}
	}

	return cookieObject as CookieObject;
};

export const parseCookies = (cookieStrings: string[]) => {
	return cookieStrings.map((cookieString) => parseCookie(cookieString));
};
