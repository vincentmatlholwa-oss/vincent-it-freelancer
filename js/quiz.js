const quizQuestions = [
    { question: { en: 'What do you need help with?', af: 'Waarmee het jy hulp nodig?', ts: 'U lava mpfuno eka yini?' }, options: [
        { value: 'software', label: { en: 'Software / Activation', af: 'Sagteware / Aktivering', ts: 'Software / Activated' } },
        { value: 'repair', label: { en: 'PC Repair / BSOD', af: 'PC Herstel / BSOD', ts: 'Ku Lulamisa PC / BSOD' } },
        { value: 'hardware', label: { en: 'Hardware Upgrade', af: 'Hardeware Opgradering', ts: 'Ku Antswisiwa ka Hardware' } },
        { value: 'academic', label: { en: 'CV / Assignments', af: 'CV / Take', ts: 'CV / Mintirho' } },
        { value: 'website', label: { en: 'Website', af: 'Webwerf', ts: 'Website' } }
    ]},
    { question: { en: 'What is your budget range?', af: 'Wat is jou begrotingsreeks?', ts: 'Xana budget ya wena yi kwihi?' }, options: [
        { value: 'low', label: { en: 'R300 - R500', af: 'R300 - R500', ts: 'R300 - R500' } },
        { value: 'medium', label: { en: 'R500 - R900', af: 'R500 - R900', ts: 'R500 - R900' } },
        { value: 'high', label: { en: 'R900+', af: 'R900+', ts: 'R900+' } }
    ]},
    { question: { en: 'How urgent is it?', af: 'Hoe dringend is dit?', ts: 'Xana swi hatlisa ku yini?' }, options: [
        { value: 'urgent', label: { en: 'Same Day', af: 'Selfde Dag', ts: 'Siku Rin\'we' } },
        { value: 'soon', label: { en: 'This Week', af: 'Hierdie Week', ts: 'Vhiki Leri' } },
        { value: 'relaxed', label: { en: 'Next Week or Later', af: 'Volgende Week of Later', ts: 'Vhiki Leri Landzelaka' } }
    ]}
];

const quizResults = {
    'software-low-urgent': 0, 'software-low-soon': 0, 'software-low-relaxed': 0,
    'software-medium-urgent': 2, 'software-medium-soon': 2, 'software-medium-relaxed': 2,
    'software-high-urgent': 3, 'software-high-soon': 3, 'software-high-relaxed': 3,
    'repair-low-urgent': 4, 'repair-low-soon': 4, 'repair-low-relaxed': 4,
    'repair-medium-urgent': 5, 'repair-medium-soon': 5, 'repair-medium-relaxed': 5,
    'repair-high-urgent': 5, 'repair-high-soon': 5, 'repair-high-relaxed': 5,
    'hardware-low-urgent': 6, 'hardware-low-soon': 6, 'hardware-low-relaxed': 6,
    'hardware-medium-urgent': 6, 'hardware-medium-soon': 6, 'hardware-medium-relaxed': 6,
    'hardware-high-urgent': 6, 'hardware-high-soon': 6, 'hardware-high-relaxed': 6,
    'academic-low-urgent': 7, 'academic-low-soon': 7, 'academic-low-relaxed': 7,
    'academic-medium-urgent': 7, 'academic-medium-soon': 8, 'academic-medium-relaxed': 8,
    'academic-high-urgent': 8, 'academic-high-soon': 8, 'academic-high-relaxed': 8,
    'website-low-urgent': 9, 'website-low-soon': 9, 'website-low-relaxed': 9,
    'website-medium-urgent': 9, 'website-medium-soon': 9, 'website-medium-relaxed': 9,
    'website-high-urgent': 9, 'website-high-soon': 9, 'website-high-relaxed': 9
};

let quizState = { step: 0, answers: [], result: null };

function renderQuiz() {
    const section = document.getElementById('services');
    if (!section) return;
    const existing = document.getElementById('quizSection');
    if (existing) existing.remove();

    const quizSection = document.createElement('div');
    quizSection.id = 'quizSection';
    quizSection.className = 'quiz-section';
    const lang = localStorage.getItem('vit_lang') || 'en';
    const q = quizQuestions;

    quizSection.innerHTML = `
        <div class="quiz-header">
            <span class="section-badge" data-i18n="quiz.title">${getLangText(q.title, lang) || 'Find Your Service'}</span>
            <h2 data-i18n="quiz.title">Find Your Service</h2>
            <p class="section-desc" data-i18n="quiz.desc">Answer a few questions to find the perfect service for you</p>
        </div>
        <div class="quiz-body" id="quizBody">
            <div class="quiz-welcome" id="quizWelcome">
                <div class="quiz-welcome-icon"><i class="fas fa-compass"></i></div>
                <p>Not sure what you need? Let us help you find the right service.</p>
                <button class="btn btn-primary" id="quizStartBtn"><i class="fas fa-play"></i> Start Quiz</button>
            </div>
            <div class="quiz-steps" id="quizSteps" style="display:none;">
                <div class="quiz-progress" id="quizProgress">
                    <div class="quiz-progress-bar" id="quizProgressBar"></div>
                </div>
                <div class="quiz-question" id="quizQuestion"></div>
                <div class="quiz-options" id="quizOptions"></div>
                <div class="quiz-nav">
                    <button class="btn btn-outline" id="quizPrev" style="display:none;"><i class="fas fa-arrow-left"></i> <span data-i18n="quiz.prev">Previous</span></button>
                    <button class="btn btn-primary" id="quizNext" style="display:none;"><span data-i18n="quiz.next">Next</span> <i class="fas fa-arrow-right"></i></button>
                    <button class="btn btn-primary" id="quizDone" style="display:none;"><i class="fas fa-check"></i> <span data-i18n="quiz.done">See Results</span></button>
                </div>
            </div>
            <div class="quiz-result" id="quizResult" style="display:none;">
                <div class="quiz-result-icon"><i class="fas fa-star"></i></div>
                <h3>Recommended Service</h3>
                <div id="quizResultContent"></div>
                <button class="btn btn-outline" id="quizRestartBtn"><i class="fas fa-redo"></i> <span data-i18n="quiz.restart">Restart</span></button>
            </div>
        </div>
    `;

    section.parentNode.insertBefore(quizSection, section.nextSibling);
    initQuizEvents();
}

function getLangText(obj, lang) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.en || '';
}

function initQuizEvents() {
    const startBtn = document.getElementById('quizStartBtn');
    const nextBtn = document.getElementById('quizNext');
    const prevBtn = document.getElementById('quizPrev');
    const doneBtn = document.getElementById('quizDone');
    const restartBtn = document.getElementById('quizRestartBtn');

    if (startBtn) startBtn.addEventListener('click', startQuiz);
    if (nextBtn) nextBtn.addEventListener('click', nextStep);
    if (prevBtn) prevBtn.addEventListener('click', prevStep);
    if (doneBtn) doneBtn.addEventListener('click', showResults);
    if (restartBtn) restartBtn.addEventListener('click', startQuiz);
}

function startQuiz() {
    quizState = { step: 0, answers: [], result: null };
    document.getElementById('quizWelcome').style.display = 'none';
    document.getElementById('quizSteps').style.display = 'block';
    document.getElementById('quizResult').style.display = 'none';
    showStep();
}

function showStep() {
    const lang = localStorage.getItem('vit_lang') || 'en';
    const q = quizQuestions[quizState.step];
    const total = quizQuestions.length;
    const progress = ((quizState.step) / total) * 100;
    document.getElementById('quizProgressBar').style.width = `${progress}%`;
    document.getElementById('quizQuestion').textContent = getLangText(q.question, lang);
    const optionsContainer = document.getElementById('quizOptions');
    optionsContainer.innerHTML = q.options.map((opt, i) => `
        <button class="quiz-option ${quizState.answers[quizState.step] === opt.value ? 'selected' : ''}" data-value="${opt.value}">
            ${getLangText(opt.label, lang)}
        </button>
    `).join('');
    optionsContainer.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => {
            optionsContainer.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            quizState.answers[quizState.step] = btn.dataset.value;
            document.getElementById('quizNext').style.display = 'inline-flex';
            document.getElementById('quizDone').style.display = 'none';
            if (quizState.step === total - 1) {
                document.getElementById('quizNext').style.display = 'none';
                document.getElementById('quizDone').style.display = 'inline-flex';
            }
        });
    });
    if (quizState.answers[quizState.step]) {
        document.getElementById('quizNext').style.display = quizState.step < total - 1 ? 'inline-flex' : 'none';
        document.getElementById('quizDone').style.display = quizState.step === total - 1 ? 'inline-flex' : 'none';
    } else {
        document.getElementById('quizNext').style.display = 'none';
        document.getElementById('quizDone').style.display = 'none';
    }
    document.getElementById('quizPrev').style.display = quizState.step > 0 ? 'inline-flex' : 'none';
}

function nextStep() {
    if (quizState.step < quizQuestions.length - 1) {
        quizState.step++;
        showStep();
    }
}

function prevStep() {
    if (quizState.step > 0) {
        quizState.step--;
        showStep();
    }
}

function showResults() {
    const lang = localStorage.getItem('vit_lang') || 'en';
    const key = quizState.answers.join('-');
    const serviceIdx = quizResults[key] !== undefined ? quizResults[key] : 0;
    const service = services[serviceIdx];
    if (!service) return;
    document.getElementById('quizSteps').style.display = 'none';
    const resultDiv = document.getElementById('quizResult');
    resultDiv.style.display = 'block';
    document.getElementById('quizResultContent').innerHTML = `
        <div class="quiz-result-card">
            <div class="quiz-result-icon-big"><i class="${service.icon}"></i></div>
            <h4>${service.title}</h4>
            <p>${service.desc}</p>
            <div class="quiz-result-price">${service.price}</div>
            <div class="quiz-result-est"><i class="far fa-clock"></i> Est. ${service.est}</div>
            <ul>${service.features.map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join('')}</ul>
            <button class="btn btn-primary add-to-cart-btn" data-index="${serviceIdx}"><i class="fas fa-cart-plus"></i> Add to Cart</button>
            <button class="btn btn-whatsapp" onclick="window.open('https://wa.me/27677834591','_blank')"><i class="fab fa-whatsapp"></i> Ask on WhatsApp</button>
        </div>
    `;
    resultDiv.querySelector('.add-to-cart-btn')?.addEventListener('click', function () {
        const idx = parseInt(this.dataset.index);
        if (typeof addToCart === 'function') addToCart(idx);
    });
    quizState.result = serviceIdx;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { quizQuestions, quizResults, renderQuiz };
}
