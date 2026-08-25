const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const INDEX = new Map([...ALPHABET].map((character, index) => [character, index]));

export function encodeBase58(bytes) {
  if (!bytes.length) return "";
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      carry += digits[index] << 8;
      digits[index] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let result = "";
  for (let index = 0; index < bytes.length - 1 && bytes[index] === 0; index += 1) result += ALPHABET[0];
  for (let index = digits.length - 1; index >= 0; index -= 1) result += ALPHABET[digits[index]];
  return result;
}

export function decodeBase58(value) {
  if (typeof value !== "string" || !value.length) return Buffer.alloc(0);
  const bytes = [0];
  for (const character of value) {
    const digit = INDEX.get(character);
    if (digit == null) throw new Error(`invalid base58 character: ${character}`);
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let index = 0; index < value.length - 1 && value[index] === ALPHABET[0]; index += 1) bytes.push(0);
  return Buffer.from(bytes.reverse());
}

export function isBase58Address(value) {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) return false;
  try {
    return decodeBase58(value).length === 32;
  } catch {
    return false;
  }
}

export function isTransactionSignature(value) {
  if (typeof value !== "string" || value.length < 64 || value.length > 88) return false;
  try {
    return decodeBase58(value).length === 64;
  } catch {
    return false;
  }
}
