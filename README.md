# tweetembed

A CLI tool that turns tweets from a Twitter archive into standalone, self-contained HTML documents — no JavaScript, no external requests, no tracking. Just a single HTML file you can embed anywhere.

Images, GIFs, and videos are base64-encoded directly into the HTML, so each file works completely offline. Works directly with the archive zip file — no need to extract first.

## Web version

Use tweetembed directly in your browser at **[duggan.github.io/tweetembed](https://duggan.github.io/tweetembed/)** — no install required. Drop your archive zip, enter a tweet ID, and render it in-page. Works offline; nothing is uploaded.

## CLI Install

### Homebrew

```sh
brew install duggan/tap/tweetembed
```

### From a release

Download the latest binary for your platform from the [releases page](https://github.com/duggan/tweetembed/releases).

### From source

Requires Go 1.21+. No external dependencies.

```sh
go install github.com/duggan/tweetembed@latest
```

Or clone and build:

```sh
git clone https://github.com/duggan/tweetembed.git
cd tweetembed
go build -o tweetembed .
```

## Usage

```
tweetembed [flags] <tweet-id-or-url>
```

The input can be any of:

- A tweet ID: `656428954958626816`
- A Twitter/X URL: `https://twitter.com/duggan/status/656428954958626816`
- A Nitter URL: `https://xcancel.com/duggan/status/656428954958626816`

### Examples

```sh
# Output to stdout
tweetembed 656428954958626816

# Save to a file
tweetembed -o tweet.html 656428954958626816

# Dark theme
tweetembed -theme dark -o tweet.html 656428954958626816

# Use the X logo instead of the classic bird
tweetembed -logo x -o tweet.html 656428954958626816

# From a URL (any Twitter, X, or Nitter URL works)
tweetembed -o tweet.html https://xcancel.com/duggan/status/656428954958626816

# Use a zip archive directly
tweetembed -archive twitter-archive.zip -o tweet.html 656428954958626816
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `-archive` | auto-detect | Path to the Twitter archive directory or zip file |
| `-o` | stdout | Output file |
| `-theme` | `light` | `light` or `dark` |
| `-logo` | `bird` | `bird` (classic) or `x` |
| `-version` | | Print version and exit |

## Twitter archive setup

This tool reads from a [Twitter data archive](https://help.twitter.com/en/managing-your-account/how-to-download-your-twitter-archive). It works with both extracted archive directories and the original zip file — no need to unzip.

- Run `tweetembed` from the directory containing the archive (it auto-detects `twitter-*` folders and `twitter-*.zip` files), or
- Point to it explicitly with `-archive /path/to/twitter-2019-11-20-abc123/` or `-archive /path/to/twitter-archive.zip`

## What it renders

- Author name, avatar, and @username
- Tweet text with linked @mentions, #hashtags, and URLs
- Embedded photos, animated GIFs (autoplay), and videos
- Reply indicators
- Like and retweet counts
- Timestamp linking back to the original tweet

## Releasing

Releases are built with [GoReleaser](https://goreleaser.com/). To create a release:

```sh
git tag v0.1.0
git push origin v0.1.0
goreleaser release --clean
```

## License

MIT
