import { describe, it, expect } from "vitest";
import { stripJSPrefix } from "../src/archive/archive.js";

describe("stripJSPrefix", () => {
  it("strips window.YTD.tweet prefix", () => {
    const input = 'window.YTD.tweet.part0 = [{"id":"1"}]';
    expect(stripJSPrefix(input)).toBe('[{"id":"1"}]');
  });

  it("strips window.YTD.account prefix", () => {
    const input = 'window.YTD.account.part0 = [{"account":{}}]';
    expect(stripJSPrefix(input)).toBe('[{"account":{}}]');
  });

  it("returns unchanged if no bracket found", () => {
    expect(stripJSPrefix("no bracket here")).toBe("no bracket here");
  });

  it("handles empty string", () => {
    expect(stripJSPrefix("")).toBe("");
  });
});
