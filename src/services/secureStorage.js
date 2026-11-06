import * as SecureStore from "expo-secure-store";

const SECURE_STORE_CHUNK_SIZE = 1800;
const chunkMetaKey = (key) => `${key}__chunk_count`;
const chunkKey = (key, index) => `${key}__chunk_${index}`;

const removeChunkedValue = async (key) => {
  const count = Number(await SecureStore.getItemAsync(chunkMetaKey(key)));
  if (Number.isFinite(count) && count > 0) {
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)),
      ),
    );
  }
  await SecureStore.deleteItemAsync(chunkMetaKey(key));
};

export const saveSecureItem = async (key, value) => {
  const text = String(value ?? "");
  await removeChunkedValue(key);

  if (text.length <= SECURE_STORE_CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, text, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    return;
  }

  await SecureStore.deleteItemAsync(key);
  const chunks = [];
  for (let index = 0; index < text.length; index += SECURE_STORE_CHUNK_SIZE) {
    chunks.push(text.slice(index, index + SECURE_STORE_CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map((chunk, index) =>
      SecureStore.setItemAsync(chunkKey(key, index), chunk, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      }),
    ),
  );
  await SecureStore.setItemAsync(chunkMetaKey(key), String(chunks.length), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
};

export const getSecureItem = async (key) => {
  const directValue = await SecureStore.getItemAsync(key);
  if (typeof directValue === "string") return directValue;

  const count = Number(await SecureStore.getItemAsync(chunkMetaKey(key)));
  if (!Number.isFinite(count) || count <= 0) return null;

  const chunks = await Promise.all(
    Array.from({ length: count }, (_, index) =>
      SecureStore.getItemAsync(chunkKey(key, index)),
    ),
  );
  return chunks.every((chunk) => typeof chunk === "string") ? chunks.join("") : null;
};

export const deleteSecureItem = async (key) => {
  await SecureStore.deleteItemAsync(key);
  await removeChunkedValue(key);
};

export const secureStorage = {
  getItem: getSecureItem,
  setItem: saveSecureItem,
  removeItem: deleteSecureItem,
};
