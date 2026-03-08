package render

import (
	"html"
	"html/template"
	"io"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf16"

	"github.com/duggan/tweetembed/archive"
)

// RenderData holds all data needed to render the tweet HTML.
type RenderData struct {
	DisplayName   string
	Username      string
	AvatarDataURI template.URL
	TweetHTML     template.HTML
	Timestamp     string
	FavoriteCount string
	RetweetCount  string
	Media         []RenderMedia
	IsReply       bool
	ReplyTo       string
	TweetURL      string
	Theme         string
	Logo          string // "bird" or "x"
}

// RenderMedia wraps EmbeddedMedia with template-safe URI.
type RenderMedia struct {
	DataURI template.URL
	Type    string
}

// RenderTweet writes a standalone HTML document for the given tweet.
func RenderTweet(w io.Writer, a *archive.Archive, tweet *archive.Tweet, theme, logo string) error {
	embedded := EmbedTweetMedia(a.Files, tweet)
	media := make([]RenderMedia, len(embedded))
	for i, m := range embedded {
		media[i] = RenderMedia{DataURI: template.URL(m.DataURI), Type: m.Type}
	}

	data := RenderData{
		DisplayName:   a.Account.AccountDisplayName,
		Username:      a.Account.Username,
		AvatarDataURI: template.URL(EmbedAvatar(a.Files, a.Profile.AvatarMediaURL)),
		TweetHTML:     template.HTML(linkifyText(tweet)),
		Timestamp:     formatTimestamp(tweet.CreatedAt),
		FavoriteCount: tweet.FavoriteCount,
		RetweetCount:  tweet.RetweetCount,
		Media:         media,
		IsReply:       tweet.InReplyToScreenName != "",
		ReplyTo:       tweet.InReplyToScreenName,
		TweetURL:      "https://twitter.com/" + a.Account.Username + "/status/" + tweet.IDStr,
		Theme:         theme,
		Logo:          logo,
	}

	return tweetTemplate.Execute(w, data)
}

// entity replacement represents a span to replace in the tweet text.
type replacement struct {
	start int
	end   int
	html  string
}

func linkifyText(tweet *archive.Tweet) string {
	text := tweet.FullText

	// Convert to UTF-16 for correct index handling
	runes := []rune(text)
	u16 := utf16.Encode(runes)

	var reps []replacement

	for _, m := range tweet.Entities.UserMentions {
		start, end := parseIndices(m.Indices)
		reps = append(reps, replacement{
			start: start,
			end:   end,
			html:  `<a href="https://twitter.com/` + html.EscapeString(m.ScreenName) + `">@` + html.EscapeString(m.ScreenName) + `</a>`,
		})
	}

	for _, h := range tweet.Entities.Hashtags {
		start, end := parseIndices(h.Indices)
		reps = append(reps, replacement{
			start: start,
			end:   end,
			html:  `<a href="https://twitter.com/hashtag/` + html.EscapeString(h.Text) + `">#` + html.EscapeString(h.Text) + `</a>`,
		})
	}

	for _, u := range tweet.Entities.URLs {
		start, end := parseIndices(u.Indices)
		reps = append(reps, replacement{
			start: start,
			end:   end,
			html:  `<a href="` + html.EscapeString(u.ExpandedURL) + `">` + html.EscapeString(u.DisplayURL) + `</a>`,
		})
	}

	// Remove media URLs from text (they'll be shown as embedded media)
	for _, m := range tweet.Entities.Media {
		start, end := parseIndices(m.Indices)
		reps = append(reps, replacement{
			start: start,
			end:   end,
			html:  "",
		})
	}

	// Sort by start index descending so replacements don't shift indices
	sort.Slice(reps, func(i, j int) bool {
		return reps[i].start > reps[j].start
	})

	for _, r := range reps {
		if r.start < 0 || r.end > len(u16) || r.start >= r.end {
			continue
		}
		before := utf16ToString(u16[:r.start])
		after := utf16ToString(u16[r.end:])
		u16 = utf16.Encode([]rune(before + "\x00" + after))
		// Rebuild with placeholder, then do string replace
		full := utf16ToString(u16)
		full = strings.Replace(full, "\x00", r.html, 1)
		u16 = utf16.Encode([]rune(full))
	}

	result := utf16ToString(u16)
	result = strings.TrimSpace(result)
	// Convert newlines to <br> for HTML display
	result = strings.ReplaceAll(result, "\n", "<br>")
	return result
}

func utf16ToString(u16 []uint16) string {
	runes := utf16.Decode(u16)
	return string(runes)
}

func parseIndices(indices []string) (int, int) {
	if len(indices) < 2 {
		return 0, 0
	}
	start, _ := strconv.Atoi(indices[0])
	end, _ := strconv.Atoi(indices[1])
	return start, end
}

func formatTimestamp(ts string) string {
	t, err := time.Parse("Mon Jan 02 15:04:05 -0700 2006", ts)
	if err != nil {
		return ts
	}
	return t.Format("3:04 PM · Jan 2, 2006")
}

var tweetTemplate = template.Must(template.New("tweet").Parse(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

.tweet-card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  max-width: 550px;
  border-radius: 16px;
  padding: 16px;
  line-height: 1.5;
  text-decoration: none;
}

{{ if eq .Theme "dark" }}
.tweet-card {
  background: #15202b;
  color: #e7e9ea;
  border: 1px solid #38444d;
}
.tweet-card a { color: #1d9bf0; }
.tweet-meta { color: #8b98a5; }
.reply-indicator { color: #8b98a5; }
.tweet-stats { color: #8b98a5; }
.tweet-stats span { color: #e7e9ea; }
{{ else }}
.tweet-card {
  background: #ffffff;
  color: #0f1419;
  border: 1px solid #e1e8ed;
}
.tweet-card a { color: #1d9bf0; }
.tweet-meta { color: #536471; }
.reply-indicator { color: #536471; }
.tweet-stats { color: #536471; }
.tweet-stats span { color: #0f1419; }
{{ end }}

.tweet-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
}

.tweet-author {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.display-name {
  font-weight: 700;
  font-size: 15px;
}

.username {
  font-size: 15px;
}

.tweet-logo {
  margin-left: auto;
  flex-shrink: 0;
}

.tweet-logo svg {
  width: 24px;
  height: 24px;
}

.reply-indicator {
  font-size: 13px;
  margin-bottom: 4px;
}

.tweet-text {
  font-size: 15px;
  margin-bottom: 12px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.tweet-text a {
  text-decoration: none;
}

.tweet-text a:hover {
  text-decoration: underline;
}

.tweet-media {
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 12px;
}

.tweet-media img {
  width: 100%;
  display: block;
}

.tweet-media video {
  width: 100%;
  display: block;
}

.media-grid {
  display: grid;
  gap: 2px;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 12px;
}

.media-grid.count-2 { grid-template-columns: 1fr 1fr; }
.media-grid.count-3 { grid-template-columns: 1fr 1fr; }
.media-grid.count-4 { grid-template-columns: 1fr 1fr; }

.media-grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.media-grid.count-3 > *:first-child { grid-row: 1 / 3; }

.tweet-timestamp {
  font-size: 15px;
  padding-top: 12px;
  border-top: 1px solid {{ if eq .Theme "dark" }}#38444d{{ else }}#e1e8ed{{ end }};
}

.tweet-timestamp a {
  text-decoration: none;
}

.tweet-timestamp a:hover {
  text-decoration: underline;
}

.tweet-stats {
  display: flex;
  gap: 20px;
  font-size: 14px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid {{ if eq .Theme "dark" }}#38444d{{ else }}#e1e8ed{{ end }};
}

.tweet-stats span {
  font-weight: 700;
}
</style>
</head>
<body>
<div class="tweet-card">
  <div class="tweet-header">
    {{ if .AvatarDataURI }}<img class="avatar" src="{{ .AvatarDataURI }}" alt="">{{ end }}
    <div class="tweet-author">
      <span class="display-name">{{ .DisplayName }}</span>
      <span class="username tweet-meta">@{{ .Username }}</span>
    </div>
    <div class="tweet-logo">
      {{ if eq .Logo "x" }}<svg viewBox="0 0 24 24" fill="{{ if eq .Theme "dark" }}#e7e9ea{{ else }}#0f1419{{ end }}"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>{{ else }}<svg viewBox="0 0 24 24" fill="#1d9bf0"><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/></svg>{{ end }}
    </div>
  </div>

  {{ if .IsReply }}<div class="reply-indicator">Replying to <a href="https://twitter.com/{{ .ReplyTo }}">@{{ .ReplyTo }}</a></div>{{ end }}

  <div class="tweet-text">{{ .TweetHTML }}</div>

  {{ if .Media }}
    {{ if eq (len .Media) 1 }}
      {{ $m := index .Media 0 }}
      <div class="tweet-media">
        {{ if eq $m.Type "photo" }}
          <img src="{{ $m.DataURI }}" alt="">
        {{ else if eq $m.Type "animated_gif" }}
          <video autoplay loop muted playsinline src="{{ $m.DataURI }}"></video>
        {{ else if eq $m.Type "video" }}
          <video controls playsinline src="{{ $m.DataURI }}"></video>
        {{ end }}
      </div>
    {{ else }}
      <div class="media-grid count-{{ len .Media }}">
        {{ range .Media }}
          {{ if eq .Type "photo" }}
            <img src="{{ .DataURI }}" alt="">
          {{ else if eq .Type "animated_gif" }}
            <video autoplay loop muted playsinline src="{{ .DataURI }}"></video>
          {{ else if eq .Type "video" }}
            <video controls playsinline src="{{ .DataURI }}"></video>
          {{ end }}
        {{ end }}
      </div>
    {{ end }}
  {{ end }}

  <div class="tweet-timestamp tweet-meta">
    <a href="{{ .TweetURL }}">{{ .Timestamp }}</a>
  </div>

  {{ if or (ne .RetweetCount "0") (ne .FavoriteCount "0") }}
  <div class="tweet-stats tweet-meta">
    {{ if ne .RetweetCount "0" }}<div><span>{{ .RetweetCount }}</span> Retweets</div>{{ end }}
    {{ if ne .FavoriteCount "0" }}<div><span>{{ .FavoriteCount }}</span> Likes</div>{{ end }}
  </div>
  {{ end }}
</div>
</body>
</html>
`))
