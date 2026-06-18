let chatPollInterval = null;
let chatSocket = null;

function initWebSocket() {
    if (chatSocket && chatSocket.readyState === 1) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = proto + '//' + window.location.host + '/ws';
    try {
        chatSocket = new WebSocket(wsUrl);
        chatSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message' && data.is_admin) {
                    const box = document.getElementById('chatBox');
                    const existing = document.querySelectorAll('#chatMessages .chat-msg.admin');
                    let alreadyExists = false;
                    existing.forEach(el => {
                        const p = el.querySelector('p');
                        if (p && p.textContent === data.message) alreadyExists = true;
                    });
                    if (!alreadyExists) {
                        appendMessage('Vincent IT', data.message, 'admin');
                        saveChatToLocal(data.message, 'admin');
                        if (!box || !box.classList.contains('open')) {
                            document.getElementById('chatNotif').style.display = 'inline';
                        }
                    }
                }
            } catch (e) {}
        };
        chatSocket.onclose = () => {
            chatSocket = null;
        };
        chatSocket.onerror = () => {
            chatSocket = null;
        };
    } catch (e) {
        chatSocket = null;
    }
}

function startPollingFallback() {
    if (chatPollInterval) return;
    chatPollInterval = setInterval(() => {
        if (!chatSocket) pollAdminReplies();
    }, 5000);
}

function stopPollingFallback() {
    if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
    }
}

function initWebSocketWithFallback() {
    initWebSocket();
    // Start fallback polling immediately; if WebSocket connects, polling stops
    startPollingFallback();
    // Override onopen to stop polling when WebSocket connects
    if (chatSocket) {
        const originalOnopen = chatSocket.onopen;
        chatSocket.onopen = function() {
            stopPollingFallback();
            if (typeof originalOnopen === 'function') originalOnopen.apply(this, arguments);
        };
    }
}

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
                        <p>Hi there! How can I help you today? I can assist with Office activation, Windows setup, BSOD repair, hardware upgrades, CV writing, assignments, and website building.</p>
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
    initWebSocketWithFallback();
}

function pollAdminReplies() {
    if (!navigator.onLine) return;
    const box = document.getElementById('chatBox');
    if (!box || !box.classList.contains('open')) return;
    fetch('/api/chat/public')
        .then(r => r.json())
        .then(messages => {
            const existing = document.querySelectorAll('#chatMessages .chat-msg.admin:not(:first-child)');
            const existingSet = new Set();
            existing.forEach(el => {
                const p = el.querySelector('p');
                if (p) existingSet.add(p.textContent);
            });
            const history = JSON.parse(localStorage.getItem('vit_chat_history') || '[]');
            let newCount = 0;
            messages.forEach(m => {
                if (!m.is_admin) return;
                if (existingSet.has(m.message)) return;
                if (history.some(h => h.message === m.message && h.type === 'admin')) return;
                appendMessage('Vincent IT', m.message, 'admin');
                saveChatToLocal(m.message, 'admin');
                newCount++;
            });
            if (newCount > 0 && !box.classList.contains('open')) {
                document.getElementById('chatNotif').style.display = 'inline';
            }
        })
        .catch(() => {});
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
            const reply = getReply(msg);
            appendMessage('Vincent IT', reply, 'admin');
            saveChatToLocal(reply, 'admin');
        }, 800);
        scrollChat();
    }

    send.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
}

const KNOWLEDGE = {
    services: [
        { name: 'MS Office Activation', price: 'R300 - R350', est: '15-30 min', desc: 'Office 2013, 2016, 2019, 2021, 2024 & 365 lifetime license' },
        { name: 'Windows 10 & 11 Activation', price: 'R300 - R450', est: '15-30 min', desc: 'Home & Pro editions with digital license' },
        { name: 'Office + Windows Bundle', price: 'R300 - R500', est: '30-45 min', desc: 'Both activated at a discounted price, R50+ savings' },
        { name: 'Remote Installation', price: 'R300 - R700', est: '1-3 hours', desc: 'Full remote setup via TeamViewer/AnyDesk, 50% deposit required' },
        { name: 'Blue Screen Repair', price: 'R300 - R450', est: '1-2 hours', desc: 'Diagnose and fix BSOD errors' },
        { name: 'BSOD + Data Recovery', price: 'R450 - R900', est: '2-24 hours', desc: 'Fix BSOD AND recover your data' },
        { name: 'Desktop Hardware Upgrade', price: 'R300 - R1500', est: '1-3 hours', desc: 'RAM, SSD, GPU upgrades, thermal paste' },
        { name: 'CV Creation / Revamp', price: 'R300 - R450', est: '1-2 days', desc: 'Professional, ATS-friendly, modern templates' },
        { name: 'College / School Assignments', price: 'R300 - R750', est: '1-5 days', desc: 'Plagiarism-free, well-researched, on-time delivery' },
        { name: 'Website Template + Customisation', price: 'From R500', est: '2-7 days', desc: 'Responsive, custom branding, mobile-friendly' }
    ],
    faq: {
        deposit: 'Payment is due upfront or upon completion depending on the service. If the service cannot be completed due to device limitations, you get a full refund.',
        location: 'Based in Mahikeng, North West, South Africa. Services available remotely anywhere in South Africa.',
        payment: 'We accept PayShap (0677834591) or EFT to TymeBank a/c 51135445245. After payment, upload your proof on the website checkout page.',
        turnaround: 'Most software services (Office, Windows, BSOD) are completed within 30 min to 2 hours. CV and assignments take 1-5 days. Websites take 2-7 days.',
        warranty: 'All activations are lifetime. If issues arise after service, contact me and I will resolve them at no extra cost.',
        booking: 'You can book an appointment in the Booking section above, or contact me directly on WhatsApp for immediate scheduling.'
    },
    context: {}
};

function classifyIntent(input) {
    const l = input.toLowerCase();
    const scores = {};

    scores.greeting = countMatches(l, ['hi', 'hello', 'hey', 'hallo', 'howdy', 'good morning', 'good afternoon', 'good evening', 'goeie', 'hallo daar', 'avuxeni']);
    scores.farewell = countMatches(l, ['bye', 'goodbye', 'see you', 'later', 'totsiens', 'sala kahle']);
    scores.thanks = countMatches(l, ['thank', 'thanks', 'dankie', 'thank you', 'appreciate', 'baie dankie', 'thanks a lot']);

    scores.office = countMatches(l, ['office', 'microsoft', 'ms office', 'outlook', 'word', 'excel', 'powerpoint', 'access', 'activation', 'lisensie', 'license', 'product key', 'activate office', 'microsoft 365']);
    scores.windows = countMatches(l, ['windows', 'windows 10', 'windows 11', 'windows activation', 'activate windows', 'lisensie', 'license']);
    scores.bundle = countMatches(l, ['bundle', 'both', 'office and windows', 'package', 'combo']);
    scores.remoteInstall = countMatches(l, ['remote', 'teamviewer', 'anydesk', 'remote install', 'remote setup', 'remote assistance']);

    scores.bsod = countMatches(l, ['bsod', 'blue screen', 'blou skerm', 'crash', 'freeze', 'restart', 'blou', 'error code', 'bug check']);
    scores.dataRecovery = countMatches(l, ['data recovery', 'recover', 'lost files', 'file recovery', 'backup', 'data rescue', 'files deleted']);

    scores.hardware = countMatches(l, ['hardware', 'upgrade', 'ram', 'ssd', 'gpu', 'graphics card', 'processor', 'cpu', 'thermal paste', 'motherboard', 'power supply', 'psu', 'storage']);
    scores.cv = countMatches(l, ['cv', 'curriculum vitae', 'resume', 'cv creation', 'cv revamp', 'cv writing', 'cv update', 'cv redesign', 'cover letter', 'curriculum']);
    scores.assignment = countMatches(l, ['assignment', 'assignment help', 'academic', 'research', 'homework', 'take', 'take my', 'assignment assistance', 'school work', 'project', 'paper', 'essay']);
    scores.website = countMatches(l, ['website', 'web development', 'web design', 'webwerf', 'site', 'online store', 'ecommerce', 'website building', 'web page', 'landing page', 'hosting']);
    scores.generalService = countMatches(l, ['service', 'services', 'what do you do', 'can you help', 'dienste', 'offer', 'what you offer']);

    scores.price = countMatches(l, ['price', 'prys', 'cost', 'how much', 'what is the price', 'pricing', 'pryse', 'rate', 'cheap', 'expensive', 'afford', 'kwagala']);

    scores.location = countMatches(l, ['mahikeng', 'location', 'where', 'based', 'noordwes', 'north west', 'south africa', 'area', 'near', 'lived', 'adres']);
    scores.contact = countMatches(l, ['contact', 'kontak', 'whatsapp', 'call', 'phone', 'email', 'reach', 'foon', 'sel', 'cell', 'mobile', 'telephone', 'nummer', 'nomer']);
    scores.appointment = countMatches(l, ['appointment', 'book', 'schedule', 'bespreek', 'booking', 'afspraak', 'time', 'reserve']);

    scores.deposit = countMatches(l, ['deposit', 'deposito', 'refund', 'geld terug', 'money back', 'guarantee', 'warranty', 'waarborg']);
    scores.turnaround = countMatches(l, ['how long', 'how long does it take', 'turnaround', 'time', 'hoe lank', 'duration', 'eta', 'when', 'ready']);

    scores.hardwareHelp = countMatches(l, ['my pc', 'my computer', 'my laptop', 'not working', 'broken', 'issue', 'problem', 'error', 'help', 'assist', 'fout', 'fault']);
    scores.negative = countMatches(l, ['sucks', 'bad', 'terrible', 'slow', 'frustrated', 'annoying']);

    let best = 'unknown';
    let bestScore = 0;
    for (const [intent, score] of Object.entries(scores)) {
        if (score > bestScore) { bestScore = score; best = intent; }
    }

    return { best, score: bestScore, scores };
}

function countMatches(text, keywords) {
    let count = 0;
    for (const kw of keywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('\\b' + escaped + '\\b', 'i');
        if (regex.test(text)) count += 2;
        else if (text.includes(kw)) count += 1;
    }
    return count;
}

function getReply(input) {
    const { best, scores } = classifyIntent(input);
    const prev = KNOWLEDGE.context.lastIntent || null;
    KNOWLEDGE.context.lastIntent = best;

    const l = input.toLowerCase();

    if (scores.farewell > 0) {
        return 'Thank you for chatting! Feel free to reach out anytime. WhatsApp me at 067 783 4591 for a faster response.';
    }

    if (scores.thanks > 0) {
        return 'You\'re welcome! 😊 If you need anything else, I\'m here to help. Feel free to browse our services or chat on WhatsApp for faster assistance.';
    }

    if (scores.greeting > 0 && bestScoreIs(best, scores)) {
        const followUps = [
            'How can I help you today? You can ask about:',
            '• Office or Windows activation',
            '• Blue screen or PC issues',
            '• Hardware upgrades (RAM, SSD)',
            '• CV writing or assignments',
            '• Website building or pricing'
        ];
        return followUps.join('\n');
    }

    if ((scores.office > 0 || scores.remoteInstall > 0) && bestScoreIs(best, scores, ['office', 'remoteInstall'])) {
        const svc = KNOWLEDGE.services.find(s => s.name.includes('Office'));
        return `I can help with ${svc.desc} for ${svc.price} (est. ${svc.est}). We also have an Office + Windows bundle from R300 - R500 (save R50+). Want me to walk you through the process?`;
    }

    if (scores.windows > 0 && bestScoreIs(best, scores, ['windows'])) {
        const svc = KNOWLEDGE.services.find(s => s.name.includes('Windows'));
        return `Windows activation for 10/11 Home & Pro - ${svc.price} (est. ${svc.est}). I provide a genuine digital license that stays even after reinstalls. Interested?`;
    }

    if (scores.bundle > 0) {
        return 'Our Office + Windows Bundle is the best value at R300 - R500! You get both activated with lifetime licenses and save R50+. Would you like to proceed with this?';
    }

    if ((scores.bsod > 0 || scores.dataRecovery > 0) && scores.dataRecovery >= scores.bsod) {
        return 'I offer BSOD + Data Recovery from R450 - R900 (est. 2-24 hours). I fix the blue screen AND recover your important files. For just the BSOD fix, it\'s R300 - R450. Which do you need?';
    }

    if (scores.bsod > 0) {
        return 'Blue screen errors are fixable! I diagnose and repair BSOD issues starting from R300 (est. 1-2 hours). If you also need data recovery, the combo is R450 - R900. Have you seen a specific error code?';
    }

    if (scores.hardware > 0) {
        return 'I do hardware upgrades: RAM, SSD, GPU, CPU, thermal paste, and more. Prices range from R300 to R1500 depending on the part. Est. 1-3 hours. What upgrade are you looking for?';
    }

    if (scores.cv > 0) {
        return 'Professional CV creation or revamp from R300 - R450 (est. 1-2 days). ATS-friendly, modern design, provided in PDF and Word formats. Send me your current CV or details and I\'ll work my magic!';
    }

    if (scores.assignment > 0) {
        return 'I assist with college and school assignments from R300 - R750 (est. 1-5 days). Plagiarism-free, well-researched with on-time delivery. What subject or topic do you need help with?';
    }

    if (scores.website > 0) {
        return 'I build responsive websites from R500 using templates fully customised to your brand. Est. 2-7 days turnaround. Includes custom branding, mobile-friendly design, and all modern features. What kind of site do you need?';
    }

    if (scores.price > 0 && prev && (prev.includes('office') || prev.includes('windows') || prev.includes('bundle'))) {
        const svc = KNOWLEDGE.services.find(s => s.name.toLowerCase().includes(prev.replace('Install', '').replace('Activation', '')));
        if (svc) return `${svc.name} costs ${svc.price} (est. ${svc.est}). ${svc.desc}.`;
    }

    if (scores.price > 0 || scores.generalService > 0) {
        const lines = ['Here are our services and prices:'];
        KNOWLEDGE.services.forEach(s => lines.push(`• ${s.name}: ${s.price} (${s.est})`));
        lines.push('', 'Which one interests you?');
        return lines.join('\n');
    }

    if (scores.location > 0) {
        return 'I am based in Mahikeng, North West, South Africa. Most services are offered remotely via TeamViewer or AnyDesk, so location is not a problem!';
    }

    if (scores.contact > 0) {
        return 'You can reach me via:\n• WhatsApp: 067 783 4591 (fastest response)\n• Email: codingpredators@gmail.com\n• Or use the contact form on this website!';
    }

    if (scores.appointment > 0) {
        return 'You can book an appointment in the Booking section above - pick a date and time that works for you. Or WhatsApp me at 067 783 4591 for immediate scheduling.';
    }

    if (scores.deposit > 0) {
        return 'Payment via TymeBank a/c 51135445245 or PayShap 0677834591. After paying, upload your proof on the checkout page and we will start working on your service. All activations come with lifetime support.';
    }

    if (scores.turnaround > 0) {
        return 'Turnaround times:\n• Office/Windows activation: 15-30 min\n• BSOD repair: 1-2 hours\n• Hardware upgrades: 1-3 hours\n• CV writing: 1-2 days\n• Assignments: 1-5 days\n• Websites: 2-7 days';
    }

    if (scores.hardwareHelp > 0) {
        return 'I understand you\'re having technical issues! Let me help. Can you briefly describe what\'s happening? I can diagnose and fix most PC problems - from blue screens to slow performance to hardware failures.';
    }

    if (l.includes('help') && l.includes('choose')) {
        return 'Not sure what you need? Here\'s a quick guide:\n• Need software installed/activated → Office or Windows\n• PC crashing → BSOD Repair\n• Computer slow → Hardware Upgrade\n• Need a job → CV Creation\n• Need a website → Website Package\nWhich one sounds like you?';
    }

    return 'Thank you for reaching out! I\'m not 100% sure what you\'re looking for. Here\'s what I offer:\n• Office & Windows Activation (R300+)\n• BSOD & Data Recovery (R300+)\n• Hardware Upgrades (R300+)\n• CV Writing (R300+)\n• Assignments (R300+)\n• Websites (R500+)\n\nText me on WhatsApp at 067 783 4591 for a faster response, or tell me more about what you need!';
}

function bestScoreIs(best, scores, validIntents) {
    if (!validIntents) validIntents = Object.keys(scores).filter(k => k !== 'unknown' && k !== 'greeting');
    const threshold = 2;
    if (scores[best] < threshold) return false;
    for (const [intent, score] of Object.entries(scores)) {
        if (intent !== best && !validIntents.includes(intent) && score >= scores[best]) return false;
    }
    return true;
}

function appendMessage(sender, text, type) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-msg ${type}`;
    div.innerHTML = `<div class="chat-bubble"><strong>${sender}</strong><p>${escapeHtml(text).replace(/\n/g, '<br>')}</p></div>`;
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
        const hasNonDefault = history.some(m => m.message !== 'Hi there! How can I help you today? I can assist with Office activation, Windows setup, BSOD repair, hardware upgrades, CV writing, assignments, and website building.');
        if (hasNonDefault) {
            container.innerHTML = '';
            history.forEach(m => {
                const type = m.sender === 'Vincent IT' ? 'admin' : 'user';
                const div = document.createElement('div');
                div.className = `chat-msg ${type}`;
                div.innerHTML = `<div class="chat-bubble"><strong>${escapeHtml(m.sender)}</strong><p>${escapeHtml(m.message).replace(/\n/g, '<br>')}</p></div>`;
                container.appendChild(div);
            });
            scrollChat();
        }
    } catch (e) { /* ignore */ }
}