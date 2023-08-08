# Odin Book Backend

## Next

- fix broken

- posts - file uploads

## once ready

- notifications test + routes
- for passport config check if email associated with facebook etc doesn't already exist

## User mock

// Mock Passport Authentication
// let isUserUndefined = false;
// let isRandomUser = false;
// let isAdminUser = true;

// jest.mock("passport", () => ({
// authenticate: jest.fn((strategy, options) => {
// return async (req: IRequestWithUser, res: Response, next: NextFunction) => {
// if (isUserUndefined) req.user = undefined;
// else if (isRandomUser) req.user = randomUser;
// else if (isAdminUser) req.user = adminUser;
// else req.user = standardUser;
// next();
// };
// }),
// }));
