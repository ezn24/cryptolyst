import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { normalizeBcryptHash, verifyBcryptPassword } from "@/lib/auth/password";

const plaintext = "Generator-compatible-password!";
const hash2b = bcrypt.hashSync(plaintext, 4);

describe("bcrypt password compatibility", () => {
  it.each(["2a", "2b", "2y"])("accepts $%s$ hashes", async (prefix) => {
    const hash = hash2b.replace(/^\$2b\$/, `$${prefix}$`);
    await expect(verifyBcryptPassword(plaintext, hash)).resolves.toBe(true);
  });

  it("normalizes quotes and Docker dollar escaping", () => {
    const escaped = `'${hash2b.replace(/\$/g, () => "$$")}'`;
    expect(normalizeBcryptHash(escaped)).toBe(hash2b);
  });

  it("normalizes Next.js dotenv dollar escaping", () => {
    const escaped = `'${hash2b.replace(/\$/g, "\\$")}'`;
    expect(normalizeBcryptHash(escaped)).toBe(hash2b);
  });

  it("rejects a wrong plaintext password", async () => {
    await expect(verifyBcryptPassword("wrong-password", hash2b)).resolves.toBe(false);
  });

  it("rejects malformed hashes with a clear error", () => {
    expect(() => normalizeBcryptHash("not-a-bcrypt-hash")).toThrow("invalid bcrypt format");
  });
});
