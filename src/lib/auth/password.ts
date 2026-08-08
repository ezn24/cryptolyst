import bcrypt from "bcryptjs";

const bcryptPattern = /^\$2[ab]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/;

export function normalizeBcryptHash(value: string | undefined) {
  if (!value?.trim()) throw new Error("APP_PASSWORD_HASH is not configured.");

  let hash = value.trim();
  const quoted = (hash.startsWith('"') && hash.endsWith('"')) || (hash.startsWith("'") && hash.endsWith("'"));
  if (quoted) hash = hash.slice(1, -1).trim();
  hash = hash.replace(/\\\$/g, "$").replace(/\$\$/g, "$");
  if (hash.startsWith("$2y$")) hash = `$2b$${hash.slice(4)}`;

  if (!bcryptPattern.test(hash)) {
    throw new Error("APP_PASSWORD_HASH has an invalid bcrypt format. Expected a 60-character $2a$, $2b$, or $2y$ hash.");
  }
  return hash;
}

export function verifyBcryptPassword(password: string, configuredHash: string | undefined) {
  return bcrypt.compare(password, normalizeBcryptHash(configuredHash));
}

