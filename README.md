# LevyLite — Affordable Strata Management Software

> Strata management software that doesn't cost the earth.

**Live site:** [levylite.com.au](https://levylite.com.au)

---

## What is LevyLite?

LevyLite is a SaaS strata management platform built for small Australian operators — sole practitioners, small agencies, and self-managed strata schemes. Enterprise strata software costs $5K–$20K/year and requires 600+ lots minimum. LevyLite starts free and scales with you.

**Free tier:** 5 lots, 1 scheme — forever free, no credit card required.  
**Paid plans:** From $0.75/lot/month. No minimums. No sales calls.

---

## Features

- **Levy management** — Track levies, send notices, reconcile payments
- **AGM tools** — Agenda builder, proxy forms, minutes templates, deadline reminders
- **Owner portal** — Self-service portal so owners can access documents and make payments
- **Document management** — Store bylaws, certificates, insurance docs, meeting minutes
- **Trust accounting** — BPAY, EFT, and manual payment tracking with reconciliation
- **Mobile-friendly** — Works on desktop, tablet, and phone

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Language | TypeScript |
| Deployment | Netlify |
| Fonts | Geist (via `next/font`) |
| Email/Waitlist | Kit (ConvertKit) |

---

## Getting Started (Development)

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone https://github.com/csjohnst/levylite.git
cd levylite
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Environment Variables

Create a `.env.local` file:

```env
# Kit (ConvertKit) — waitlist signup form
NEXT_PUBLIC_KIT_FORM_ID=your_kit_form_id
KIT_API_KEY=your_kit_api_key
```

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx       # Root layout — metadata, schema markup, fonts
│   ├── page.tsx         # Landing page (hero, features, pricing, CTA)
│   ├── sitemap.ts       # Auto-generated sitemap for SEO
│   └── robots.ts        # robots.txt for SEO
├── components/
│   ├── signup-form.tsx  # Waitlist/early access signup (Kit integration)
│   └── ui/              # shadcn/ui component library
└── lib/
    └── utils.ts         # Tailwind class merging utility
```

---

## SEO

- **Metadata:** Full OpenGraph, Twitter card, canonical URL via Next.js `Metadata` API
- **Schema markup:** `Organization` + `SoftwareApplication` JSON-LD in layout
- **Sitemap:** Auto-generated at `/sitemap.xml` via `src/app/sitemap.ts`
- **Robots.txt:** Served at `/robots.txt` via `src/app/robots.ts`
- **Target keywords:** strata management software australia, affordable strata software, small strata operator

---

## Deployment

Deployed to Netlify via Git push. No manual steps required.

**Main branch** → Production at `levylite.com.au`  
**Feature branches** → Preview deploys (Netlify auto-creates preview URLs)

---

## Development Notes

- This is a marketing/waitlist site. The full SaaS product is under development.
- Waitlist signups go to Kit (ConvertKit) — see `src/components/signup-form.tsx`
- Pricing tiers are defined in `src/app/page.tsx` — update there for any pricing changes
- The `dashboard.png` in `/public/` is a mockup screenshot for the hero section

---

## Contributing

This is a private project. If you're Kai — check the kanban board in the Kai Dashboard for queued tasks.

---

*Built by [Kokoro Software](https://kokorosoftware.com)*
