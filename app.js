import { fetchAIReply, ipLocation } from "./api.js";
import { addMessageToDOM, showSkeleton, removeSkeleton } from "./ui.js";

// Sahi IDs yahan hain
const chatContainer = document.getElementById("chatContainer"); 
const inputBox      = document.getElementById("inputBox");
const sendBtn       = document.getElementById("sendBtn");

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
        addMessageToDOM(chatContainer, { text: "Connection error bhai!", isUser: false });
    }
}

sendBtn.onclick = handleSend;
inputBox.onkeydown = (e) => { if(e.key === "Enter") handleSend(); };
