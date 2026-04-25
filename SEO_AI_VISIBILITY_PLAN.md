# SEO and AI Visibility Plan for REXTEN

This document captures the current SEO state of the project and the work needed to make REXTEN visible in search engines and AI-powered answer results.

## Current State

The project has a basic global metadata setup:

- `frontend/src/app/layout.jsx` uses `pageMetaConfig`.
- `frontend/src/configs/page-meta.config.js` contains a generic title, description, and icons.
- Some informational pages already have `generateMetadata()`, for example:
  - `frontend/src/app/(public-pages)/landing/page.jsx`
  - `frontend/src/app/(public)/privacy/page.jsx`
  - `frontend/src/app/(public)/terms/page.jsx`
  - `frontend/src/app/(public)/cookies/page.jsx`

The backend already exposes useful public marketplace data:

- `GET /api/marketplace/services`
- `GET /api/marketplace/categories`
- `GET /api/marketplace/services/{slug}/profile`
- `GET /api/marketplace/company/{slug}`

The `Company` model already has SEO fields:

- `seo_title`
- `seo_description`
- `meta_keywords`

These fields are not yet fully used on public marketplace pages.

## Main Gaps

### 1. Missing robots.txt and sitemap.xml

No `robots.txt` or `sitemap.xml` implementation was found.

Need to add:

- `frontend/src/app/robots.js`
- `frontend/src/app/sitemap.js`

The sitemap should include:

- `/services`
- `/marketplace/{slug}` for active, approved, public listings
- `/marketplace/company/{slug}` for active, visible companies
- `/privacy`
- `/terms`
- `/cookies`
- `/marketplace-terms`
- landing page, if it remains public and indexable

### 2. Important public pages are client-side rendered

The most important SEO pages currently use client-side loading:

- `frontend/src/app/(public)/services/page.jsx`
- `frontend/src/app/(public)/marketplace/[slug]/page.jsx`
- `frontend/src/app/(public)/marketplace/company/[slug]/page.jsx`

These pages should expose meaningful HTML on first response. Search engines and AI crawlers should not need to wait for `useEffect` or React Query to understand page content.

Recommended structure:

- `page.jsx` as a server component
- `generateMetadata()` in the server page
- server-side data fetch from Laravel
- client component for filters, booking, favorites, tabs, and other interactive behavior
- pass `initialData` into the client component

### 3. Missing dynamic metadata for marketplace pages

`/marketplace/[slug]` and `/marketplace/company/[slug]` need dynamic:

- `title`
- `description`
- `canonical`
- `openGraph`
- `twitter`
- `robots`
- fallback image

For `/marketplace/[slug]`:

- title: `{Listing name} in {City, State} | REXTEN`
- description: listing description, category, price, rating, and booking intent
- canonical: `https://rexten.live/marketplace/{slug}`
- image: listing image or platform fallback

For `/marketplace/company/[slug]`:

- title: `{Company name} | Services in {City, State} | REXTEN`
- description: `seo_description` or company description
- canonical: `https://rexten.live/marketplace/company/{slug}`
- image: company logo, cover, first listing image, or fallback

### 4. Missing JSON-LD / Schema.org

No `application/ld+json` / Schema.org implementation was found.

Need helper components:

- `JsonLd`
- `OrganizationJsonLd`
- `WebSiteJsonLd`
- `LocalBusinessJsonLd`
- `ServiceJsonLd`
- `BreadcrumbJsonLd`
- `FAQJsonLd`

Recommended schema per page:

- Landing: `Organization`, `WebSite`, `FAQPage`
- `/services`: `CollectionPage`, `ItemList`, `WebSite` with `SearchAction`
- `/marketplace/[slug]`: `Service`, `Offer`, `AggregateRating`, `Review`, `BreadcrumbList`
- `/marketplace/company/[slug]`: `LocalBusiness`, `AggregateRating`, `Review`, `ItemList`, `BreadcrumbList`

### 5. Canonical URL strategy is unclear

There are overlapping public routes:

- `/marketplace/[slug]`
- `/marketplace/company/[slug]`
- `/business/[slug]`

`frontend/src/app/(public)/business/[slug]/page.jsx` is currently a placeholder and always returns a not-found style state.

Need to decide:

- `/marketplace/[slug]` is canonical for listings/services.
- `/marketplace/company/[slug]` is canonical for company profiles.
- `/business/[slug]` should either redirect, be removed, be marked `noindex`, or be fully implemented.

### 6. No category and city SEO landing pages

The catalog uses query filters:

- `/services?category=...`
- `/services?state=...`
- `/services?city=...`

For SEO, create indexable landing pages:

- `/services/{category}`
- `/services/{category}/{state}`
- `/services/{category}/{state}/{city}`

Each page should have:

- unique `h1`
- unique metadata
- canonical URL
- intro text
- real listing results
- FAQ block
- breadcrumbs
- JSON-LD

Examples:

- `/services/hair-salon/california/los-angeles`
- `/services/cleaning/texas/austin`

### 7. Multilingual SEO is not URL-based

The app supports five locales:

- `en`
- `ru`
- `es-MX`
- `hy-AM`
- `uk-UA`

Currently locale is resolved through cookies and `Accept-Language`, not explicit SEO URLs.

For strong multilingual SEO, consider URL-based locale routing:

- `/en/services`
- `/ru/services`
- `/es-MX/services`
- `/hy-AM/services`
- `/uk-UA/services`

If URL-based locale routing is not planned yet, avoid emitting misleading `hreflang` alternates. Keep canonical stable and make sure crawlers do not see inconsistent language versions for the same URL.

### 8. Missing llms.txt

Add:

- `/llms.txt`
- optional `/llms-full.txt`

This helps AI crawlers and agents understand the site. It is not a replacement for SEO, but it is useful for AI visibility.

Suggested content:

- what REXTEN is
- key public URLs
- marketplace purpose
- business owner features
- customer booking flow
- public docs/FAQ links
- how to cite REXTEN

## Implementation Plan

### Phase 1: Technical SEO Foundation

Add:

- `frontend/src/app/robots.js`
- `frontend/src/app/sitemap.js`
- `metadataBase` in global metadata
- common SEO helpers:
  - `SITE_URL`
  - absolute URL builder
  - canonical builder
  - image URL normalizer for metadata
- global Open Graph and Twitter defaults
- platform fallback OG image

Also verify actual icon files referenced by metadata:

- `/favicon.ico`
- `/icon.svg`
- `/apple-icon.svg`

### Phase 2: Server-render Public Marketplace Pages

Refactor:

- `frontend/src/app/(public)/services/page.jsx`
- `frontend/src/app/(public)/marketplace/[slug]/page.jsx`
- `frontend/src/app/(public)/marketplace/company/[slug]/page.jsx`

Target architecture:

- server `page.jsx`
- client component for interactivity
- server-side data fetch
- `generateMetadata()`
- `notFound()` for missing entities
- JSON-LD rendered in initial HTML

### Phase 3: Dynamic Metadata

Implement metadata for:

- `/services`
- `/marketplace/[slug]`
- `/marketplace/company/[slug]`
- legal pages with canonical and Open Graph
- landing page with canonical and Open Graph

Metadata rules:

- index only public, active, visible, approved entities
- use `seo_title` and `seo_description` where available
- fallback to generated text
- keep title length reasonable
- keep description around 140-160 characters where possible

### Phase 4: Structured Data

Add JSON-LD helpers and apply:

- `Organization` on landing or root public layout
- `WebSite` with `SearchAction`
- `Service` and `Offer` on listing pages
- `LocalBusiness` on company profile pages
- `AggregateRating` and `Review` when visible reviews exist
- `BreadcrumbList` on catalog, listing, and company pages
- `FAQPage` where FAQ blocks exist

### Phase 5: Sitemap Data Endpoints

Instead of using heavy marketplace endpoints for sitemap generation, add lightweight Laravel endpoints, for example:

- `GET /api/seo/marketplace-listings`
- `GET /api/seo/companies`
- `GET /api/seo/categories`
- `GET /api/seo/locations`

Only include:

- active listings
- approved listings
- public companies
- active companies
- visible marketplace entities

Avoid indexing expired ads or hidden businesses.

### Phase 6: Category and Location Landing Pages

Create SEO pages for:

- category
- category + state
- category + state + city

Each page should include:

- server-rendered listing results
- text block
- FAQ
- breadcrumbs
- JSON-LD
- canonical
- sitemap entry

These pages are likely the main growth driver for organic traffic.

### Phase 7: AI Visibility

Add:

- `/llms.txt`
- public FAQ pages
- clear “How REXTEN works” pages
- public help content where appropriate
- concise answer sections on category/location pages

AI answer engines tend to cite pages with:

- clear definitions
- direct answers
- structured headings
- FAQs
- schema
- stable URLs
- external mentions

## Priority Checklist

### Must Do First

- [ ] Add `robots.js`.
- [ ] Add `sitemap.js`.
- [ ] Add `metadataBase`.
- [ ] Add canonical URL helper.
- [ ] Add global Open Graph and Twitter defaults.
- [ ] Refactor `/marketplace/[slug]` to server-render metadata and initial content.
- [ ] Refactor `/marketplace/company/[slug]` to server-render metadata and initial content.
- [ ] Add JSON-LD for listing and company pages.

### Next

- [ ] Refactor `/services` for server-rendered initial catalog data.
- [ ] Add `llms.txt`.
- [ ] Add sitemap data endpoints in Laravel.
- [ ] Add SEO landing pages for category and location.
- [ ] Add FAQ schema to landing and category/location pages.
- [ ] Decide what to do with `/business/[slug]`.

### Later

- [ ] URL-based locale strategy with `hreflang`.
- [ ] Public knowledge base / guides for search traffic.
- [ ] External citations and partner links.
- [ ] Local SEO directory submissions.
- [ ] Search Console and Bing Webmaster monitoring.
- [ ] Core Web Vitals tuning.

## Validation Checklist

After implementation:

- [ ] `https://rexten.live/robots.txt` is available.
- [ ] `https://rexten.live/sitemap.xml` is available.
- [ ] Google Search Console accepts sitemap.
- [ ] Bing Webmaster Tools accepts sitemap.
- [ ] Rich Results Test validates key pages.
- [ ] Schema Markup Validator has no critical errors.
- [ ] `view-source:` of marketplace pages contains real content.
- [ ] `view-source:` contains JSON-LD.
- [ ] Page titles and descriptions are unique.
- [ ] Canonical URLs are correct.
- [ ] Hidden or inactive entities are not indexed.

## Important Notes

- There is no single “AI SEO switch”. AI visibility depends on normal SEO, structured data, good public content, and external authority.
- The project already has enough marketplace data to build strong SEO pages.
- The biggest current issue is that critical marketplace pages are client-rendered and do not expose enough useful HTML/metadata on first response.
- Category and city landing pages should be treated as a separate growth project after the technical foundation is fixed.
