# SHADOW BYTE SYNDICATE (SBS)
> **"WE DON’T FOLLOW THE SYSTEM, WE SECURE IT."**  
> *HACK • RESEARCH • INNOVATE • SECURE • BEYOND FIREWALLS*

---

Official full-stack web platform for **Shadow Byte Syndicate**, a collegiate cybersecurity defense collective and ethical hacking research club. Built with Next.js (App Router), TypeScript, Tailwind CSS, PostgreSQL / SQLite, and Prisma ORM.

---

## 🛡️ Table of Contents
1. [Brand Assets & Visual Identity](#1-brand-assets--visual-identity)
2. [Technology Stack](#2-technology-stack)
3. [Role-Based Access Control & Permission Matrix](#3-role-based-access-control--permission-matrix)
4. [Project Structure](#4-project-structure)
5. [Getting Started & Local Development](#5-getting-started--local-development)
6. [Secure Super Admin Bootstrap](#6-secure-super-admin-bootstrap)
7. [Environment Variables](#7-environment-variables)
8. [Automated Test Suite](#8-automated-test-suite)
9. [Deployment Instructions](#9-deployment-instructions)
10. [Responsible Security Disclosure](#10-responsible-security-disclosure)

---

## 1. Brand Assets & Visual Identity

The platform directly integrates the official visual reference banner:
- **Full Banner (`/public/assets/brand/banner.jpeg`)**: The authentic 1600x639 horizontal brand artwork featuring the SB shield emblem, cyber defense figure, terminal diagnostics, and core mottos. Rendered in a high-tech viewport frame on desktop and adapted with a dedicated high-fidelity responsive identity card on mobile.
- **SB Shield Emblem (`/public/assets/brand/shield-emblem.png`)**: A 300x300 centered crop preserving the authentic shield with silver "S", crimson "B", circuit breakout pins, and circular neon red glow. Used in the navbar, footer, login portals, and mobile identity card.
- **Favicon & Web Icons (`/public/favicon.ico`)**: Multi-resolution (16px, 32px, 48px, 192px, 512px) icons generated directly from the authentic shield emblem.
- **Design System**: Pitch-black surfaces (`#050508`), crimson accents (`#8B0000`), neon cybersecurity red (`#FF1E27`), chrome typography (`#F1F5F9`), technical corner brackets, and circuit grid backdrops.

---

## 2. Technology Stack

- **Framework**: Next.js 14.2.35 (App Router with Server Components & Server Actions)
- **Language**: TypeScript (Strict mode enabled)
- **Styling**: Tailwind CSS with custom cyber theme, glows, and technical panels
- **Database & ORM**: PostgreSQL (Production) / SQLite (Zero-dependency local dev) via Prisma ORM
- **Authentication**: Stateless signed JWT session cookies (`jose`) backed by database Session table for instant revocation + `bcryptjs` password hashing (cost 12)
- **Input Validation**: Zod schemas for all client and server mutations
- **Security & Sanitization**: `isomorphic-dompurify`, sliding-window IP rate limiting, strict MIME/extension/size file upload filtering
- **Testing**: Vitest automated test suite

---

## 3. Role-Based Access Control & Permission Matrix

The application implements three mutually exclusive authenticated roles with dedicated login portals:

| Portal Entry Point | Role | Destination Dashboard |
| :--- | :--- | :--- |
| `/login/student` | `STUDENT` | `/student` |
| `/login/coordinator` | `COORDINATOR` | `/coordinator` |
| `/login/super-admin` | `SUPER_ADMIN` | `/admin` |

### Permission Matrix

| Capability | Public Visitor | Student | Coordinator | Super Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Browse Published Events & Articles** | ✅ | ✅ | ✅ | ✅ |
| **Register for Open Events** | ❌ (Login Prompt) | ✅ (Active only) | ❌ | ❌ |
| **View Own Registrations / Status** | ❌ | ✅ | ❌ | ✅ (All) |
| **View Another Student's Data** | ❌ | ❌ (Denied) | ❌ (Denied) | ✅ |
| **Create / Edit / Publish Events & Posts** | ❌ | ❌ | ✅ | ✅ |
| **Upload Images for Events & Posts** | ❌ | ❌ | ✅ (5MB JPEG/PNG/WebP) | ✅ |
| **Permanently Delete Events or Posts** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **Edit Site Settings, Slogans & Branding** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **Manage Team, Resources & Gallery** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **Appoint / Deactivate Coordinators** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **Manage Student Accounts & Status** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **View Audit Logs & Contact Inquiries** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **Deactivate / Demote Last Active Admin** | ❌ | ❌ | ❌ (Forbidden) | ❌ (Blocked by Guard) |

---

## 4. Project Structure

```
SBS/
├── public/
│   ├── assets/brand/
│   │   ├── banner.jpeg         # Full 1600x639 brand artwork
│   │   ├── shield-emblem.png   # Precision 300x300 centered SB shield crop
│   │   └── favicon-32.png      # High-res favicon
│   ├── favicon.ico             # Multi-size ICO
│   └── uploads/                # Validated media uploads
├── prisma/
│   ├── schema.prisma           # Official PostgreSQL production schema
│   ├── schema.sqlite.prisma    # Local development zero-setup schema
│   └── seed.ts                 # Fictional dev fixture seed script
├── scripts/
│   └── bootstrap-admin.ts      # Secure initial Super Admin provisioning
├── src/
│   ├── app/
│   │   ├── api/                # 13 REST API endpoints (Auth, Events, Admin, Contact)
│   │   ├── (auth)/             # Login portals, signup, password reset
│   │   ├── admin/              # Super Admin Command Dashboard
│   │   ├── coordinator/        # Coordinator Operations Hub
│   │   ├── student/            # Student Member Portal
│   │   ├── events/             # Event listing & detail pages
│   │   ├── posts/              # Knowledge Hub articles & write-ups
│   │   ├── about/              # Mission, faculty mentorship & FAQs
│   │   ├── team/               # Faculty and committee leadership
│   │   ├── resources/          # Curated learning guides
│   │   ├── contact/            # Spam-protected inquiry channel
│   │   ├── layout.tsx          # Root layout with SEO and metadata
│   │   └── page.tsx            # Homepage with hero banner and preview sections
│   ├── components/             # Reusable UI & dashboard components
│   └── lib/                    # Auth, Prisma, Validators, Rate-Limiter, Audit, Email
└── tests/                      # Automated Vitest test suites (14 tests)
```

---

## 5. Getting Started & Local Development

### Prerequisites
- Node.js 18.18+ or 20.x+ (tested on Node v24 LTS)
- npm 10+ or pnpm

### Quick Setup

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   *(For zero-setup offline local testing, `.env` defaults to `DATABASE_URL="file:./dev.db"`)*.

3. **Initialize the local database**:
   ```bash
   npx prisma db push --schema=prisma/schema.sqlite.prisma
   ```

4. **Seed fictional development fixtures**:
   ```bash
   npm run db:seed
   ```
   *Development Fixture Accounts:*
   - **Super Admin**: `admin@shadowbyte.local` / `AdminDevPass123!`
   - **Coordinator**: `coordinator@shadowbyte.local` / `CoordDevPass123!`
   - **Student**: `student@shadowbyte.local` / `StudentDevPass123!`

5. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Secure Super Admin Bootstrap

In production or staging, **never ship default administrative credentials**. Provision the initial Super Admin account using the secure bootstrap CLI script:

```bash
npx tsx scripts/bootstrap-admin.ts <admin-email> <admin-password> "[Admin Name]"
```

Or configure via environment variables:
```bash
BOOTSTRAP_ADMIN_EMAIL="root@shadowbyte.club" \
BOOTSTRAP_ADMIN_PASSWORD="YourStrongSecurePassword123!" \
npx tsx scripts/bootstrap-admin.ts
```

---

## 7. Environment Variables

See `.env.example` for comprehensive parameter definitions:

```env
# Database Connection (PostgreSQL for Production, SQLite for Local Dev)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shadow_byte_syndicate?schema=public"

# Session & JWT Signing Key (At least 32 characters)
JWT_SECRET="generate_with_openssl_rand_base64_32"

# Application Base URL & Club Timezone
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_TIMEZONE="Asia/Kolkata"

# Email Delivery (Optional; when omitted, emails log to server console in Development Mode)
# SMTP_HOST="smtp.mailtrap.io"
# SMTP_PORT="587"
# SMTP_USER="your-user"
# SMTP_PASS="your-pass"
# EMAIL_FROM="no-reply@shadowbyte.club"
```

---

## 8. Automated Test Suite

The project includes 14 automated tests covering role isolation, event capacity concurrency, registration deadlines, and portal access:

```bash
npm test
```

### Verified Test Cases:
1. `auth.test.ts`:
   - Public signup always forces `STUDENT` role even if `SUPER_ADMIN` is submitted.
   - Password hashing and verification via `bcrypt` (cost 12).
   - Deactivated accounts lose authorization instantly.
2. `permissions.test.ts`:
   - Coordinators can create and edit events and posts.
   - Student queries strictly enforce ownership isolation.
   - The last active Super Admin cannot be deactivated or demoted.
3. `events.test.ts`:
   - Unpublished/draft events are never accessible on public routes.
   - Duplicate registrations are rejected by database unique constraints.
   - Transaction-safe capacity checks prevent oversubscription.
   - Registration deadline enforcement rejects expired requests.
4. `integration.test.ts`:
   - Portal role mismatch rejection (students cannot log in via coordinator/admin portals).
   - Coordinators cannot permanently delete records.
   - Super Admin content edits persist and update public views.
   - Concurrent registration race condition test verifies zero oversubscription.

---

## 9. Deployment Instructions

### Production PostgreSQL Deployment
1. Set `DATABASE_URL` in your production environment (e.g. AWS RDS, Neon, Supabase, or self-hosted PostgreSQL).
2. Generate Prisma Client for PostgreSQL:
   ```bash
   npx prisma generate --schema=prisma/schema.prisma
   ```
3. Push schema or run migrations:
   ```bash
   npx prisma db push --schema=prisma/schema.prisma
   ```
4. Bootstrap your root Super Admin account:
   ```bash
   npx tsx scripts/bootstrap-admin.ts <your-email> <your-strong-password>
   ```
5. Build the optimized production application:
   ```bash
   npm run build
   npm run start
   ```

---

## 10. Responsible Security Disclosure

Shadow Byte Syndicate is committed to defensive security research, collegiate education, and coordinated vulnerability disclosure. If you identify an issue in this platform or any club-managed service, please report it directly to:

- **Email**: `contact@shadowbyte.club` / `faculty.advisor@placeholder.college.edu`
- **Protocol**: 90-day coordinated disclosure policy before public publication.
