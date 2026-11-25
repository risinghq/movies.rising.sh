type PasskeyResult = { error: { code?: string; message?: string } | null };

// Error codes the passkey client returns. A cancelled or timed-out browser prompt
// surfaces during registration as the passthrough code with the browser's own
// wording, and during sign-in as AUTH_CANCELLED. Server rejections keep the
// server's code.
const messages: Record<string, string> = {
  ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED: "this device already holds a passkey for your account",
  ERROR_CEREMONY_ABORTED: "no passkey was added",
  ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY: "no passkey was added",
  AUTH_CANCELLED: "passkey sign-in did not finish",
  PASSKEY_NOT_FOUND: "this passkey is no longer on any account; sign in with your password",
  AUTHENTICATION_FAILED: "passkey sign-in failed",
};

export function withPasskeyMessage<T extends PasskeyResult>(result: T): T {
  const text = result.error?.code ? messages[result.error.code] : undefined;
  return text && result.error ? { ...result, error: { ...result.error, message: text } } : result;
}
