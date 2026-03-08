package archive

import (
	"archive/zip"
	"fmt"
	"io"
	"path"
	"strings"
)

// ZipReader reads archive files from a zip file.
type ZipReader struct {
	rc     *zip.ReadCloser
	prefix string            // common directory prefix inside the zip
	index  map[string]*zip.File // maps stripped paths to zip entries
}

func NewZipReader(zipPath string) (*ZipReader, error) {
	rc, err := zip.OpenReader(zipPath)
	if err != nil {
		return nil, fmt.Errorf("opening zip: %w", err)
	}

	// Detect common prefix (e.g. "twitter-2019-11-20-abc123/")
	prefix := detectPrefix(rc.File)

	index := make(map[string]*zip.File, len(rc.File))
	for _, f := range rc.File {
		if f.FileInfo().IsDir() {
			continue
		}
		name := strings.TrimPrefix(f.Name, prefix)
		index[name] = f
	}

	return &ZipReader{rc: rc, prefix: prefix, index: index}, nil
}

func (z *ZipReader) ReadFile(name string) ([]byte, error) {
	// Normalize path separators
	name = path.Clean(name)
	f, ok := z.index[name]
	if !ok {
		return nil, fmt.Errorf("file not found in zip: %s", name)
	}
	r, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer r.Close()
	return io.ReadAll(r)
}

func (z *ZipReader) Glob(pattern string) ([]string, error) {
	pattern = path.Clean(pattern)
	var matches []string
	for name := range z.index {
		matched, err := path.Match(pattern, name)
		if err != nil {
			return nil, err
		}
		if matched {
			matches = append(matches, name)
		}
	}
	return matches, nil
}

func (z *ZipReader) Close() error {
	return z.rc.Close()
}

// detectPrefix finds the common directory prefix shared by all files in the zip.
func detectPrefix(files []*zip.File) string {
	if len(files) == 0 {
		return ""
	}
	// Find the first non-directory entry's prefix
	prefix := ""
	for _, f := range files {
		if f.FileInfo().IsDir() {
			continue
		}
		idx := strings.Index(f.Name, "/")
		if idx >= 0 {
			prefix = f.Name[:idx+1]
		}
		break
	}
	if prefix == "" {
		return ""
	}
	// Verify all files share this prefix
	for _, f := range files {
		if !strings.HasPrefix(f.Name, prefix) {
			return ""
		}
	}
	return prefix
}
