import { createAuthClient } from "better-auth/react";

/** Same origin, so no baseURL. */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
