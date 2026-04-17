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
        throw new Error("Backend band hai!");
    }
}

export async function ipLocation() {
    try {
        const res = await fetch("https://ipapi.co/json/");
        const d = await res.json();
        return {
            city: d.city || "Ahmedabad",
            country: d.country_name || "India",
            lat: d.latitude || 23.02,
            lon: d.longitude || 72.57,
        };
    } catch (error) {
        return { city: "Ahmedabad", country: "India", lat: 23.02, lon: 72.57 };
    }
}
