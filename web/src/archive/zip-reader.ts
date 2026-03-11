import { unzip } from "unzipit";
import type { FileReader } from "./types.js";

interface ZipEntry {
  name: string;
  isDirectory: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * ZipReader reads archive files from a zip file using unzipit.
 * Individual entries are decompressed on demand.
 */
export class ZipReader implements FileReader {
  private prefix: string;
  private index: Map<string, ZipEntry>;

  private constructor(
    prefix: string,
    index: Map<string, ZipEntry>,
  ) {
    this.prefix = prefix;
    this.index = index;
  }

  static async fromFile(file: File | Blob | ArrayBuffer): Promise<ZipReader> {
    const buf = file instanceof ArrayBuffer
      ? file
      : await (file as Blob).arrayBuffer();

    const { entries } = await unzip(buf);

    const allPaths = Object.keys(entries);
    const prefix = detectPrefix(allPaths, entries);

    const index = new Map<string, ZipEntry>();
    for (const [path, entry] of Object.entries(entries)) {
      if (entry.isDirectory) continue;
      const name = path.startsWith(prefix)
        ? path.slice(prefix.length)
        : path;
      index.set(normalizePath(name), entry);
    }

    return new ZipReader(prefix, index);
  }

  async readFile(name: string): Promise<Uint8Array> {
    name = normalizePath(name);
    const entry = this.index.get(name);
    if (!entry) {
      throw new Error(`file not found in zip: ${name}`);
    }
    const buf = await entry.arrayBuffer();
    return new Uint8Array(buf);
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

/** Detect the common directory prefix shared by all file paths. */
function detectPrefix(
  paths: string[],
  entries: Record<string, ZipEntry>,
): string {
  let prefix = "";
  let foundFirst = false;

  for (const p of paths) {
    if (entries[p].isDirectory) continue;
    if (!foundFirst) {
      const idx = p.indexOf("/");
      if (idx >= 0) {
        prefix = p.slice(0, idx + 1);
      }
      foundFirst = true;
      continue;
    }
    if (prefix && !p.startsWith(prefix)) {
      return "";
    }
  }

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
