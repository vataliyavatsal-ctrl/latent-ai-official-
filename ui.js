export function addMessageToDOM(container, { text, isUser }) {
    const msgDiv = document.createElement("div");
    msgDiv.style.margin = "15px 0";
    msgDiv.style.display = "flex";
    msgDiv.style.flexDirection = isUser ? "row-reverse" : "row";
    
    msgDiv.innerHTML = `
        <div style="background: ${isUser ? '#f3f4f6' : '#fff'}; 
                    padding: 12px 18px; 
                    border-radius: 15px; 
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                    max-width: 70%;
                    border: 1px solid #eee;">
            <p style="margin:0; color: #333;">${text}</p>
        </div>
    `;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

export function showSkeleton(container) {
    const loader = document.createElement("div");
    loader.id = "ai-loading";
    loader.innerHTML = `<p style="color: #888; font-style: italic; margin-left: 20px;">Latent is thinking...</p>`;
    container.appendChild(loader);
}

export function removeSkeleton() {
    document.getElementById("ai-loading")?.remove();
}