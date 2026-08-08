import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run hash-password -- <password>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
const envSafeHash = hash.replace(/\$/g, "\\$");

console.log(`bcrypt hash:\n${hash}`);
console.log(`\nNext.js .env（直接使用這一行）：\nAPP_PASSWORD_HASH='${envSafeHash}'`);
