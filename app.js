import { fetchAIReply } from "./api.js";
import { addMessageToDOM, showSkeleton, removeSkeleton } from "./ui.js";

const chatContainer = document.getElementById("chatContainer");
const inputBox      = document.getElementById("inputBox");
const sendBtn       = document.getElementById("sendBtn");

// Tab switching logic
const chatTabBtn = document.getElementById("chatTabBtn");
const savedTabBtn = document.getElementById("savedTabBtn");
const settingsTabBtn = document.getElementById("settingsTabBtn");

const chatPanel = document.getElementById("chatPanel");
const savedPanel = document.getElementById("savedPanel");
const settingsPanel = document.getElementById("settingsPanel");

function showPanel(panelToShow, btnToActive) {
    [chatPanel, savedPanel, settingsPanel].forEach(p => p.classList.add("hidden"));
    [chatTabBtn, savedTabBtn, settingsTabBtn].forEach(b => b.classList.remove("active"));
    
    panelToShow.classList.remove("hidden");
    btnToActive.classList.add("active");
}

chatTabBtn.onclick = () => showPanel(chatPanel, chatTabBtn);
savedTabBtn.onclick = () => showPanel(savedPanel, savedTabBtn);
settingsTabBtn.onclick = () => showPanel(settingsPanel, settingsTabBtn);

async function handleSend() {
    const text = inputBox.value.trim();
    if (!text) return;

    addMessageToDOM(chatContainer, { text, isUser: true });
    inputBox.value = "";
    showSkeleton(chatContainer);

    try {
        const reply = await fetchAIReply(text);
        removeSkeleton();
        addMessageToDOM(chatContainer, { text: reply, isUser: false });
    } catch (err) {
        removeSkeleton();
        addMessageToDOM(chatContainer, { text: "Connection error bhai! Check Render.", isUser: false });
    }
}

sendBtn.onclick = handleSend;
inputBox.onkeydown = (e) => { if(e.key === "Enter") handleSend(); };
