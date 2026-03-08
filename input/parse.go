package input

import (
	"fmt"
	"net/url"
	"regexp"
)

var (
	numericRe = regexp.MustCompile(`^\d+$`)
	statusRe  = regexp.MustCompile(`/status/(\d+)`)
)

// ExtractTweetID extracts a tweet ID from a raw tweet ID, Twitter/X URL, or Nitter URL.
func ExtractTweetID(input string) (string, error) {
	if numericRe.MatchString(input) {
		return input, nil
	}

	u, err := url.Parse(input)
	if err != nil {
		return "", fmt.Errorf("invalid input %q: %w", input, err)
	}

	m := statusRe.FindStringSubmatch(u.Path)
	if m == nil {
		return "", fmt.Errorf("could not extract tweet ID from %q", input)
	}
	return m[1], nil
}
