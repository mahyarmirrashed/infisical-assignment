import sss from "shamirs-secret-sharing";
import { randomFillSync } from "crypto";

type Expiration = {
  amount: number;
  value: "m" | "h" | "d";
};

const SHORT_ID_LENGTH = parseInt(process.env.SHORT_ID_LENGTH || "8", 10);

/**
 * Converts an expiration object into an ISO UTC timestamp.
 * @param expiration An object with amount and value ("m" for minutes, "h" for hours, "d" for days)
 * @returns A string representing the expiration time in ISO format (Zulu/UTC)
 */
export function calculateExpirationDatetime(expiration: Expiration): string {
  const now = new Date();

  let offset = 0;

  switch (expiration.value) {
    case "m":
      offset = Math.min(expiration.amount, 60) * 60 * 1000;
      break;
    case "h":
      offset = Math.min(expiration.amount, 24) * 60 * 60 * 1000;
      break;
    case "d":
      offset = Math.min(expiration.amount, 7) * 24 * 60 * 60 * 1000;
      break;
  }

  // NOTE: ISO string makes it so that we are consistent in all regions of the world
  return new Date(now.getTime() + offset).toISOString();
}

/**
 * Generates an n-character alphanumeric shortId.
 * @param length The length of the id.
 * @returns A securely generated shortId.
 */
export function generateShortId(length = SHORT_ID_LENGTH): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charsLength = chars.length;
  const maximumValidByte = 256 - (256 % charsLength);

  let id = "";
  while (id.length < length) {
    const randomByte = new Uint8Array(1);
    randomFillSync(randomByte);
    const byte = randomByte[0];
    if (byte < maximumValidByte) {
      id += chars[byte % charsLength];
    }
  }
  return id;
}

/**
 * Reassembles the secret from its fragments.
 * @param fragments An array of hex-encoded shares.
 * @returns The reassembled secret as a string.
 */
export function reassembleSecret(fragments: string[]): string {
  const sharesBuffers = fragments.map((hex) => Buffer.from(hex, "hex"));
  const recoveredBuffer = sss.combine(sharesBuffers);
  return recoveredBuffer.toString("utf-8");
}
