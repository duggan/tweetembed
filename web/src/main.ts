import { ZipReader } from "./archive/zip-reader.js";
import { loadArchive } from "./archive/archive.js";
import { extractTweetID } from "./input/parse.js";
import { renderTweet, renderTweetHTML, injectStyles } from "./render/render.js";
import type { Archive, Tweet } from "./archive/types.js";

let archive: Archive | null = null;
let currentCleanup: (() => void) | null = null;
let currentCleanupHTML: string | null = null;
let currentTweetID: string | null = null;
let currentTheme = "light";
let currentLogo = "bird";
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function init(): void {
  injectStyles();

  const dropZone = $("drop-zone");
  const fileInput = $("file-input") as HTMLInputElement;
  const loadingSection = $("loading-section");
  const uploadSection = $("upload-section");
  const loadedSection = $("loaded-section");
  const accountInfo = $("account-info");
  const tweetInput = $("tweet-input") as HTMLInputElement;
  const renderBtn = $("render-btn");
  const searchResults = $("search-results");
  const tweetContainer = $("tweet-container");
  const errorMsg = $("error-msg");
  const themeToggle = $("theme-toggle");
  const logoToggle = $("logo-toggle");
  const copyBtn = $("copy-html-btn");
  const downloadBtn = $("download-html-btn");

  // Drop zone events
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const file = (e as DragEvent).dataTransfer?.files[0];
    if (file) handleFile(file);
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
  });

  // Render tweet
  async function doRender() {
    const input = tweetInput.value.trim();
    if (!input) return;
    errorMsg.textContent = "";
    errorMsg.style.display = "none";

    try {
      const id = extractTweetID(input);
      const tweet = archive!.tweetMap.get(id);
      if (!tweet) {
        throw new Error(`Tweet ${id} not found in archive`);
      }

      // Clean up previous render
      if (currentCleanup) {
        currentCleanup();
        currentCleanup = null;
      }
      tweetContainer.innerHTML = "";

      const [result, html] = await Promise.all([
        renderTweet(archive!, tweet, currentTheme, currentLogo),
        renderTweetHTML(archive!, tweet, currentTheme, currentLogo),
      ]);
      currentCleanup = result.cleanup;
      currentCleanupHTML = html;
      currentTweetID = id;
      tweetContainer.appendChild(result.element);
      copyBtn.style.display = "inline-block";
      copyBtn.textContent = "Copy HTML";
      downloadBtn.style.display = "inline-block";
    } catch (err) {
      errorMsg.textContent = (err as Error).message;
      errorMsg.style.display = "block";
    }
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatMeta(tweet: Tweet): string {
    const parts = [formatDate(tweet.created_at)];
    const likes = parseInt(tweet.favorite_count, 10);
    const rts = parseInt(tweet.retweet_count, 10);
    if (rts > 0) parts.push(`${rts} RT${rts !== 1 ? "s" : ""}`);
    if (likes > 0) parts.push(`${likes} like${likes !== 1 ? "s" : ""}`);
    return parts.join(" \u00B7 ");
  }

  function searchTweets(query: string): Tweet[] {
    if (!archive) return [];
    const q = query.toLowerCase();
    const results: Tweet[] = [];
    for (const tweet of archive.tweetMap.values()) {
      if (tweet.full_text.toLowerCase().includes(q)) {
        results.push(tweet);
        if (results.length >= 100) break;
      }
    }
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return results;
  }

  function renderSearchResults(results: Tweet[]) {
    searchResults.innerHTML = "";
    if (results.length === 0) {
      searchResults.style.display = "none";
      return;
    }
    const countEl = document.createElement("div");
    countEl.id = "search-results-count";
    countEl.textContent = `${results.length}${results.length >= 100 ? "+" : ""} result${results.length !== 1 ? "s" : ""}`;
    searchResults.appendChild(countEl);

    for (const tweet of results) {
      const item = document.createElement("div");
      item.className = "search-result";
      if (tweet.id_str === currentTweetID) item.classList.add("active");
      item.dataset.tweetId = tweet.id_str;

      const text = document.createElement("span");
      text.className = "search-result-text";
      text.textContent = tweet.full_text.slice(0, 140);
      item.appendChild(text);

      const meta = document.createElement("span");
      meta.className = "search-result-meta";
      meta.textContent = formatMeta(tweet);
      item.appendChild(meta);

      item.addEventListener("click", () => {
        tweetInput.value = tweet.id_str;
        doRender();
        // Update active state
        searchResults.querySelectorAll(".search-result").forEach((el) => el.classList.remove("active"));
        item.classList.add("active");
      });

      searchResults.appendChild(item);
    }
    searchResults.style.display = "block";
  }

  function looksLikeIdOrUrl(input: string): boolean {
    return /^\d+$/.test(input) || /^https?:\/\//.test(input);
  }

  function handleSearchInput() {
    const input = tweetInput.value.trim();
    if (!input || looksLikeIdOrUrl(input)) {
      searchResults.style.display = "none";
      searchResults.innerHTML = "";
      return;
    }
    const results = searchTweets(input);
    renderSearchResults(results);
  }

  renderBtn.addEventListener("click", doRender);
  tweetInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (looksLikeIdOrUrl(tweetInput.value.trim())) {
        doRender();
      } else {
        // Trigger immediate search on Enter for non-ID input
        handleSearchInput();
      }
    }
  });
  tweetInput.addEventListener("input", () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(handleSearchInput, 200);
  });

  // Theme toggle
  themeToggle.addEventListener("click", () => {
    currentTheme = currentTheme === "light" ? "dark" : "light";
    themeToggle.textContent = currentTheme === "light" ? "Dark" : "Light";
    document.body.classList.toggle("dark", currentTheme === "dark");
    // Re-render if tweet is showing
    if (tweetContainer.firstChild) doRender();
  });

  // Logo toggle
  logoToggle.addEventListener("click", () => {
    currentLogo = currentLogo === "bird" ? "x" : "bird";
    logoToggle.textContent = currentLogo === "bird" ? "X Logo" : "Bird Logo";
    if (tweetContainer.firstChild) doRender();
  });

  // Copy HTML
  copyBtn.addEventListener("click", async () => {
    if (!currentCleanupHTML) return;
    try {
      await navigator.clipboard.writeText(currentCleanupHTML);
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy HTML"; }, 2000);
    } catch {
      // Fallback for browsers that block clipboard API
      const ta = document.createElement("textarea");
      ta.value = currentCleanupHTML;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy HTML"; }, 2000);
    }
  });

  // Download HTML
  downloadBtn.addEventListener("click", () => {
    if (!currentCleanupHTML || !currentTweetID) return;
    const blob = new Blob([currentCleanupHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentTweetID}.html`;
    a.click();
    URL.revokeObjectURL(url);
  });

  async function handleFile(file: File) {
    uploadSection.style.display = "none";
    loadingSection.style.display = "block";

    try {
      const reader = await ZipReader.fromFile(file);
      archive = await loadArchive(reader);

      loadingSection.style.display = "none";
      loadedSection.style.display = "block";

      accountInfo.textContent = `${archive.account.accountDisplayName} (@${archive.account.username}) \u00B7 ${archive.tweetMap.size} tweets`;
      tweetInput.focus();
    } catch (err) {
      loadingSection.style.display = "none";
      uploadSection.style.display = "block";
      errorMsg.textContent = `Failed to load archive: ${(err as Error).message}`;
      errorMsg.style.display = "block";
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
