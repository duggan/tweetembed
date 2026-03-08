import { describe, it, expect } from "vitest";
import { extractTweetID } from "../src/input/parse.js";

describe("extractTweetID", () => {
  it("extracts numeric tweet ID", () => {
    expect(extractTweetID("656428954958626816")).toBe("656428954958626816");
  });

  it("extracts ID from twitter.com URL", () => {
    expect(extractTweetID("https://twitter.com/user/status/656428954958626816")).toBe("656428954958626816");
  });

  it("extracts ID from x.com URL", () => {
    expect(extractTweetID("https://x.com/user/status/123456789")).toBe("123456789");
  });

  it("extracts ID from nitter URL", () => {
    expect(extractTweetID("https://xcancel.com/user/status/123456789")).toBe("123456789");
  });

  it("handles whitespace", () => {
    expect(extractTweetID("  656428954958626816  ")).toBe("656428954958626816");
  });

  it("throws on invalid input", () => {
    expect(() => extractTweetID("not-a-tweet")).toThrow();
  });

  it("throws on URL without status", () => {
    expect(() => extractTweetID("https://twitter.com/user")).toThrow();
  });
});
