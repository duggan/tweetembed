# tweetembed

Converts tweets from a Twitter archive into standalone HTML. Two implementations sharing the same design:

## Go CLI (`/`)
- Zero external dependencies, pure Go standard library
- Entry point: `main.go`
- `archive/` — `FileReader` interface, `DirReader`, `ZipReader`, tweet/account/profile loading
- `render/` — HTML template, CSS, `linkifyText` (UTF-16 index handling), media embedding (base64)
- `input/` — Tweet ID extraction from URLs
- Build: `go build -o tweetembed .`
- Test archive in repo: `twitter-2019-11-20-*.zip`
- Releases via GoReleaser (see `.goreleaser.yaml`)

## Web app (`web/`)
- TypeScript SPA, vanilla DOM (no framework), single runtime dependency: JSZip
- `web/src/archive/` — mirrors Go `archive/` package; `ZipReader` wraps JSZip
- `web/src/render/` — DOM-based rendering + `renderTweetHTML` for self-contained HTML export
- `web/src/input/` — same URL parsing logic as Go
- Build: `cd web && npm run build` (esbuild → `dist/app.js`)
- Tests: `cd web && npm test` (vitest)
- Dev server: `cd web && npm run dev`
- Deployed to GitHub Pages via `.github/workflows/pages.yml`

## Archive formats
Two archive layouts are supported, auto-detected at load time via `detectFormat`:
- **Old:** `tweet.js`, `account.js`, `profile.js`, `tweet_media/`, `profile_media/` at archive root. Tweets are bare objects in the JSON array.
- **New:** files under `data/` with plural names: `data/tweets.js`, `data/account.js`, `data/profile.js`, `data/tweets_media/`, `data/profile_media/`. Tweets are wrapped in `{"tweet": {…}}` and include `edit_info`.
- `Archive` struct/interface carries `TweetMediaDir`/`ProfileMediaDir` so media lookup paths are resolved at load time, not hardcoded.

## Key patterns
- `FileReader` interface abstracts zip vs directory access in both implementations
- Twitter archive JS files have `window.YTD.*.part0 = [...]` prefix — stripped before JSON parsing
- Entity indices are UTF-16 code unit offsets; JS strings are natively UTF-16 so indices map directly to `String.slice()`; Go requires explicit UTF-16 conversion
- Web version uses blob URLs for in-page display, base64 data URIs for HTML export
- CSS uses custom properties for theming in web; Go template uses conditional blocks

## Releases
- GoReleaser builds cross-platform binaries and updates Homebrew tap (`duggan/homebrew-tap`)
- CI workflow `.github/workflows/release.yaml` triggers on `v*` tags — just `git tag` and `git push --tags`

## Commands
```sh
# Go CLI
go build -o tweetembed .
go test ./...

# Web
cd web && npm install
cd web && npm run build      # production bundle
cd web && npm run dev        # dev server with watch
cd web && npm test           # vitest
```
