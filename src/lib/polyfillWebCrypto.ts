/**
 * Hermes does not implement `crypto.subtle`. Supabase PKCE then falls back
 * from SHA-256 to "plain" and logs a warning. This JS digest is enough for
 * S256 and does not need a new native build.
 */
import { sha256 } from "@noble/hashes/sha2.js";

function asUint8Array(data: BufferSource): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new TypeError("crypto.subtle.digest expected a BufferSource");
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
  const hash = sha256(asUint8Array(data));
  return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
}

function installSubtle(cryptoRef: Crypto, subtle: SubtleCrypto): void {
  try {
    Object.defineProperty(cryptoRef, "subtle", {
      configurable: true,
      enumerable: true,
      value: subtle,
    });
  } catch {
    (cryptoRef as { subtle: SubtleCrypto }).subtle = subtle;
  }
}

export function polyfillWebCrypto(): void {
  const cryptoRef = globalThis.crypto;
  if (typeof cryptoRef?.subtle?.digest === "function") return;

  const subtle = { digest } as SubtleCrypto;

  if (cryptoRef) {
    installSubtle(cryptoRef, subtle);
    return;
  }

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    enumerable: true,
    value: { subtle } as Crypto,
  });
}

polyfillWebCrypto();
