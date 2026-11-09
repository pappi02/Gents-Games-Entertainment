// Prints new ticket secrets to paste into the host's secret settings.
//   node scripts/generate-ticket-keys.mjs [keyId]
//
// Generate separate values for each environment. Never commit the output.
// Rotating keys: see docs/EVENT_TICKETING.md §7.
import { createPublicKey, generateKeyPairSync, randomBytes } from "node:crypto";

const keyId = process.argv[2] ?? "k1";
if (!/^[a-zA-Z0-9_-]{1,16}$/.test(keyId)) {
  console.error("Key ID must be 1 to 16 letters, numbers, dashes or underscores.");
  process.exit(1);
}

const { privateKey } = generateKeyPairSync("ed25519");
const publicKey = createPublicKey(privateKey).export({ format: "der", type: "spki" }).toString("base64");

console.log(`TICKET_SIGNING_KEY_ID=${keyId}`);
console.log(`TICKET_SIGNING_PRIVATE_KEY=${privateKey.export({ format: "der", type: "pkcs8" }).toString("base64")}`);
console.log(`TICKET_ACCESS_SECRET=${randomBytes(32).toString("base64")}`);
console.log("");
console.log(`# Public key, only needed later if you rotate this key away: ${keyId}:${publicKey}`);
