package render

import (
	"encoding/base64"
	"fmt"
	"net/url"
	"os"
	"path"
	"strings"

	"github.com/duggan/tweetembed/archive"
)

// EmbeddedMedia represents a base64-encoded media item ready for HTML embedding.
type EmbeddedMedia struct {
	DataURI string
	Type    string // "photo", "animated_gif", "video"
}

// EmbedTweetMedia reads and base64-encodes all media for a tweet.
func EmbedTweetMedia(a *archive.Archive, tweet *archive.Tweet) []EmbeddedMedia {
	entities := tweet.Entities.Media
	if tweet.ExtendedEntities != nil && len(tweet.ExtendedEntities.Media) > 0 {
		entities = tweet.ExtendedEntities.Media
	}

	var result []EmbeddedMedia
	for _, m := range entities {
		var data []byte
		var filename string
		var err error

		if (m.Type == "video" || m.Type == "animated_gif") && m.VideoInfo != nil {
			data, filename, err = findVideoData(a.Files, a.TweetMediaDir, tweet.IDStr, m.VideoInfo)
		}
		if data == nil {
			filename = mediaFilename(tweet.IDStr, m.MediaURLHTTPS)
			data, err = a.Files.ReadFile(path.Join(a.TweetMediaDir, filename))
		}
		if err != nil {
			fmt.Fprintf(os.Stderr, "warning: media file not found: %s\n", filename)
			continue
		}

		mime := mimeFromExt(filename)
		dataURI := "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(data)
		result = append(result, EmbeddedMedia{
			DataURI: dataURI,
			Type:    m.Type,
		})
	}
	return result
}

// EmbedAvatar reads and base64-encodes the profile avatar.
func EmbedAvatar(a *archive.Archive, avatarURL string) string {
	basename := urlBasename(avatarURL)
	if basename == "" {
		return ""
	}

	matches, _ := a.Files.Glob(path.Join(a.ProfileMediaDir, "*"+basename+"*"))
	if len(matches) > 0 {
		data, err := a.Files.ReadFile(matches[0])
		if err == nil {
			mime := mimeFromExt(matches[0])
			return "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(data)
		}
	}

	fmt.Fprintf(os.Stderr, "warning: avatar file not found for %s\n", avatarURL)
	return ""
}

func findVideoData(files archive.FileReader, mediaDir string, tweetID string, vi *archive.VideoInfo) ([]byte, string, error) {
	for _, v := range vi.Variants {
		if v.ContentType == "video/mp4" {
			basename := urlBasename(v.URL)
			filename := tweetID + "-" + basename
			data, err := files.ReadFile(path.Join(mediaDir, filename))
			if err == nil {
				return data, filename, nil
			}
		}
	}
	return nil, "", fmt.Errorf("video not found")
}

func mediaFilename(tweetID, mediaURL string) string {
	return tweetID + "-" + urlBasename(mediaURL)
}

func urlBasename(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	return path.Base(u.Path)
}

func mimeFromExt(filename string) string {
	idx := strings.LastIndex(filename, ".")
	if idx < 0 {
		return "application/octet-stream"
	}
	ext := strings.ToLower(filename[idx:])
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".mp4":
		return "video/mp4"
	case ".webp":
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}
