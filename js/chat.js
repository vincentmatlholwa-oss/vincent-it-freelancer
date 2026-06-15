function initChat() {
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-widget';
    chatContainer.innerHTML = `
        <button class="chat-toggle" id="chatToggle">
            <i class="fas fa-comment-dots"></i>
            <span class="chat-notif" id="chatNotif" style="display:none">1</span>
        </button>
        <div class="chat-box" id="chatBox">
            <div class="chat-header">
                <i class="fas fa-robot"></i>
                <div>
                    <strong data-i18n="chat.title">Live Chat</strong>
                    <small>Vincent IT</small>
                </div>
                <button class="chat-close" id="chatClose">&times;</button>
            </div>
            <div class="chat-messages" id="chatMessages">
                <div class="chat-msg admin">
                    <div class="chat-bubble">
                        <strong>Vincent IT</strong>
                        <p>Hi there! How can I help you today?</p>
                    </div>
                </div>
            </div>
            <div class="chat-input-area">
                <input type="text" id="chatInput" data-i18n-placeholder="chat.placeholder" placeholder="Type a message...">
                <button id="chatSend"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;
    document.body.appendChild(chatContainer);
    bindChatEvents();
    loadChatHistory();
}

function bindChatEvents() {
    const toggle = document.getElementById('chatToggle');
    const box = document.getElementById('chatBox');
    const close = document.getElementById('chatClose');
    const send = document.getElementById('chatSend');
    const input = document.getElementById('chatInput');
    const notif = document.getElementById('chatNotif');

    toggle.addEventListener('click', () => {
        box.classList.toggle('open');
        toggle.classList.toggle('active');
        if (box.classList.contains('open')) {
            notif.style.display = 'none';
            scrollChat();
        }
    });
    close.addEventListener('click', () => {
        box.classList.remove('open');
        toggle.classList.remove('active');
    });

    function sendMessage() {
        const msg = input.value.trim();
        if (!msg) return;
        appendMessage('You', msg, 'user');
        input.value = '';
        if (navigator.onLine) {
            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender: 'Website Visitor', message: msg, is_admin: false })
            }).catch(() => {});
        }
        saveChatToLocal(msg, 'user');
        setTimeout(() => {
            appendMessage('Vincent IT', getAutoReply(msg), 'admin');
            saveChatToLocal(getAutoReply(msg), 'admin');
        }, 1000);
        scrollChat();
    }

    send.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
}

function getAutoReply(msg) {
    const lower = msg.toLowerCase();
    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('prys')) {
        return 'Our prices range from R300 to R1500 depending on the service. Check our Pricing section for details!';
    }
    if (lower.includes('office') || lower.includes('microsoft') || lower.includes('windows') || lower.includes('activation')) {
        return 'I can help with Office and Windows activation! Prices start from R300. Check the Services section for details.';
    }
    if (lower.includes('bsod') || lower.includes('blue screen') || lower.includes('crash') || lower.includes('blou')) {
        return 'Blue screen errors are fixable! I diagnose and repair BSOD issues starting from R300.';
    }
    if (lower.includes('cv') || lower.includes('curriculum') || lower.includes('assignment') || lower.includes('take')) {
        return 'I offer CV creation/revamp and academic assistance. Prices from R300. Send me a WhatsApp for details!';
    }
    if (lower.includes('website') || lower.includes('webwerf') || lower.includes('site')) {
        return 'I build responsive websites using templates customised to your brand. Prices from R500!';
    }
    if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('hallo')) {
        return 'Hello! Welcome to Vincent IT Freelancer. How can I assist you today? Feel free to ask about our services, pricing, or anything IT-related!';
    }
    if (lower.includes('thank') || lower.includes('dankie') || lower.includes('thanks')) {
        return 'You\'re welcome! If you need anything else, I\'m here to help. 😊';
    }
    if (lower.includes('appointment') || lower.includes('book') || lower.includes('bespreek') || lower.includes('scheduler')) {
        return 'You can book an appointment in the Booking section above! Pick a date and time that works for you.';
    }
    if (lower.includes('refund') || lower.includes('deposit') || lower.includes('geld terug') || lower.includes('deposito')) {
        return 'We require a 50% deposit before remote services. If the service cannot be completed due to device limitations, you get a full refund.';
    }
    return 'Thank you for your message! For immediate assistance, please contact me on WhatsApp at 067 783 4591. Otherwise, I will get back to you shortly!';
}

function appendMessage(sender, text, type) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-msg ${type}`;
    div.innerHTML = `<div class="chat-bubble"><strong>${sender}</strong><p>${escapeHtml(text)}</p></div>`;
    container.appendChild(div);
    scrollChat();
}

function scrollChat() {
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function saveChatToLocal(msg, type) {
    const history = JSON.parse(localStorage.getItem('vit_chat_history') || '[]');
    history.push({ sender: type === 'admin' ? 'Vincent IT' : 'You', message: msg, type, time: new Date().toISOString() });
    if (history.length > 100) history.splice(0, history.length - 100);
    localStorage.setItem('vit_chat_history', JSON.stringify(history));
}

function loadChatHistory() {
    try {
        const history = JSON.parse(localStorage.getItem('vit_chat_history') || '[]');
        const container = document.getElementById('chatMessages');
        const hasNonDefault = history.some(m => m.message !== 'Hi there! How can I help you today?');
        if (hasNonDefault) {
            container.innerHTML = '';
            history.forEach(m => {
                const type = m.sender === 'Vincent IT' ? 'admin' : 'user';
                const div = document.createElement('div');
                div.className = `chat-msg ${type}`;
                div.innerHTML = `<div class="chat-bubble"><strong>${escapeHtml(m.sender)}</strong><p>${escapeHtml(m.message)}</p></div>`;
                container.appendChild(div);
            });
            scrollChat();
        }
    } catch (e) { /* ignore */ }
}
