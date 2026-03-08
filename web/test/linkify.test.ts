import { describe, it, expect } from "vitest";
import { linkifyText } from "../src/render/linkify.js";
import type { Tweet } from "../src/archive/types.js";

function makeTweet(overrides: Partial<Tweet> = {}): Tweet {
  return {
    id_str: "1",
    full_text: "Hello world",
    created_at: "Mon Jan 01 00:00:00 +0000 2020",
    favorite_count: "0",
    retweet_count: "0",
    retweeted: false,
    in_reply_to_screen_name: "",
    in_reply_to_status_id_str: "",
    entities: { hashtags: [], urls: [], user_mentions: [] },
    display_text_range: ["0", "11"],
    ...overrides,
  };
}

describe("linkifyText", () => {
  it("passes through plain text", () => {
    const tweet = makeTweet({ full_text: "Hello world" });
    expect(linkifyText(tweet)).toBe("Hello world");
  });

  it("linkifies @mentions", () => {
    const tweet = makeTweet({
      full_text: "Hello @jack!",
      entities: {
        hashtags: [],
        urls: [],
        user_mentions: [
          { name: "Jack", screen_name: "jack", indices: ["6", "11"], id_str: "1" },
        ],
      },
    });
    const result = linkifyText(tweet);
    expect(result).toContain('href="https://twitter.com/jack"');
    expect(result).toContain("@jack</a>");
  });

  it("linkifies #hashtags", () => {
    const tweet = makeTweet({
      full_text: "Hello #world",
      entities: {
        hashtags: [{ text: "world", indices: ["6", "12"] }],
        urls: [],
        user_mentions: [],
      },
    });
    const result = linkifyText(tweet);
    expect(result).toContain('href="https://twitter.com/hashtag/world"');
    expect(result).toContain("#world</a>");
  });

  it("linkifies URLs", () => {
    const tweet = makeTweet({
      full_text: "Check https://t.co/abc out",
      entities: {
        hashtags: [],
        urls: [
          {
            url: "https://t.co/abc",
            expanded_url: "https://example.com",
            display_url: "example.com",
            indices: ["6", "22"],
          },
        ],
        user_mentions: [],
      },
    });
    const result = linkifyText(tweet);
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain("example.com</a>");
  });

  it("removes media URLs", () => {
    const tweet = makeTweet({
      full_text: "Photo https://t.co/img",
      entities: {
        hashtags: [],
        urls: [],
        user_mentions: [],
        media: [
          {
            media_url: "",
            media_url_https: "",
            url: "https://t.co/img",
            expanded_url: "",
            display_url: "",
            id_str: "1",
            type: "photo",
            indices: ["6", "22"],
            sizes: {},
          },
        ],
      },
    });
    const result = linkifyText(tweet);
    expect(result).toBe("Photo");
  });

  it("converts newlines to <br>", () => {
    const tweet = makeTweet({ full_text: "Line 1\nLine 2" });
    expect(linkifyText(tweet)).toBe("Line 1<br>Line 2");
  });

  it("handles emoji (surrogate pairs) with correct indices", () => {
    // "Hello 😀 @jack" - emoji is 2 UTF-16 code units
    // 😀 is at indices 6-8 (2 code units), space at 8, @jack at 9-14
    const tweet = makeTweet({
      full_text: "Hello 😀 @jack",
      entities: {
        hashtags: [],
        urls: [],
        user_mentions: [
          { name: "Jack", screen_name: "jack", indices: ["9", "14"], id_str: "1" },
        ],
      },
    });
    const result = linkifyText(tweet);
    expect(result).toContain("Hello 😀");
    expect(result).toContain("@jack</a>");
  });
});
