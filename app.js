const chatContainer = document.getElementById("chatContainer");
const inputBox = document.getElementById("inputBox");
const sendBtn = document.getElementById("sendBtn");
const stopBtn = document.getElementById("stopBtn");

const attachBtn = document.getElementById("attachBtn");
const micBtn = document.getElementById("micBtn");
const fileInput = document.getElementById("fileInput");
const attachPreview = document.getElementById("attachPreview");
const attachImg = document.getElementById("attachImg");
const attachRemove = document.getElementById("attachRemove");

const moreLanguages = document.getElementById("moreLanguages");
const newChatBtn = document.getElementById("newChatBtn");

const loginBtn = document.getElementById("loginBtn");
const loginText = document.getElementById("loginText");
const loginModal = document.getElementById("loginModal");
const nameInput = document.getElementById("nameInput");
const loginSave = document.getElementById("loginSave");
const loginCancel = document.getElementById("loginCancel");

const API_BASE = "http://localhost:5000";
const API_URL = API_BASE + "/api/chat";
const MAX_HISTORY = 200;

let isSending = false;
let controller = null;
let attachedImage = null; // data URL
let currentLang = "hi";
let currentMode = "normal";
let chatId = null; // saved chat ka id (pehle message ke baad banta hai)
let session = 0; // chat badalne par badhta hai, purani stream ko rokne ke liye
let history = []; // [{ role: "user" | "assistant", content: "..." }]

/* ---------- helpers ---------- */
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// during streaming, follow the text only if the user has not scrolled up
function followStream() {
    const gap = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
    if (gap < 120) scrollToBottom();
}

function addMessage(type, text, imageSrc) {
    const message = document.createElement("div");
    message.className = "message " + type;

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (imageSrc) {
        const img = document.createElement("img");
        img.src = imageSrc;
        img.alt = "Attached image";
        bubble.appendChild(img);
    }
    if (text) bubble.appendChild(document.createTextNode(text));

    message.appendChild(bubble);
    chatContainer.appendChild(message);
    scrollToBottom();
    return message;
}

function setSending(state) {
    isSending = state;
    sendBtn.hidden = state;
    stopBtn.hidden = !state;
}

function remember(userText, reply) {
    history.push({ role: "user", content: userText || "[image]" });
    history.push({ role: "assistant", content: reply });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    saveChat();
}

/* ---------- send (streaming) ---------- */
async function sendMessage() {
    const mySession = session;
    const text = inputBox.value.trim();
    if ((!text && !attachedImage) || isSending) return;

    const image = attachedImage;
    setSending(true);

    addMessage("user", text, image);
    inputBox.value = "";
    clearAttachment();
    inputBox.focus();

    const aiMsg = addMessage("loading", "⚡ Thinking...");
    const bubble = aiMsg.querySelector(".bubble");

    const payload = {
        message: text,
        history: history.slice(),
        language: currentLang,
        mode: currentMode,
    };
    if (image) payload.images = [image.split(",")[1]]; // base64 only

    controller = new AbortController();
    let reply = "";

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        if (!res.ok) {
            let detail = "";
            try {
                detail = (await res.json()).error || "";
            } catch (e) { }
            throw new Error(detail || "Server error: " + res.status);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let started = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            reply += decoder.decode(value, { stream: true });

            if (!started) {
                aiMsg.className = "message ai";
                started = true;
            }
            bubble.textContent = reply;
            followStream();
        }
        reply += decoder.decode();

        aiMsg.className = "message ai";
        bubble.textContent = reply || "Empty response received.";
        if (reply.trim()) if (mySession === session) remember(text, reply);
    } catch (err) {
        if (err.name === "AbortError") {
            // user pressed Stop (or started a new chat)
            aiMsg.className = "message ai";
            if (reply.trim()) {
                bubble.textContent = reply;
                if (mySession === session) remember(text, reply);
            } else {
                bubble.textContent = "Reply roka gaya.";
            }
        } else {
            console.error(err);
            const offline = err instanceof TypeError; // fetch could not reach the server
            const msg = offline
                ? "Backend se connect nahi ho paya. Check karo ki server localhost:5000 par chal raha hai."
                : "Error: " + err.message;

            if (reply.trim()) {
                // keep whatever was already received
                bubble.textContent = reply + "\n\n[" + msg + "]";
                if (mySession === session) remember(text, reply);
            } else {
                aiMsg.className = "message error";
                bubble.textContent = msg;
            }
        }
    } finally {
        controller = null;
        setSending(false);
        scrollToBottom();
    }
}

sendBtn.addEventListener("click", sendMessage);

stopBtn.addEventListener("click", () => {
    if (controller) controller.abort();
});

inputBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

/* ---------- language chips and modes ---------- */
function setupToggle(selector, onChange) {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            buttons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            onChange(btn);
        });
    });
}

setupToggle("#languageChips .chip[data-lang]", (btn) => {
    currentLang = btn.dataset.lang;
    moreLanguages.value = "";
});

setupToggle("#modeToggles .mode-btn", (btn) => {
    currentMode = btn.dataset.mode;
});

moreLanguages.addEventListener("change", () => {
    if (moreLanguages.value) {
        currentLang = moreLanguages.value;
        document
            .querySelectorAll("#languageChips .chip[data-lang]")
            .forEach((b) => b.classList.remove("active"));
    }
});

/* ---------- image attach ---------- */
function clearAttachment() {
    attachedImage = null;
    fileInput.value = "";
    attachImg.removeAttribute("src");
    attachPreview.hidden = true;
}

attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        addMessage("error", "Sirf image file chuno.");
        clearAttachment();
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        addMessage("error", "Image 5 MB se chhoti honi chahiye.");
        clearAttachment();
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        attachedImage = reader.result;
        attachImg.src = attachedImage;
        attachPreview.hidden = false;
        inputBox.focus();
    };
    reader.readAsDataURL(file);
});

attachRemove.addEventListener("click", clearAttachment);

/* ---------- voice input ---------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechLangMap = {
    hi: "hi-IN", en: "en-GB", bn: "bn-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN",
    gu: "gu-IN", kn: "kn-IN", ml: "ml-IN", pa: "pa-IN", or: "or-IN", as: "as-IN",
    ur: "ur-IN", sa: "hi-IN",
};

let recognition = null;
let listening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    let baseText = "";

    recognition.onstart = () => {
        listening = true;
        micBtn.classList.add("recording");
        baseText = inputBox.value ? inputBox.value + " " : "";
    };

    recognition.onresult = (e) => {
        let transcript = "";
        for (let i = 0; i < e.results.length; i++) {
            transcript += e.results[i][0].transcript;
        }
        inputBox.value = baseText + transcript;
    };

    recognition.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            addMessage("error", "Mic ki permission block hai. Browser ke address bar mein mic allow karo.");
        } else if (e.error !== "no-speech" && e.error !== "aborted") {
            addMessage("error", "Voice input error: " + e.error);
        }
    };

    recognition.onend = () => {
        listening = false;
        micBtn.classList.remove("recording");
        inputBox.focus();
    };
}

micBtn.addEventListener("click", () => {
    if (!recognition) {
        addMessage("error", "Is browser mein voice input support nahi hai. Chrome ya Edge use karo.");
        return;
    }
    if (listening) {
        recognition.stop();
        return;
    }
    recognition.lang = speechLangMap[currentLang] || "hi-IN";
    recognition.start();
});

/* ---------- login ---------- */
function getUser() {
    try {
        return localStorage.getItem("latentUser");
    } catch (e) {
        return null;
    }
}

function renderLogin() {
    const name = getUser();
    if (name) {
        loginText.textContent = name + " (Logout)";
        loginBtn.classList.add("logged-in");
    } else {
        loginText.textContent = "Login";
        loginBtn.classList.remove("logged-in");
    }
    newChat();
}

function openLogin() {
    loginModal.hidden = false;
    nameInput.value = "";
    nameInput.focus();
}

function closeLogin() {
    loginModal.hidden = true;
}

function saveLogin() {
    const name = nameInput.value.trim();
    if (!name) {
        nameInput.focus();
        return;
    }
    try {
        localStorage.setItem("latentUser", name);
    } catch (e) { }
    renderLogin();
    closeLogin();
}

loginBtn.addEventListener("click", () => {
    if (getUser()) {
        try {
            localStorage.removeItem("latentUser");
        } catch (e) { }
        renderLogin();
    } else {
        openLogin();
    }
});

loginSave.addEventListener("click", saveLogin);
loginCancel.addEventListener("click", closeLogin);

nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveLogin();
    if (e.key === "Escape") closeLogin();
});

loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) closeLogin();
});

/* ---------- new chat ---------- */


/* ---------- sidebar: chat history ---------- */
const shell = document.getElementById("shell");
const chatList = document.getElementById("chatList");
const sbSearch = document.getElementById("sbSearch");
let searchTimer = null;

function api(path, opts = {}) {
    return fetch(API_BASE + path, {
        ...opts,
        headers: {
            "Content-Type": "application/json",
            "X-User": encodeURIComponent(getUser() || "guest"),
        },
    });
}

function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function saveChat() {
    if (!history.length) return;
    if (!chatId) chatId = newId();
    const first = history.find((m) => m.role === "user");
    const title = (first ? first.content : "New chat").replace(/\s+/g, " ").slice(0, 40);
    api("/api/chats/" + chatId, {
        method: "PUT",
        body: JSON.stringify({ title, messages: history, language: currentLang }),
    }).then(refreshList).catch(() => { });
}

async function refreshList() {
    try {
        const res = await api("/api/chats?q=" + encodeURIComponent(sbSearch.value.trim()));
        if (!res.ok) throw new Error("list failed");
        renderList(await res.json());
    } catch (e) {
        chatList.textContent = "";
        const msg = document.createElement("div");
        msg.className = "sb-empty";
        msg.textContent = "History load nahi hui. Backend chal raha hai?";
        chatList.appendChild(msg);
    }
}

function groupOf(ts) {
    const day = 86400000;
    const start = new Date().setHours(0, 0, 0, 0);
    if (ts >= start) return "Today";
    if (ts >= start - day) return "Yesterday";
    if (ts >= start - 7 * day) return "Previous 7 days";
    return "Older";
}

function renderList(items) {
    chatList.textContent = "";
    if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "sb-empty";
        empty.textContent = sbSearch.value.trim() ? "Kuch nahi mila." : "Abhi koi chat nahi hai.";
        chatList.appendChild(empty);
        return;
    }
    let last = "";
    items.forEach((c) => {
        const g = groupOf(c.updatedAt);
        if (g !== last) {
            const label = document.createElement("div");
            label.className = "sb-group";
            label.textContent = g;
            chatList.appendChild(label);
            last = g;
        }
        const row = document.createElement("div");
        row.className = "sb-item" + (c.id === chatId ? " active" : "");
        const title = document.createElement("span");
        title.className = "sb-title";
        title.textContent = c.title;
        const del = document.createElement("button");
        del.className = "sb-del";
        del.type = "button";
        del.textContent = "\u00d7";
        del.setAttribute("aria-label", "Delete chat");
        row.append(title, del);
        row.addEventListener("click", () => openChat(c.id));
        del.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteChat(c.id);
        });
        chatList.appendChild(row);
    });
}

function resetView() {
    session++;
    if (controller) controller.abort();
    history = [];
    chatId = null;
    while (chatContainer.children.length > 1) {
        chatContainer.lastElementChild.remove();
    }
    clearAttachment();
    inputBox.value = "";
    inputBox.focus();
}

function newChat() {
    resetView();
    refreshList();
    closeSidebarMobile();
}

async function openChat(id) {
    if (id === chatId) return closeSidebarMobile();
    try {
        const res = await api("/api/chats/" + id);
        if (!res.ok) throw new Error("load failed");
        const chat = await res.json();
        resetView();
        chatId = chat.id;
        history = chat.messages;
        history.forEach((m) => addMessage(m.role === "user" ? "user" : "ai", m.content));
        scrollToBottom();
        refreshList();
        closeSidebarMobile();
    } catch (e) {
        addMessage("error", "Chat load nahi ho payi.");
    }
}

async function deleteChat(id) {
    if (!confirm("Ye chat delete kar du?")) return;
    try {
        await api("/api/chats/" + id, { method: "DELETE" });
    } catch (e) { }
    if (id === chatId) resetView();
    refreshList();
}

const isMobile = () => window.matchMedia("(max-width: 800px)").matches;
function closeSidebarMobile() {
    shell.classList.remove("sb-open");
}

document.getElementById("sbToggle").addEventListener("click", (e) => {
    e.stopPropagation();
    shell.classList.toggle(isMobile() ? "sb-open" : "sb-collapsed");
});
document.getElementById("sbBackdrop").addEventListener("click", closeSidebarMobile);
document.getElementById("sbNew").addEventListener("click", newChat);
newChatBtn.addEventListener("click", newChat);
sbSearch.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refreshList, 250);
});

renderLogin();
scrollToBottom();