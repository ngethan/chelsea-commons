/**
 * Rejection codes that cross from the server to the sign-in page as a query
 * parameter. Their own module so the page can name one without importing
 * `lib/auth.ts`, which would pull Better Auth and the database driver into
 * the browser bundle.
 */
export const NOT_INVITED = "not_invited";
