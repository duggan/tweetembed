const numericRe = /^\d+$/;
const statusRe = /\/status\/(\d+)/;

/** Extract a tweet ID from a raw tweet ID, Twitter/X URL, or Nitter URL. */
export function extractTweetID(input: string): string {
  input = input.trim();

  if (numericRe.test(input)) {
    return input;
  }

  try {
    const u = new URL(input);
    const m = statusRe.exec(u.pathname);
    if (m) {
      return m[1];
    }
  } catch {
    // not a valid URL
  }

  throw new Error(`could not extract tweet ID from "${input}"`);
}
