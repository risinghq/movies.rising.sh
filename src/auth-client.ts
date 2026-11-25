import { createAuthClient } from "void/client";
import { passkeyClient } from "@better-auth/passkey/client";

// The `auth` export of void/client carries no plugins, and passkey actions run the
// browser WebAuthn ceremony, so they need this client. Pages read the session from
// server props, not from a client store, so a second client keeps no stale state.
export const auth = createAuthClient({ basePath: "/api/auth", plugins: [passkeyClient()] });
