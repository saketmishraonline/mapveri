/**
 * High-performance Bloom Filter for Username Reservation and Uniqueness Verification
 *
 * Implements a space-efficient probabilistic set membership filter with the Kirsch-Mitzenmacher
 * double-hashing technique (h_i(x) = (h1 + i * h2) mod m).
 *
 * Guarantees ZERO false negatives:
 * If mightContain(x) is false -> Username is GUARANTEED to be neither reserved nor taken.
 * If mightContain(x) is true  -> Checked against exact reserved dictionary and PostgreSQL database.
 */

// Comprehensive dictionary of system-reserved handles and keywords
export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "mapveri",
  "moderator",
  "support",
  "help",
  "api",
  "auth",
  "oauth",
  "null",
  "undefined",
  "system",
  "official",
  "superuser",
  "staff",
  "security",
  "privacy",
  "terms",
  "bot",
  "robot",
  "dev",
  "developer",
  "tester",
  "test",
  "demo",
  "map",
  "pins",
  "verification",
  "verify",
  "account",
  "profile",
  "login",
  "register",
  "signup",
  "signin",
  "logout",
  "dashboard",
  "team",
  "contact",
  "about",
  "legal",
  "explore",
  "settings",
  "billing",
  "webhook",
  "status",
  "guest",
  "public",
  "anonymous",
  "google",
  "zoho",
  "outlook",
  "microsoft",
  "supabase",
]);

export class BloomFilter {
  private size: number; // number of bits (m)
  private hashCount: number; // number of hash functions (k)
  private bitArray: Uint8Array;

  constructor(size = 4096, hashCount = 4) {
    this.size = size;
    this.hashCount = hashCount;
    this.bitArray = new Uint8Array(Math.ceil(size / 8));
  }

  // FNV-1a 32-bit Hash
  private fnv1a(str: string, seed = 0x811c9dc5): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  // Murmur-inspired 32-bit Hash
  private murmur3(str: string, seed = 42): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = Math.imul(hash ^ str.charCodeAt(i), 0x5bd1e995);
      hash ^= hash >>> 15;
    }
    return hash >>> 0;
  }

  /**
   * Adds an element (normalized lowercase string) into the Bloom filter
   */
  public add(item: string): void {
    const normalized = item.trim().toLowerCase();
    const h1 = this.fnv1a(normalized);
    const h2 = this.murmur3(normalized);

    for (let i = 0; i < this.hashCount; i++) {
      const bitPosition = (h1 + i * h2) % this.size;
      const byteIndex = Math.floor(bitPosition / 8);
      const bitOffset = bitPosition % 8;
      this.bitArray[byteIndex] |= 1 << bitOffset;
    }
  }

  /**
   * Tests whether an element might be in the set
   * Returns false -> 100% guarantee NOT in set (not reserved / not taken)
   * Returns true  -> Might be in set (requires verification against reserved set / DB)
   */
  public mightContain(item: string): boolean {
    const normalized = item.trim().toLowerCase();
    const h1 = this.fnv1a(normalized);
    const h2 = this.murmur3(normalized);

    for (let i = 0; i < this.hashCount; i++) {
      const bitPosition = (h1 + i * h2) % this.size;
      const byteIndex = Math.floor(bitPosition / 8);
      const bitOffset = bitPosition % 8;
      if ((this.bitArray[byteIndex] & (1 << bitOffset)) === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Clears the filter bitset
   */
  public clear(): void {
    this.bitArray.fill(0);
  }
}

// Global Singleton Instance
export const usernameBloomFilter = new BloomFilter(8192, 5);

// Pre-populate with all system reserved usernames
for (const reserved of RESERVED_USERNAMES) {
  usernameBloomFilter.add(reserved);
}

/**
 * Validates username syntax rules:
 * - 3 to 20 characters
 * - Letters, numbers, and underscores only
 * - Must not start or end with an underscore
 */
export function validateUsernameFormat(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required." };
  }

  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters." };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: "Username cannot exceed 20 characters." };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: "Username can only contain letters, numbers, and underscores." };
  }
  if (trimmed.startsWith("_") || trimmed.endsWith("_")) {
    return { valid: false, error: "Username cannot begin or end with an underscore." };
  }

  return { valid: true };
}
