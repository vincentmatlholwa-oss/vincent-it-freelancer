const translations = {
    en: {
        nav: { services: 'Services', pricing: 'Pricing', compare: 'Compare', portfolio: 'Portfolio', faq: 'FAQ', contract: 'Contract', contact: 'Contact' },
        hero: { badge: 'Premium IT Services', title1: 'Vincent IT', title2: 'Freelancer', desc: 'Professional tech solutions — from Microsoft Office activation to hardware upgrades, CV creation, and academic assistance. Based in <strong>Mahikeng, North West</strong>.', btn1: 'Explore Services', btn2: 'Chat Now' },
        services: { badge: 'What I Offer', title: 'Professional Services', desc: 'Comprehensive IT solutions tailored to your needs' },
        pricing: { badge: 'Pricing', title: 'Transparent Pricing', desc: 'No hidden fees — quality service at fair rates', student: 'Student 10% off', returning: 'Returning 5% off', addCart: 'Add to Cart', popular: 'Popular', deposit: '50% deposit to start' },
        compare: { badge: 'Compare', title: 'Service Comparison', desc: 'See what each service includes at a glance', feature: 'Feature' },
        portfolio: { badge: 'Portfolio', title: 'Recent Work', desc: 'A glimpse of projects I have delivered' },
        testimonials: { badge: 'Testimonials', title: 'What Clients Say', desc: 'Trusted by clients across Mahikeng and beyond' },
        referral: { badge: 'Refer & Earn', title: 'Refer a Friend', desc: 'Share the love — you both get 10% off your next service', code: 'Your unique referral code:', copy: 'Copy', copied: 'Copied!', share: 'Share on WhatsApp' },
        faq: { badge: 'FAQ', title: 'Frequently Asked Questions', desc: 'Everything you need to know before booking' },
        contract: { badge: 'Legal', title: 'Service Contract & Agreement', desc: 'Review, fill in your details, and sign digitally', agree: 'I have read and agree to the', terms: 'Terms & Conditions', sign: 'Sign & Generate Contract', clear: 'Clear', sigHint: 'Sign below using your mouse, touch, or stylus' },
        contact: { badge: 'Get in Touch', title: 'Let\'s Work Together', desc: 'Reach out for a free consultation', cta: 'Chat on WhatsApp Now' },
        cart: { empty: 'Your cart is empty', total: 'Total:', checkout: 'Proceed to Checkout' },
        chat: { title: 'Live Chat', placeholder: 'Type a message...', send: 'Send', admin: 'Vincent IT', typing: 'typing...', sendImage: 'Send image' },
        search: { placeholder: 'Search services...', noResults: 'No services found' },
        quiz: { title: 'Find Your Service', desc: 'Answer a few questions to find the perfect service for you', start: 'Start Quiz', next: 'Next', prev: 'Previous', done: 'See Results', restart: 'Restart' },
        booking: { title: 'Book an Appointment', desc: 'Schedule a time that works for you', name: 'Full Name', email: 'Email', phone: 'Phone', service: 'Service', date: 'Date', time: 'Time', notes: 'Additional Notes', submit: 'Book Appointment', success: 'Appointment booked! We will confirm shortly.' },
        reviews: { title: 'Leave a Review', name: 'Your Name', rating: 'Rating', text: 'Your Review', service: 'Service Used', submit: 'Submit Review', success: 'Review submitted! Pending approval.' },
        portal: { title: 'Client Portal', login: 'Login', register: 'Register', email: 'Email', password: 'Password', name: 'Full Name', phone: 'Phone', welcome: 'Welcome', orders: 'My Orders', appointments: 'My Appointments', noOrders: 'No orders yet', noAppointments: 'No appointments yet', logout: 'Logout' },
        tracker: { title: 'Order Status', pending: 'Pending', inProgress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled', deposit: 'Deposit', paid: 'Paid', unpaid: 'Unpaid' },
        blog: { title: 'Tech Tips & Blog', readMore: 'Read More', by: 'By', on: 'on', noPosts: 'No posts yet' },
        gallery: { before: 'Before', after: 'After' },
        footer: { rights: 'All rights reserved.' },
        language: { en: 'English', af: 'Afrikaans', ts: 'Xitsonga' }
    },

    af: {
        nav: { services: 'Dienste', pricing: 'Pryse', compare: 'Vergelyk', portfolio: 'Portefeulje', faq: 'Gereelde Vrae', contract: 'Kontrak', contact: 'Kontak' },
        hero: { badge: 'Premium IT-dienste', title1: 'Vincent IT', title2: 'Vryskut', desc: 'Professionele tegniese oplossings — van Microsoft Office-aktivering tot hardeware-opgraderings, CV-skepping en akademiese bystand. Gebaseer in <strong>Mahikeng, Noordwes</strong>.', btn1: 'Verken Dienste', btn2: 'Praat Nou' },
        services: { badge: 'Wat Ek Bied', title: 'Professionele Dienste', desc: 'Omvattende IT-oplossings aangepas by jou behoeftes' },
        pricing: { badge: 'Pryse', title: 'Deursigtige Pryse', desc: 'Geen verborge fooie nie — kwaliteit diens teen billike tariewe', student: 'Student 10% afslag', returning: 'Terugkerend 5% afslag', addCart: 'Voeg by Mandjie', popular: 'Gewild', deposit: '50% deposito om te begin' },
        compare: { badge: 'Vergelyk', title: 'Diensvergelyking', desc: 'Sien wat elke diens insluit in een oogopslag', feature: 'Kenmerk' },
        portfolio: { badge: 'Portefeulje', title: 'Onlangse Werk', desc: '\'n Kykie na projekte wat ek afgelewer het' },
        testimonials: { badge: 'Getuienisse', title: 'Wat Kliënte Sê', desc: 'Vertrou deur kliënte regoor Mahikeng en verder' },
        referral: { badge: 'Verwys & Verdien', title: 'Verwys \'n Vriend', desc: 'Deel die liefde — julle kry albei 10% afslag op julle volgende diens', code: 'Jou unieke verwysingskode:', copy: 'Kopieer', copied: 'Gekopieer!', share: 'Deel op WhatsApp' },
        faq: { badge: 'GV', title: 'Gereelde Vrae', desc: 'Alles wat jy moet weet voor bespreking' },
        contract: { badge: 'Wetlik', title: 'Dienskontrak & Ooreenkoms', desc: 'Hersien, vul jou besonderhede in en teken digitaal', agree: 'Ek het die', terms: 'Bepalings & Voorwaardes', sign: 'Teken & Genereer Kontrak', clear: 'Maak skoon', sigHint: 'Teken hieronder met jou muis, aanraking of stylus' },
        contact: { badge: 'Kontak', title: 'Kom Ons Werk Saam', desc: 'Reik uit vir \'n gratis konsultasie', cta: 'Praat Nou op WhatsApp' },
        cart: { empty: 'Jou mandjie is leeg', total: 'Totaal:', checkout: 'Gaan na Betaalpunt' },
        chat: { title: 'Regstreekse Klets', placeholder: 'Tik \'n boodskap...', send: 'Stuur', admin: 'Vincent IT' },
        search: { placeholder: 'Soek dienste...', noResults: 'Geen dienste gevind nie' },
        quiz: { title: 'Vind Jou Diens', desc: 'Beantwoord \'n paar vrae om die perfekte diens vir jou te vind', start: 'Begin Vasvra', next: 'Volgende', prev: 'Vorige', done: 'Sien Resultate', restart: 'Herbegin' },
        booking: { title: 'Bespreking', desc: 'Skeduleer \'n tyd wat vir jou werk', name: 'Volle Naam', email: 'E-pos', phone: 'Foon', service: 'Diens', date: 'Datum', time: 'Tyd', notes: 'Addisionele Notas', submit: 'Bespreking', success: 'Afspraak geboek! Ons sal binnekort bevestig.' },
        reviews: { title: 'Los \'n Resensie', name: 'Jou Naam', rating: 'Gradering', text: 'Jou Resensie', service: 'Diens Gebruik', submit: 'Stuur Resensie', success: 'Resensie ingedien! Hangende goedkeuring.' },
        portal: { title: 'Kliëntportaal', login: 'Teken In', register: 'Registreer', email: 'E-pos', password: 'Wagwoord', name: 'Volle Naam', phone: 'Foon', welcome: 'Welkom', orders: 'My Bestellings', appointments: 'My Afsprake', noOrders: 'Nog geen bestellings nie', noAppointments: 'Nog geen afsprake nie', logout: 'Teken Uit' },
        tracker: { title: 'Bestellingstatus', pending: 'Hangende', inProgress: 'Aan die Gang', completed: 'Voltooi', cancelled: 'Gekanselleer', deposit: 'Deposito', paid: 'Betaal', unpaid: 'Onbetaald' },
        blog: { title: 'Wenke & Blog', readMore: 'Lees Meer', by: 'Deur', on: 'op', noPosts: 'Nog geen plasings nie' },
        gallery: { before: 'Voor', after: 'Na' },
        footer: { rights: 'Alle regte voorbehou.' },
        language: { en: 'English', af: 'Afrikaans', ts: 'Xitsonga' }
    },

    ts: {
        nav: { services: 'Tirheko', pricing: 'Nxavo', compare: 'Pfananisa', portfolio: 'Phorifiliyo', faq: 'Swivutiso swa Kahle', contract: 'Kontiraka', contact: 'Tihlanganise' },
        hero: { badge: 'Tirheko ta IT ta le henhla', title1: 'Vincent IT', title2: 'Mutirhi wa Ntshunxeko', desc: 'Tinhleletiso ta thekinoloji ta xiyimo xa le henhla — ku sukela eku pfumeleleriweni ka Microsoft Office ku ya eka ku antswisiwa ka hardware, ku tumbuluxiwa ka CV, na mpfuno wa tidyondzo. Yi tumbuluxiwile e <strong>Mahikeng, North West</strong>.', btn1: 'Hlola Tirheko', btn2: 'Pfuneta Sweswi' },
        services: { badge: 'Leswi Ndzi Nykaka Swona', title: 'Tirheko ta Xiyimo xa le Henhla', desc: 'Tinhleletiso ta IT leti hetisekeke leti lulameriweke eka swilaveko swa wena' },
        pricing: { badge: 'Nxavo', title: 'Nxavo Wo Veka Erihatla', desc: 'A ku na mahumelelo ya le ndhundhuni — tirheko ya xiyimo xa le henhla eka nxavo wo lulama', student: 'Mudyondi 10% endlelo', returning: 'Muendzi loyi a tlheleke 5% endlelo', addCart: 'Engetela eka Kaleni', popular: 'Rhandzeka', deposit: '50% diphositi ku sungula' },
        compare: { badge: 'Pfananisa', title: 'Mpfuanto wa Tirheko', desc: 'Vona leswi tirheko yin\'wana na yin\'wana yi swi katsaka hi vonwani' },
        portfolio: { badge: 'Phorifiliyo', title: 'Mitirho ya Sweswi', desc: 'Ntsengo wa swiphemu leswi ndzi swi nyikeke' },
        testimonials: { badge: 'Vumbhoni', title: 'Leswi Vaxavi Va Swi Vulkaka', desc: 'Ku tshembiwa hi vaxavi e Mahikeng na le ndhawini leyi nga ehandle' },
        referral: { badge: 'Pfumelela & Pfuna', title: 'Pfumelela Munghana', desc: 'Avelana rirhandzu — n\'wina hambilumbi mi kuma 10% endlelo eka tirheko ya n\'wina leyi landzelaka', code: 'Khowe yin\'wana ya wena:', copy: 'Kopa', copied: 'Yi kopiwile!', share: 'Avelana eka WhatsApp' },
        faq: { badge: 'SVK', title: 'Swivutiso leswi Vutisiwaka Kahle', desc: 'Hinkwaswo leswi u faneleke ku swi tiva endzhaku ko bukuwa' },
        contract: { badge: 'Nawu', title: 'Kontiraka ya Tirheko & Mpfumelelo', desc: 'Hlaya, tata vuxokoxoko bya wena, na ku sayina hi ndlela ya digital', agree: 'Ndzi hlaya naswona ndzi pfumelelana na', terms: 'Swilaveko & Swiyimo', sign: 'Sayina & Yisa Kontiraka', clear: 'Sula', sigHint: 'Sayina laha hansi hi mpuku, ku khumba kumbe stylus' },
        contact: { badge: 'Tihlanganise', title: 'A Hi Tirheni Swin\'we', desc: 'Tihlanganise eka mpfuno wa mahala', cta: 'Pfuneta sweswi eka WhatsApp' },
        cart: { empty: 'Kaleni ya wena a yi ri hava nchumu', total: 'Nkatsakanyo:', checkout: 'Yisa eka malihelo' },
        chat: { title: 'Mbulavurisano', placeholder: 'Tsala nhlamuselo...', send: 'Rhuma', admin: 'Vincent IT' },
        search: { placeholder: 'Lava tirheko...', noResults: 'A ku kumeki tirheko' },
        quiz: { title: 'Kuma Tirheko Ya Wena', desc: 'Hlamula swivutiso swin\'wana ku kuma tirheko leyi faneleke wena', start: 'Sungula Quiz', next: 'Ku Landzelaka', prev: 'Ku Sungula', done: 'Vona Mbuyelo', restart: 'Sungula Nakambe' },
        booking: { title: 'Buka Nkarhi', desc: 'Lungiselela nkarhi lowu tirhelaka wena', name: 'Vito Ro Hetiseka', email: 'Imeili', phone: 'Nomboro', service: 'Tirheko', date: 'Siku', time: 'Nkarhi', notes: 'Swilo Leswi Engeteleleke', submit: 'Buka Nkarhi', success: 'Nkarhi wu bukuwile! Hi ta tiyisisa sweswi.' },
        reviews: { title: 'Siya Vumbhoni', name: 'Vito Ra Wena', rating: 'Ntsengo', text: 'Vumbhoni Bya Wena', service: 'Tirheko Loyi U Yi Tirhiseke', submit: 'Rhuma Vumbhoni', success: 'Vumbhoni byi rhumiwile! Byi languterile ku pfumeleliwa.' },
        portal: { title: 'Portal ya Vaxavi', login: 'Nghena', register: 'Tiregistara', email: 'Imeili', password: 'Pasuwede', name: 'Vito Ro Hetiseka', phone: 'Nomboro', welcome: 'Wamukelekile', orders: 'Swileriso Swamina', appointments: 'Tiaphoentimenti ta Mina', noOrders: 'A ku na swileriso', noAppointments: 'A ku na tiaphoentimenti ta sweswi', logout: 'Huma' },
        tracker: { title: 'Xiyimo xa Nsirhelelo', pending: 'Yi Languterile', inProgress: 'Yi Le Ku Tirheni', completed: 'Yi Hetisiwile', cancelled: 'Yi Canceliwile', deposit: 'Diphositi', paid: 'Yi Hakelwile', unpaid: 'A Yi Hakelwanga' },
        blog: { title: 'Swiletelo & Blog', readMore: 'Hlaya Swin\'wana', by: 'Hi', on: 'eka', noPosts: 'A ku na swiphemu swa sweswi' },
        gallery: { before: 'Ku sungula', after: 'Endzhaku' },
        footer: { rights: 'Timboni hinkwato ti sirheleriwa.' },
        language: { en: 'English', af: 'Afrikaans', ts: 'Xitsonga' }
    }
};

let currentLang = localStorage.getItem('vit_lang') || 'en';

function t(path) {
    const keys = path.split('.');
    let val = translations[currentLang];
    for (const k of keys) {
        if (val && val[k]) val = val[k];
        else {
            let fallback = translations.en;
            for (const fk of keys) { if (fallback && fallback[fk]) fallback = fallback[fk]; else return path; }
            return fallback;
        }
    }
    return val;
}

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('vit_lang', lang);
    document.documentElement.lang = lang === 'af' ? 'af' : lang === 'ts' ? 'ts' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const text = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = text;
        } else if (el.tagName === 'IMG') {
            el.alt = text;
        } else {
            el.innerHTML = text;
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    const select = document.getElementById('langSelect');
    if (select) select.value = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

function initI18n() {
    const container = document.createElement('div');
    container.className = 'language-selector';
    container.innerHTML = Object.entries(translations.en.language).map(([code]) =>
        `<button class="lang-btn ${code === currentLang ? 'active' : ''}" data-lang="${code}">${translations[currentLang].language[code]}</button>`
    ).join(' | ');
    container.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });
    document.querySelector('.nav-container')?.appendChild(container);
    setLanguage(currentLang);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('navbar')) initI18n();
});
