console.log("🚀 Universal AI Tracker Loaded");

/* ================================
   🌐 PLATFORM DETECTION
================================ */
const isChatGPT =
  location.hostname.includes("chatgpt.com") ||
  location.hostname.includes("openai");

const isClaude = location.hostname.includes("claude.ai");
const isGemini = location.hostname.includes("gemini.google.com");

const PLATFORM = isChatGPT
  ? "ChatGPT"
  : isClaude
  ? "Claude"
  : isGemini
  ? "Gemini"
  : "Unknown";

console.log("🌐 Platform:", PLATFORM);

/* ================================
   🧹 CLEAN TEXT
================================ */
function getCleanText(node) {
  const clone = node.cloneNode(true);
  clone.querySelectorAll("pre, code, svg, button").forEach(el => el.remove());

  let text = clone.innerText || "";

  let lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // 🔥 Gemini fix
  if (isGemini) {
    lines = lines.map(line => line.replace(/^you said:\s*/i, ""));
    lines = lines.filter(line => !/^you said:?$/i.test(line));
  }

  return [...new Set(lines)].join("\n");
}

/* ================================
   💻 CODE EXTRACTION
================================ */
function extractCodeBlocks(node) {
  const codes = [];
  node.querySelectorAll("pre").forEach(c => {
    const t = c.innerText.trim();
    if (t && !codes.includes(t)) codes.push(t);
  });
  return codes;
}

/* ================================
   📦 EXTRACT MESSAGES
================================ */
function extractMessages() {
  let combined = [];

  if (isChatGPT) {
    const nodes = document.querySelectorAll("[data-message-author-role]");
    nodes.forEach(node => {
      const role = node.getAttribute("data-message-author-role");
      if (!role) return;
      combined.push({ node, role });
    });
  }

  if (isClaude) {
    const userNodes = [...document.querySelectorAll('[data-testid="user-message"]')];
    const aiNodes = [...document.querySelectorAll(".font-claude-response")];

    combined.push(
      ...userNodes.map(n => ({ node: n, role: "user" })),
      ...aiNodes.map(n => ({ node: n, role: "assistant" }))
    );
  }

  if (isGemini) {
    const userNodes = [...document.querySelectorAll(".user-query-bubble-with-background")];
    const aiNodes = [...document.querySelectorAll(".model-response-text")];

    combined.push(
      ...userNodes.map(n => ({ node: n, role: "user" })),
      ...aiNodes.map(n => ({ node: n, role: "assistant" }))
    );
  }

  combined.sort((a, b) => {
    if (a.node === b.node) return 0;
    return a.node.compareDocumentPosition(b.node) &
      Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1;
  });

  return combined
    .map(({ node, role }) => ({
      role,
      text: getCleanText(node),
      code: extractCodeBlocks(node)
    }))
    .filter(m => m.text);
}

/* ================================
   ⏳ GENERATION CHECK
================================ */
function isGenerating() {
  if (isChatGPT) {
    return document.querySelector("[data-testid='stop-button']") !== null;
  }
  if (isClaude) {
    return document.querySelector('[data-is-streaming="true"]') !== null;
  }
  if (isGemini) {
    return document.querySelector(".model-response-text:empty") !== null;
  }
  return false;
}

/* ================================
   🔐 HASH
================================ */
function generateHash(messages) {
  return messages.map(m => m.text).join("||");
}

/* ================================
   📡 SEND TO BACKEND
================================ */
async function sendToBackend(messages) {
  try {
    const sessionId = window.location.pathname;

    const response = await fetch("http://localhost:5000/api/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: PLATFORM,
        sessionId: sessionId,
        messages: messages
      })
    });

    const data = await response.json();
    console.log("✅ Sent to backend:", data);

    if (data.dummyResponse) {
      latestBackendResponse = data.dummyResponse;
      renderUI(messages);
    }
  } catch (err) {
    console.error("❌ Backend error:", err);
  }
}

/* ================================
   🎨 FULL TRANSPARENT PANEL
================================ */
const panel = document.createElement("div");

Object.assign(panel.style, {
  position: "fixed",
  top: "100px",
  left: "100px",
  width: "360px",
  height: "480px",
  background: "transparent", // ✅ fully transparent
  color: "#fff",
  zIndex: "999999",
  borderRadius: "12px",
  fontSize: "12px",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  resize: "both",
  minWidth: "250px",
  minHeight: "200px"
});

/* HEADER (visible for drag) */
const header = document.createElement("div");
header.innerText = `🤖 ${PLATFORM} Tracker`;

Object.assign(header.style, {
  padding: "10px",
  background: "rgba(0,0,0,0.6)", // visible
  cursor: "move",
  userSelect: "none",
  fontWeight: "bold"
});

panel.appendChild(header);

/* CONTENT */
const content = document.createElement("div");

Object.assign(content.style, {
  flex: "1",
  padding: "10px",
  overflowY: "auto",
  scrollbarWidth: "none",
  msOverflowStyle: "none"
});

content.style.scrollBehavior = "smooth";

panel.appendChild(content);
document.body.appendChild(panel);

/* HIDE SCROLLBAR */
const style = document.createElement("style");
style.innerHTML = `
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;
document.head.appendChild(style);

content.classList.add("no-scrollbar");

/* DRAG */
let isDragging = false;
let startX, startY, startLeft, startTop;

header.addEventListener("mousedown", (e) => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  startLeft = panel.offsetLeft;
  startTop = panel.offsetTop;
  document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  panel.style.left = startLeft + dx + "px";
  panel.style.top = startTop + dy + "px";
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  document.body.style.userSelect = "auto";
});

/* ================================
   🎨 RENDER UI
================================ */
function renderUI(messages) {
  content.innerHTML = `<hr/>`;

  messages.forEach(msg => {
    const div = document.createElement("div");

    Object.assign(div.style, {
      margin: "8px 0",
      padding: "8px",
      borderRadius: "8px",
      background: msg.role === "user"
        ? "rgba(37,99,235,0.7)"
        : "rgba(0,0,0,0.5)"
    });

    div.innerHTML = `
      <b>${msg.role.toUpperCase()}</b><br/>
      ${msg.text}
    `;

    content.appendChild(div);

    msg.code.forEach(c => {
      const codeBox = document.createElement("pre");

      Object.assign(codeBox.style, {
        background: "rgba(0,0,0,0.8)",
        color: "#0f0",
        padding: "8px",
        marginTop: "5px",
        borderRadius: "6px",
        overflowX: "auto"
      });

      codeBox.innerText = c;
      content.appendChild(codeBox);
    });
  });

  if (latestBackendResponse) {
    const dummyDiv = document.createElement("div");

    Object.assign(dummyDiv.style, {
      margin: "12px 0",
      padding: "10px",
      borderRadius: "8px",
      background: "rgba(16, 185, 129, 0.7)", 
      border: "1px solid #10b981",
      boxShadow: "0 0 10px rgba(16, 185, 129, 0.3)"
    });

    dummyDiv.innerHTML = `
      <b>⚙️ BACKEND RESPONSE</b><br/>
      ${latestBackendResponse}
    `;

    content.appendChild(dummyDiv);
  }
}

/* ================================
   🔁 OBSERVER
================================ */
let debounceTimer = null;
let lastHash = "";
let latestBackendResponse = null;

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    if (isGenerating()) return;

    const messages = extractMessages();
    const newHash = generateHash(messages);

    if (newHash === lastHash) return;
    lastHash = newHash;

    console.clear();
    console.log(`📊 ${PLATFORM} Messages:\n`, messages);

    renderUI(messages);

    if (messages && messages.length > 0) {
      // Send all messages so the backend can extract both user and assistant responses
      sendToBackend(messages);
    }

  }, isClaude ? 1000 : 800);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});