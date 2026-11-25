import { describe, expect, it } from "vitest";
import { withPasskeyMessage } from "./passkey-errors";

describe("withPasskeyMessage", () => {
  it("replaces a known code's message", () => {
    const result = withPasskeyMessage({
      data: null,
      error: {
        code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED",
        message: "Previously registered",
      },
    });
    expect(result.error?.message).toBe("this device already holds a passkey for your account");
  });

  it("keeps an unknown code's message", () => {
    const result = withPasskeyMessage({
      data: null,
      error: { code: "OTHER", message: "server said no" },
    });
    expect(result.error?.message).toBe("server said no");
  });

  it("passes a success through", () => {
    const result = { data: { id: "p1" }, error: null };
    expect(withPasskeyMessage(result)).toBe(result);
  });
});
