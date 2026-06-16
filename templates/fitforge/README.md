# FitForge - Fitness Coach Template

Complete website template for fitness coaches / personal trainers. Fully config-driven — edit one file, customize everything.

## Pages / Sections
- Home (Hero with dual CTA)
- About (Coach bio + stat counters)
- Services / Programs (3 tiers with pricing toggle)
- Testimonials (auto-advancing slider)
- FAQ (accordion with JSON-LD schema)
- Gallery (filterable portfolio)
- Contact / Booking (form + map + social)

## All 9 Advanced Features

| # | Feature | What It Does |
|---|---------|-------------|
| 1 | **Data-Driven Config** | `config.js` controls ALL content, colors, links — edit one file |
| 2 | **Dark Mode Toggle** | Moon/sun button in navbar; persists preference in localStorage |
| 3 | **FAQ Accordion + JSON-LD** | Expandable Q&A + structured data for Google rich results |
| 4 | **Scroll-Reveal Animations** | Intersection Observer fades in sections on scroll |
| 5 | **Pricing Toggle** | Monthly/Yearly switch with 20% savings badge |
| 6 | **Filterable Gallery** | JS-only category filter with hover overlay |
| 7 | **Cookie Consent Banner** | GDPR-friendly banner, stores acceptance in localStorage |
| 8 | **Progress Bar** | Thin top bar fills as you scroll |
| 9 | **Multi-Niche Theme Switcher** | Change `niche` in config.js: fitness / restaurant / agency / course |

## Customization Instructions

### 1. Quick Start
Open **`config.js`** — it's the only file you need to edit.

### 2. Change Niche
```js
niche: "fitness"  // try "restaurant", "agency", or "course"
```
This swaps all accent colors, button hues, and dark mode palette.

### 3. Customize Content
Every section's text, images, prices, links, and social handles are in `config.js`. Just replace the values.

### 4. Booking Form
Replace `YOUR_FORM_ID` in `config.js` under `booking.formAction` with your Formspree ID.

### 5. WhatsApp
Update `whatsapp.number` and `whatsapp.message` in `config.js`.

### 6. Map
Replace `contact.mapEmbed` URL with your Google Maps embed link.

### 7. Images
All image URLs are in `config.js` — swap Unsplash URLs with your own.

### 8. Disable Features
- **Cookie banner** → set `cookieConsent.enabled: false`
- **Dark mode** → set `darkMode: false`
- Remove any section by deleting its config block

## Tech Stack
- HTML5
- Tailwind CSS (Play CDN, `darkMode: 'class'`)
- Font Awesome 6
- Vanilla JavaScript (no frameworks)
- JSON-LD structured data

## Best For
Fitness coaches, yoga instructors, personal trainers, nutritionists, wellness professionals.
