const API_BASE = "https://latent-ai-backend.onrender.com"; 

export async function fetchAIReply(message) {
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        return data.reply;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}
