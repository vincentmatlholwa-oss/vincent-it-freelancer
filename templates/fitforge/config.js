const CONFIG = {
  /* ===========================================================
     Change this to switch the entire site theme.
     Options: "fitness" | "restaurant" | "agency" | "course"
     =========================================================== */
  niche: "fitness",

  /* ===========================================================
     Set default dark mode (user can still toggle)
     =========================================================== */
  darkMode: false,

  /* ===========================================================
     BRAND
     =========================================================== */
  brand: {
    name: "FitForge",
    tagline: "Personal training that transforms your body, mind, and habits. One rep at a time.",
    description: "With over 10 years of experience and 500+ transformations, I've built a training methodology that delivers real, lasting results. No gimmicks — just science-backed coaching tailored to you.",
    logoHtml: "Fit<span class='text-primary'>Forge</span>",
  },

  /* ===========================================================
     HERO
     =========================================================== */
  hero: {
    title: "Forge Your ",
    titleAccent: "Best Self",
    subtitle: "Personal training that transforms your body, mind, and habits. One rep at a time.",
    primaryCta: { text: "Start Free Trial", link: "#booking" },
    secondaryCta: { text: "View Programs", link: "#services" },
  },

  /* ===========================================================
     ABOUT
     =========================================================== */
  about: {
    title: "Meet Your Coach",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80",
    stats: [
      { number: "500+", label: "Clients" },
      { number: "10+", label: "Years" },
      { number: "98%", label: "Success" },
    ],
  },

  /* ===========================================================
     SERVICES (monthlyPrice / yearlyPrice for the toggle)
     =========================================================== */
  services: {
    title: "Programs & Services",
    subtitle: "Choose the path that fits your goals",
    items: [
      {
        icon: "fa-dumbbell",
        title: "1-on-1 Coaching",
        description: "Fully personalized training plans with weekly check-ins and form correction.",
        monthlyPrice: 299,
        yearlyPrice: 249,
        buttonText: "Get Started",
        popular: false,
      },
      {
        icon: "fa-users",
        title: "Group Classes",
        description: "High-energy small group sessions that keep you motivated and accountable.",
        monthlyPrice: 149,
        yearlyPrice: 129,
        buttonText: "Join a Class",
        popular: true,
      },
      {
        icon: "fa-laptop",
        title: "Online Coaching",
        description: "Custom programs delivered via app. Train anywhere, anytime with remote support.",
        monthlyPrice: 99,
        yearlyPrice: 79,
        buttonText: "Start Now",
        popular: false,
      },
    ],
  },

  /* ===========================================================
     TESTIMONIALS
     =========================================================== */
  testimonials: {
    title: "What Clients Say",
    subtitle: "Real results from real people",
    items: [
      {
        quote: "FitForge completely changed my life. I lost 30 lbs and gained confidence I never knew I had. The coaching is top-notch.",
        name: "Sarah K.",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80",
        rating: 5,
      },
      {
        quote: "The group classes are amazing. Great community, awesome workouts, and I've never been stronger. Highly recommend!",
        name: "Mike R.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80",
        rating: 5,
      },
      {
        quote: "Online coaching made it possible for me to stay fit while traveling. The app is super easy to follow and keeps me accountable.",
        name: "James L.",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80",
        rating: 5,
      },
    ],
  },

  /* ===========================================================
     FAQ
     =========================================================== */
  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Everything you need to know before you start",
    items: [
      {
        question: "How do I get started?",
        answer: "Book a free trial session using the form above. We'll discuss your goals, assess your fitness level, and create a plan tailored to you.",
      },
      {
        question: "What should I bring to my first session?",
        answer: "Comfortable workout clothes, athletic shoes, a water bottle, and a towel. We'll provide any equipment you need.",
      },
      {
        question: "Do you offer nutrition guidance?",
        answer: "Yes! All 1-on-1 coaching clients receive a personalized nutrition plan. Group and online members get access to our nutrition library.",
      },
      {
        question: "Can I cancel anytime?",
        answer: "Absolutely. There are no long-term contracts. You can pause or cancel your membership at any time with 30 days' notice.",
      },
    ],
  },

  /* ===========================================================
     GALLERY / PORTFOLIO
     =========================================================== */
  gallery: {
    title: "Our Gallery",
    subtitle: "See what we do",
    items: [
      { image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80", title: "Personal Training", category: "training" },
      { image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80", title: "Group Classes", category: "group" },
      { image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80", title: "Nutrition Planning", category: "nutrition" },
      { image: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=400&q=80", title: "Outdoor Training", category: "training" },
      { image: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&q=80", title: "Yoga & Flexibility", category: "group" },
      { image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80", title: "Recovery & Mobility", category: "nutrition" },
    ],
  },

  /* ===========================================================
     BOOKING FORM
     =========================================================== */
  booking: {
    title: "Book Your Free Trial",
    subtitle: "No commitment. Let's see if we're a fit.",
    formAction: "https://formspree.io/f/YOUR_FORM_ID",
    serviceOptions: ["1-on-1 Coaching", "Group Classes", "Online Coaching"],
  },

  /* ===========================================================
     CONTACT
     =========================================================== */
  contact: {
    title: "Visit the Gym",
    subtitle: "Come train at our flagship location",
    address: "123 Fitness Ave, Suite 100<br>New York, NY 10001",
    phone: "(123) 456-7890",
    email: "hello@fitforge.com",
    hours: "Mon-Fri: 6am-8pm, Sat: 8am-4pm",
    mapEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d193595.9149092764!2d-74.1197632686524!3d40.69740344174046!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c24fa5d33f083b%3A0xc80b8f06e177fe62!2sNew+York%2C+NY!5e0!3m2!1sen!2sus!4v1552547048550",
  },

  /* ===========================================================
     WHATSAPP
     =========================================================== */
  whatsapp: {
    number: "1234567890",
    message: "Hi! I'd like to learn more about FitForge.",
  },

  /* ===========================================================
     SOCIAL LINKS
     =========================================================== */
  socialLinks: {
    instagram: "#",
    facebook: "#",
    twitter: "#",
    youtube: "#",
  },

  /* ===========================================================
     COOKIE CONSENT
     =========================================================== */
  cookieConsent: {
    enabled: true,
    message: "This site uses cookies to improve your experience. By continuing, you agree to our use of cookies.",
    buttonText: "Got it!",
  },

  /* ===========================================================
     NICHE THEMES — colour palettes per niche.
     You can customise these hex values.
     =========================================================== */
  themes: {
    fitness: {
      primary: "#f97316",
      primaryHover: "#ea580c",
      primaryLight: "#fff7ed",
      primaryDark: "#fb923c",
      darkBg: "#0f0f0f",
      darkCard: "#1a1a1a",
    },
    restaurant: {
      primary: "#ef4444",
      primaryHover: "#dc2626",
      primaryLight: "#fef2f2",
      primaryDark: "#f87171",
      darkBg: "#0f0f0f",
      darkCard: "#1a1a1a",
    },
    agency: {
      primary: "#3b82f6",
      primaryHover: "#2563eb",
      primaryLight: "#eff6ff",
      primaryDark: "#60a5fa",
      darkBg: "#0a0f1a",
      darkCard: "#111827",
    },
    course: {
      primary: "#22c55e",
      primaryHover: "#16a34a",
      primaryLight: "#f0fdf4",
      primaryDark: "#4ade80",
      darkBg: "#0a0f0a",
      darkCard: "#111a11",
    },
  },
};
