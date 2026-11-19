const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "../public");
// Standard extended pictographic emoji regex
const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

test("De-Emoji: All public files have ZERO emojis", async () => {
  const files = fs.readdirSync(publicDir).filter(f => f.endsWith(".html") || f.endsWith(".js") || f.endsWith(".css"));
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(publicDir, file), "utf8");
    const matches = content.match(emojiRegex);
    assert.strictEqual(
      matches ? matches.length : 0,
      0,
      `File ${file} must have 0 emojis, but found: ${matches ? matches.join(", ") : ""}`
    );
  }
});

test("De-Emoji: Topbar Theme Toggle & Guide Buttons are Clean and Professional", async () => {
  const html = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
  
  // Theme toggle has SVG or clean text, no emoji
  assert.ok(html.includes('id="btn-toggle-theme"'), "Must have theme toggle button");
  assert.ok(!html.includes('🌙 Dark Theme'), "Must not have moon emoji in Dark Theme text");
  assert.ok(!html.includes('☀️ Light Theme'), "Must not have sun emoji in Light Theme text");

  // Guide button
  assert.ok(html.includes('id="topbar-btn-guide"'), "Must have topbar guide button");
  assert.ok(!html.includes('📖 Guide'), "Must not have book emoji in Guide button");
  assert.ok(!html.includes('📖 User Guide'), "Must not have book emoji in User Guide");
});

test("De-Emoji: Guide.js Launcher Buttons are Clean Text (No Rocket Emojis)", async () => {
  const guide = fs.readFileSync(path.join(publicDir, "guide.js"), "utf8");
  
  assert.ok(!guide.includes("🚀"), "guide.js must not contain rocket emojis");
  assert.ok(!guide.includes("🖨️"), "guide.js must not contain printer emojis");
  assert.ok(guide.includes("Open Item Master"), "Must contain clean launcher text");
  assert.ok(guide.includes("Open Live Cockpit"), "Must contain clean cockpit launcher text");
});

test("De-Emoji: Industrial Hubs use Monochrome Line-Art SVGs for Empty States", async () => {
  const indexHtml = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
  
  assert.ok(!indexHtml.includes("📋"), "index.html must not contain clipboard emoji");
  assert.ok(!indexHtml.includes("🧪"), "index.html must not contain flask emoji");
  assert.ok(!indexHtml.includes("⚖️"), "index.html must not contain scale emoji");
  assert.ok(!indexHtml.includes("📏"), "index.html must not contain caliper/ruler emoji");
  assert.ok(!indexHtml.includes("🛠️"), "index.html must not contain wrench emoji");

  // Verify empty state SVGs are present
  assert.ok(indexHtml.includes("empty-state-svg"), "Must have empty-state-svg class in hub empty states");
});
