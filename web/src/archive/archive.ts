import type { Archive, Account, Profile, Tweet, FileReader } from "./types.js";

/** Load tweet, account, and profile data from the archive FileReader. */
export async function loadArchive(files: FileReader): Promise<Archive> {
  const [tweets, account, profile] = await Promise.all([
    loadTweets(files),
    loadAccount(files),
    loadProfile(files),
  ]);

  const tweetMap = new Map<string, Tweet>();
  for (const t of tweets) {
    tweetMap.set(t.id_str, t);
  }

  return { files, account, profile, tweetMap };
}

/** Look up a tweet by ID. */
export function findTweet(archive: Archive, id: string): Tweet | undefined {
  return archive.tweetMap.get(id);
}

/** Strip the "window.YTD.*.part0 = " prefix from a .js data file. */
export function stripJSPrefix(text: string): string {
  const idx = text.indexOf("[");
  return idx < 0 ? text : text.slice(idx);
}

async function loadTweets(files: FileReader): Promise<Tweet[]> {
  const data = await files.readFile("tweet.js");
  const text = new TextDecoder().decode(data);
  const raw = stripJSPrefix(text);
  const parsed: Tweet[] = JSON.parse(raw);
  return parsed;
}

async function loadAccount(files: FileReader): Promise<Account> {
  const data = await files.readFile("account.js");
  const text = new TextDecoder().decode(data);
  const raw = stripJSPrefix(text);
  const wrappers: Array<{ account: Account }> = JSON.parse(raw);
  if (wrappers.length === 0) {
    throw new Error("no account data in account.js");
  }
  return wrappers[0].account;
}

async function loadProfile(files: FileReader): Promise<Profile> {
  const data = await files.readFile("profile.js");
  const text = new TextDecoder().decode(data);
  const raw = stripJSPrefix(text);
  const wrappers: Array<{ profile: Profile }> = JSON.parse(raw);
  if (wrappers.length === 0) {
    throw new Error("no profile data in profile.js");
  }
  return wrappers[0].profile;
}
