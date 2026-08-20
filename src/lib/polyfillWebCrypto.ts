/**
 * Hermes / React Native ships `crypto` without a usable SubtleCrypto (and
 * sometimes without `getRandomValues` or `btoa`). Supabase PKCE then either
 * falls back to "plain" or throws `undefined is not a function` on Google
 * sign-in. This JS polyfill is enough for S256 and does not need a new
 * native module.
 */
import * as nobleSha2 from "@noble/hashes/sha2.js";

type Sha256Fn = (data: Uint8Array) => Uint8Array;

function resolveSha256(): Sha256Fn {
  const mod = nobleSha2 as {
    sha256?: Sha256Fn;
    default?: Sha256Fn | { sha256?: Sha256Fn };
  };

  if (typeof mod.sha256 === "function") return mod.sha256;

  if (typeof mod.default === "function") return mod.default;

  if (mod.default && typeof mod.default.sha256 === "function") {
    return mod.default.sha256;
  }

  throw new Error("SHA-256 implementation is unavailable");
}

const sha256 = resolveSha256();

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function asUint8Array(data: BufferSource): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new TypeError("crypto.subtle.digest expected a BufferSource");
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function algorithmName(algorithm: AlgorithmIdentifier): string {
  if (typeof algorithm === "string") return algorithm;
  return algorithm.name;
}

async function digest(
  algorithm: AlgorithmIdentifier,
  data: BufferSource,
): Promise<ArrayBuffer> {
  const name = algorithmName(algorithm).toUpperCase();
  if (name !== "SHA-256" && name !== "SHA256") {
    throw new Error(`Unsupported digest algorithm: ${name}`);
  }
  return bytesToArrayBuffer(sha256(asUint8Array(data)));
}

function fallbackGetRandomValues<T extends ArrayBufferView>(values: T): T {
  const bytes = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return values;
}

function defineGlobal(name: string, value: unknown): void {
  try {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      enumerable: true,
      writable: true,
      value,
    });
  } catch {
    (globalThis as Record<string, unknown>)[name] = value;
  }
}

function cryptoIsReady(cryptoRef: Crypto | undefined): boolean {
  return (
    typeof cryptoRef?.getRandomValues === "function" &&
    typeof cryptoRef.subtle?.digest === "function"
  );
}

/** Supabase PKCE calls `btoa` after SHA-256. Hermes preview builds may omit it. */
function polyfillBase64(): void {
  if (typeof globalThis.btoa !== "function") {
    defineGlobal("btoa", (input: string) => {
      const source = String(input);
      let output = "";
      for (let index = 0; index < source.length; index += 3) {
        const a = source.charCodeAt(index) & 0xff;
        const hasB = index + 1 < source.length;
        const hasC = index + 2 < source.length;
        const b = hasB ? source.charCodeAt(index + 1) & 0xff : 0;
        const c = hasC ? source.charCodeAt(index + 2) & 0xff : 0;
        const triplet = (a << 16) | (b << 8) | c;
        output += BASE64_ALPHABET[(triplet >> 18) & 63];
        output += BASE64_ALPHABET[(triplet >> 12) & 63];
        output += hasB ? BASE64_ALPHABET[(triplet >> 6) & 63] : "=";
        output += hasC ? BASE64_ALPHABET[triplet & 63] : "=";
      }
      return output;
    });
  }

  if (typeof globalThis.atob !== "function") {
    defineGlobal("atob", (input: string) => {
      const source = String(input).replace(/[^A-Za-z0-9+/=]/g, "");
      let output = "";
      for (let index = 0; index < source.length; index += 4) {
        const encodedA = BASE64_ALPHABET.indexOf(source[index] ?? "A");
        const encodedB = BASE64_ALPHABET.indexOf(source[index + 1] ?? "A");
        const encodedC = BASE64_ALPHABET.indexOf(source[index + 2] ?? "A");
        const encodedD = BASE64_ALPHABET.indexOf(source[index + 3] ?? "A");
        output += String.fromCharCode((encodedA << 2) | (encodedB >> 4));
        if (source[index + 2] !== "=") {
          output += String.fromCharCode(((encodedB & 15) << 4) | (encodedC >> 2));
        }
        if (source[index + 3] !== "=") {
          output += String.fromCharCode(((encodedC & 3) << 6) | encodedD);
        }
      }
      return output;
    });
  }
}

function bindGetRandomValues(
  cryptoRef: Crypto | undefined,
): Crypto["getRandomValues"] {
  if (typeof cryptoRef?.getRandomValues === "function") {
    return cryptoRef.getRandomValues.bind(cryptoRef);
  }
  return fallbackGetRandomValues;
}

function patchCryptoField(
  cryptoRef: Crypto,
  key: "getRandomValues" | "subtle",
  value: unknown,
): void {
  try {
    Object.defineProperty(cryptoRef, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value,
    });
  } catch {
    (cryptoRef as unknown as Record<string, unknown>)[key] = value;
  }
}

export function polyfillWebCrypto(): void {
  polyfillBase64();

  const existing = globalThis.crypto;
  if (cryptoIsReady(existing)) return;

  const getRandomValues = bindGetRandomValues(existing);
  const existingDigest = existing?.subtle?.digest;
  const digestFn =
    typeof existingDigest === "function"
      ? existingDigest.bind(existing.subtle)
      : digest;

  const nextCrypto = {
    getRandomValues,
    subtle: { digest: digestFn },
  } as Crypto;

  defineGlobal("crypto", nextCrypto);
  if (cryptoIsReady(globalThis.crypto)) return;

  if (existing) {
    patchCryptoField(existing, "getRandomValues", getRandomValues);
    patchCryptoField(existing, "subtle", nextCrypto.subtle);
  }
}

polyfillWebCrypto();
