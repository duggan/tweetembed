import JSZip from "jszip";
import type { FileReader } from "./types.js";

/**
 * ZipReader reads archive files from a zip file using JSZip.
 * Individual entries are decompressed on demand.
 */
export class ZipReader implements FileReader {
  private zip: JSZip;
  private prefix: string;
  private index: Map<string, JSZip.JSZipObject>;

  private constructor(
    zip: JSZip,
    prefix: string,
    index: Map<string, JSZip.JSZipObject>,
  ) {
    this.zip = zip;
    this.prefix = prefix;
    this.index = index;
  }

  static async fromFile(file: File | Blob | ArrayBuffer): Promise<ZipReader> {
    const zip = await JSZip.loadAsync(file);

    const prefix = detectPrefix(zip);

    const index = new Map<string, JSZip.JSZipObject>();
    zip.forEach((relativePath, entry) => {
      if (entry.dir) return;
      const name = relativePath.startsWith(prefix)
        ? relativePath.slice(prefix.length)
        : relativePath;
      index.set(normalizePath(name), entry);
    });

    return new ZipReader(zip, prefix, index);
  }

  async readFile(name: string): Promise<Uint8Array> {
    name = normalizePath(name);
    const entry = this.index.get(name);
    if (!entry) {
      throw new Error(`file not found in zip: ${name}`);
    }
    return entry.async("uint8array");
  }

  glob(pattern: string): string[] {
    pattern = normalizePath(pattern);
    const matches: string[] = [];
    for (const name of this.index.keys()) {
      if (globMatch(pattern, name)) {
        matches.push(name);
      }
    }
    return matches;
  }

  filenames(): string[] {
    return Array.from(this.index.keys());
  }
}

/** Detect the common directory prefix shared by all files in the zip. */
function detectPrefix(zip: JSZip): string {
  let prefix = "";
  let first = true;

  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    if (first) {
      const idx = relativePath.indexOf("/");
      if (idx >= 0) {
        prefix = relativePath.slice(0, idx + 1);
      }
      first = false;
      return;
    }
    if (prefix && !relativePath.startsWith(prefix)) {
      prefix = "";
    }
  });

  return prefix;
}

/** Normalize path separators and remove leading ./ */
function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * Simple glob matching supporting * and ? wildcards.
 * Matches path.Match semantics from Go's path package.
 */
function globMatch(pattern: string, name: string): boolean {
  let pi = 0;
  let ni = 0;
  let starPi = -1;
  let starNi = -1;

  while (ni < name.length) {
    if (pi < pattern.length && (pattern[pi] === name[ni] || pattern[pi] === "?")) {
      pi++;
      ni++;
    } else if (pi < pattern.length && pattern[pi] === "*") {
      starPi = pi;
      starNi = ni;
      pi++;
    } else if (starPi >= 0) {
      pi = starPi + 1;
      starNi++;
      ni = starNi;
    } else {
      return false;
    }
  }

  while (pi < pattern.length && pattern[pi] === "*") {
    pi++;
  }

  return pi === pattern.length;
}
