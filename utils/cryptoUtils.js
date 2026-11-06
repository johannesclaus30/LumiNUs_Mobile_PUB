import CryptoJS from "crypto-js";

// Fallback RNG override for CryptoJS so it works in React Native/Hermes without native modules
CryptoJS.lib.WordArray.random = function (nBytes) {
  const words = [];
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const uint8Array = new Uint8Array(nBytes);
    crypto.getRandomValues(uint8Array);
    for (let i = 0; i < nBytes; i += 4) {
      words.push(
        (uint8Array[i] << 24) |
        (uint8Array[i + 1] << 16) |
        (uint8Array[i + 2] << 8) |
        (uint8Array[i + 3] || 0)
      );
    }
  } else {
    for (let i = 0; i < nBytes; i += 4) {
      words.push((Math.random() * 0x100000000) | 0);
    }
  }
  return new CryptoJS.lib.WordArray.init(words, nBytes);
};

const ENCRYPTED_PREFIX = "enc:";
const LEGACY_OPENSSL_PREFIX = "U2FsdGVkX1";

const getSecretKey = () => {
  const key = process.env.EXPO_PUBLIC_MESSAGE_SECRET;
  if (!key) {
    console.error("[Crypto] EXPO_PUBLIC_MESSAGE_SECRET is missing or undefined in environment!");
  }
  return key ? key.trim() : "";
};

export const encryptMessage = (rawText) => {
  if (!rawText) return "";
  const secret = getSecretKey();
  if (!secret) return rawText;

  try {
    const payload = CryptoJS.AES.encrypt(rawText, secret).toString();
    return `${ENCRYPTED_PREFIX}${payload}`;
  } catch (error) {
    console.error("[Crypto] encryptMessage failed:", error);
    return rawText;
  }
};

export const decryptMessage = (cipherText) => {
  if (!cipherText) return "";
  
  let input = String(cipherText).trim();

  // If it's not encrypted, return as plaintext
  if (!input.startsWith(ENCRYPTED_PREFIX) && !input.startsWith(LEGACY_OPENSSL_PREFIX)) {
    return input;
  }

  const secret = getSecretKey();
  if (!secret) {
    console.error("[Crypto] Decrypt aborted: SECRET_KEY not loaded.");
    return "[Unreadable Message]";
  }

  try {
    let payload = input.startsWith(ENCRYPTED_PREFIX)
      ? input.slice(ENCRYPTED_PREFIX.length)
      : input;

    // Fix potential base64 character mangling (spaces instead of '+')
    payload = payload.replace(/ /g, "+");

    const bytes = CryptoJS.AES.decrypt(payload, secret);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    if (!originalText) {
      console.warn("[Crypto] Decryption produced empty text for payload:", payload);
      return "[Unreadable Message]";
    }

    return originalText;
  } catch (err) {
    console.error("[Crypto] decryptMessage threw:", err);
    return "[Encrypted]";
  }
};