console.log("🚀 Multi-LLM Extractor Loaded");

/* ================================
   🔍 Detect Platform
================================ */
function detectPlatform() {
  const host = window.location.hostname;

  if (host.includes("chatgpt") || host.includes("openai")) return "chatgpt";
  if (host.includes("gemini") || host.includes("google")) return "gemini";
  if (host.includes("claude") || host.includes("anthropic")) return "claude";
  if (host.includes("grok") || host.includes("x.ai")) return "grok";

  return "unknown";
}

const PLATFORM = detectPlatform();
console.log("🧠 Platform:", PLATFORM);

/* ================================
   🧹 Clean Text
================================ */
function cleanText(node) {
  const clone = node.cloneNode(true);

  clone.querySelectorAll("pre, code, svg, button").forEach(el => el.remove());

  let text = clone.innerText || "";

  return text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 1)
    .join("\n");
}

/* ================================
   💻 Extract Code
================================ */
function extractCode(node) {
  const codes = [];
  node.querySelectorAll("pre").forEach((c) => {
    const t = c.innerText.trim();
    if (t && !codes.includes(t)) codes.push(t);
  });
  return codes;
}

/* ================================
   🤖 CHATGPT
================================ */
function extractChatGPT() {
  const nodes = document.querySelectorAll("[data-message-author-role]");
  let chats = [];

  nodes.forEach((node) => {
    const role = node.getAttribute("data-message-author-role");
    const text = cleanText(node);
    const code = extractCode(node);

    if (role && text) chats.push({ role, text, code });
  });

  return chats;
}

/* ================================
   🌈 GEMINI (FIXED)
================================ */
function extractGemini() {
  let chats = [];

  const nodes = document.querySelectorAll("message-content");

  nodes.forEach((node) => {
    const markdown = node.querySelector(".markdown");
    const text = (markdown || node).innerText.trim();

    if (!text) return;

    const role = node.closest("model-response")
      ? "assistant"
      : "user";

    chats.push({ role, text, code: [] });
  });

  return chats;
}

/* ================================
   🤝 CLAUDE (IMPROVED)
================================ */
function extractClaude() {
  let chats = [];

  const nodes = document.querySelectorAll("[data-testid='conversation-turn']");

  nodes.forEach((node) => {
    const text = cleanText(node);

    if (!text) return;

    const role = node.innerText.toLowerCase().includes("human")
      ? "user"
      : "assistant";

    chats.push({ role, text, code: [] });
  });

  return chats;
}

/* ================================
   🐦 GROK (IMPROVED)
================================ */
function extractGrok() {
  let chats = [];

  const nodes = document.querySelectorAll("[data-testid='message']");

  nodes.forEach((node) => {
    const text = cleanText(node);

    if (!text) return;

    const role = node.innerText.includes("You")
      ? "user"
      : "assistant";

    chats.push({ role, text, code: [] });
  });

  return chats;
}

/* ================================
   🔄 Extractor Router
================================ */
function extractMessages() {
  switch (PLATFORM) {
    case "chatgpt":
      return extractChatGPT();
    case "gemini":
      return extractGemini();
    case "claude":
      return extractClaude();
    case "grok":
      return extractGrok();
    default:
      return [];
  }
}

/* ================================
   ⏳ Streaming Check (ChatGPT only)
================================ */
function isGenerating() {
  if (PLATFORM !== "chatgpt") return false;
  return document.querySelector("[data-testid='stop-button']") !== null;
}

/* ================================
   🎨 UI
================================ */
const container = document.createElement("div");

Object.assign(container.style, {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  width: "350px",
  height: "420px",
  background: "#111",
  color: "#fff",
  borderRadius: "12px",
  zIndex: "999999",
  padding: "10px",
  overflowY: "auto",
  fontSize: "12px"
});

container.innerHTML = `<b>🤖 ${PLATFORM.toUpperCase()} Sync</b><hr/>`;
document.body.appendChild(container);

/* ================================
   🔁 UI Update
================================ */
function updateUI(messages) {
  container.innerHTML = `<b>🤖 ${PLATFORM.toUpperCase()} Sync</b><hr/>`;

  messages.forEach((msg) => {
    const div = document.createElement("div");

    div.style.marginBottom = "10px";
    div.style.padding = "8px";
    div.style.borderRadius = "8px";
    div.style.background = msg.role === "user" ? "#2563eb" : "#333";

    const textDiv = document.createElement("div");
    textDiv.innerText = msg.text;
    div.appendChild(textDiv);

    msg.code.forEach((c) => {
      const codeDiv = document.createElement("pre");
      codeDiv.innerText = c;
      codeDiv.style.background = "#000";
      codeDiv.style.marginTop = "6px";
      codeDiv.style.padding = "6px";
      codeDiv.style.borderRadius = "6px";
      div.appendChild(codeDiv);
    });

    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

/* ================================
   🧠 SMART OBSERVER (ANTI DUPLICATE)
================================ */
let debounceTimer = null;
let lastHash = "";

function hash(messages) {
  return messages.map(m => m.text).join("||");
}

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {

    if (isGenerating()) return;

    const messages = extractMessages();
    const newHash = hash(messages);

    if (newHash === lastHash) return;

    lastHash = newHash;

    console.log("🔥 FINAL DATA:", messages);

    updateUI(messages);

  }, 800);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});