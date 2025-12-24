import { ethers } from 'ethers';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function addressToBytes(address: string) {
  const normalized = ethers.getAddress(address);
  const hex = normalized.replace('0x', '');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveKeyFromAddress(address: string) {
  const addressBytes = addressToBytes(address);
  const hash = await crypto.subtle.digest('SHA-256', addressBytes);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export function generateRandomAddress() {
  const random = crypto.getRandomValues(new Uint8Array(20));
  const hex = Array.from(random)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return ethers.getAddress(`0x${hex}`);
}

export async function encryptWithAddressKey(plainText: string, address: string) {
  if (!plainText) {
    return '';
  }
  const key = await deriveKeyFromAddress(address);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = encoder.encode(plainText);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const cipherBytes = new Uint8Array(cipherBuffer);
  return `v1:${toBase64(iv)}:${toBase64(cipherBytes)}`;
}

export async function decryptWithAddressKey(payload: string, address: string) {
  if (!payload) {
    return '';
  }
  const [version, ivPart, dataPart] = payload.split(':');
  if (version !== 'v1' || !ivPart || !dataPart) {
    throw new Error('Unsupported payload format');
  }
  const key = await deriveKeyFromAddress(address);
  const iv = fromBase64(ivPart);
  const cipher = fromBase64(dataPart);
  const clearBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return decoder.decode(clearBuffer);
}

export function normalizeDecryptedAddress(value: unknown) {
  try {
    if (typeof value === 'string') {
      if (value.startsWith('0x')) {
        const hex = value.slice(2).padStart(40, '0');
        return ethers.getAddress(`0x${hex}`);
      }
      const hex = BigInt(value).toString(16).padStart(40, '0');
      return ethers.getAddress(`0x${hex}`);
    }
    if (typeof value === 'number') {
      const hex = BigInt(value).toString(16).padStart(40, '0');
      return ethers.getAddress(`0x${hex}`);
    }
    if (typeof value === 'bigint') {
      const hex = value.toString(16).padStart(40, '0');
      return ethers.getAddress(`0x${hex}`);
    }
  } catch (err) {
    console.error('Failed to normalize decrypted address', err);
  }
  return '';
}
