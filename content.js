console.log("✅ Extension Loaded");

/* ================================
   🔥 Clean Text
================================ */
function getCleanText(node) {
  const clone = node.cloneNode(true);

  clone.querySelectorAll("pre, code, svg, button").forEach(el => el.remove());

  let text = clone.innerText || "";

  let lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 1);

  lines = [...new Set(lines)];

  return lines.join("\n");
}

/* ================================
   🔥 Extract Code
================================ */
function extractCodeBlocks(node) {
  const codes = [];
  node.querySelectorAll("pre").forEach((c) => {
    const t = c.innerText.trim();
    if (t && !codes.includes(t)) codes.push(t);
  });
  return codes;
}

/* ================================
   🔥 Extract Messages
================================ */
function extractMessages() {
  const nodes = document.querySelectorAll("[data-message-author-role]");
  let chats = [];

  nodes.forEach((node) => {
    const role = node.getAttribute("data-message-author-role");

    const text = getCleanText(node);
    const code = extractCodeBlocks(node);

    if (role && text) {
      chats.push({ role, text, code });
    }
  });

  return chats;
}

/* ================================
   🎨 UI
================================ */
const container = document.createElement("div");

Object.assign(container.style, {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  width: "340px",
  height: "620px",
  background: "#111",
  color: "#fff",
  borderRadius: "12px",
  zIndex: "999999",
  padding: "10px",
  overflowY: "auto",
  fontSize: "12px"
});

container.innerHTML = "<b>🤖 ChatGPT Sync</b><hr/>";
document.body.appendChild(container);

/* ================================
   🔁 UI Update
================================ */
function updateUI(messages) {
  container.innerHTML = "<b>🤖 ChatGPT Sync</b><hr/>";

  messages.forEach((msg) => {
    const div = document.createElement("div");

    div.style.marginBottom = "10px";
    div.style.padding = "8px";
    div.style.borderRadius = "8px";

    div.style.background = msg.role === "user" ? "#2563eb" : "#333";
    div.style.textAlign = msg.role === "user" ? "right" : "left";

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
   🔥 SMART OBSERVER (FIXED)
================================ */

let debounceTimer = null;
let lastHash = "";

/* 🔑 Generate hash to avoid duplicate renders */
function generateHash(messages) {
  return messages.map(m => m.text).join("||");
}

/* 🔑 Check if ChatGPT is still generating */
function isGenerating() {
  return document.querySelector("[data-testid='stop-button']") !== null;
}

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {

    // ❌ wait until AI finishes
    if (isGenerating()) {
      return;
    }

    const messages = extractMessages();
    const newHash = generateHash(messages);

    // ❌ prevent duplicate render
    if (newHash === lastHash) return;

    lastHash = newHash;

    console.log("✅ FINAL STABLE DATA:", messages);

    updateUI(messages);

  }, 800); // debounce time (IMPORTANT)
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});