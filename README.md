# SHADOW BYTE SYNDICATE (SBS)
> **"WE DON’T FOLLOW THE SYSTEM, WE SECURE IT."**  
> *HACK • RESEARCH • INNOVATE • SECURE • BEYOND FIREWALLS*

---

Official full-stack web platform for **Shadow Byte Syndicate**, a collegiate cybersecurity defense collective and ethical hacking research club. Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Google Firebase** as the sole backend (**Firebase Authentication**, **Cloud Firestore**, **Firebase Storage**, **Cloud Functions for Firebase**, and **Firebase Security Rules**).

---

## Table of Contents
1. [Brand Assets & Visual Identity](#1-brand-assets--visual-identity)
2. [Technology Stack & Firebase Architecture](#2-technology-stack--firebase-architecture)
3. [Role-Based Access Control & Permission Matrix](#3-role-based-access-control--permission-matrix)
4. [Project Structure](#4-project-structure)
5. [Local Development with Firebase Emulator Suite](#5-local-development-with-firebase-emulator-suite)
6. [Connecting a Live Google Firebase Project](#6-connecting-a-live-google-firebase-project)
7. [Secure Super Admin Bootstrap](#7-secure-super-admin-bootstrap)
8. [Automated Test Suite](#8-automated-test-suite)
9. [Production Deployment Checklist](#9-production-deployment-checklist)
10. [Responsible Security Disclosure](#10-responsible-security-disclosure)

---

## 1. Brand Assets & Visual Identity

The platform integrates the official visual reference artwork:
- **Full Banner (`public/assets/brand/banner.jpeg`)**: 1600×639 horizontal brand artwork featuring the SB shield emblem, cyber defense figure, terminal diagnostics, and core mottos.
- **SB Shield Emblem (`public/assets/brand/shield-emblem.png`)**: Precision-cropped 300×300 emblem preserving the silver "S", crimson "B", circuit pins, and circular red glow for navigation, footers, and login portals.
- **Favicon & Web Icons (`public/favicon.ico`)**: Multi-resolution icons derived directly from the shield emblem.
- **Design System**: Pitch-black surfaces (`#050508`), crimson accents (`#8B0000`), bright cyber red (`#FF1E27`), chrome typography (`#F1F5F9`), technical brackets, and circuit grid patterns.

---

## 2. Technology Stack & Firebase Architecture

- **Framework**: Next.js 14.2.35 (App Router with Server Components & API Routes)
- **Language & Styling**: TypeScript + Tailwind CSS + Framer Motion + Lucide Icons
- **Firebase Authentication**:
  - Email/Password registration & sign-in
  - Google Sign-In (`GoogleAuthProvider`) with automatic `STUDENT` onboarding on the Student portal only
  - Password reset recovery (`/forgot-password` & `/reset-password`)
  - Server-side HTTP-only Firebase Session Cookies (`sbs_firebase_session`) with `checkRevoked` verification and Custom Claims (`role`, `isActive`)
- **Cloud Firestore (Native Mode)**:
  - Stores `users` (keyed by Firebase Auth UID + `users/{uid}/activityHistory` subcollection), `events`, `eventRegistrations` (deterministic `${eventId}_${uid}` IDs), `posts`, `siteSettings/default`, `teamMembers`, `resources`, `gallery`, `contactMessages`, and append-only `auditLogs`
  - Real-time `onSnapshot` listeners in `AuthContext` and `StudentDashboardClient`
  - Transaction-safe capacity & duplicate prevention during event registration
- **Firebase Storage**:
  - Validated JPEG, PNG, WebP uploads (5 MB max; SVGs and executables blocked)
  - Direct client-side uploads with progress indicators (`useStorageUpload`) + server-side fallback (`/api/upload`)
  - User-isolated avatar paths (`/uploads/avatars/{uid}/...`) and staff media paths (`/uploads/events/{uid}/...`, `/uploads/posts/{uid}/...`)
- **Cloud Functions for Firebase (`functions/`)**:
  - `syncUserRoleClaims`: Keeps Auth Custom Claims (`role`, `isActive`) and `disabled` state synchronized with `users/{uid}`
  - `syncEventRegistrationCount`: Reconciles parent Event `registeredCount` on registration writes
  - `registerForEvent`: HTTPS Callable transactional event booking function
  - `auditAuthUserCreate`: Records Firebase Auth creation telemetry
- **Firebase Security Rules**:
  - `firestore.rules`: Zero-trust default deny with dual-verified role claims + user profile state, strict student isolation, and immutable audit logs
  - `storage.rules`: Role, UID-folder, MIME, and 5 MB size enforcement

---

## 3. Role-Based Access Control & Permission Matrix

| Portal Entry Point | Role | Destination Dashboard |
| :--- | :--- | :--- |
| `/login/student` | `STUDENT` | `/student` |
| `/login/coordinator` | `COORDINATOR` | `/coordinator` |
| `/login/super-admin` | `SUPER_ADMIN` | `/admin` |

### Permission Matrix

| Capability | Public Visitor | Student | Coordinator | Super Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Browse Published Events & Articles** | ✅ | ✅ | ✅ | ✅ |
| **Register for Open Events** | ❌ | ✅ (Active only) | ❌ | ❌ |
| **View Own Registrations & Profile** | ❌ | ✅ | ❌ | ✅ (All) |
| **View Another Student's Data** | ❌ | ❌ (Denied) | ❌ (Denied) | ✅ |
| **Create / Edit / Publish Events & Posts** | ❌ | ❌ | ✅ | ✅ |
| **Upload Images for Events & Posts** | ❌ | ❌ | ✅ (Events/Posts only) | ✅ (All folders) |
| **Permanently Delete Events or Posts** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **Edit Site Settings, Slogans & Branding** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **Manage Team, Resources & Gallery** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **Appoint / Deactivate Coordinators** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **Manage Student Accounts & Roles** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **View Audit Logs & Contact Inquiries** | ❌ | ❌ | ❌ (Forbidden) | ✅ |
| **Deactivate / Demote Last Active Admin** | ❌ | ❌ | ❌ (Forbidden) | ❌ (Blocked) |

---

## 4. Project Structure

```
SBS/
├── firebase.json                 # Emulators, Firestore/Storage rules & Functions config
├── firestore.rules               # Production zero-trust Cloud Firestore rules
├── firestore.indexes.json        # Composite Firestore query indexes
├── storage.rules                 # Production Firebase Storage rules
├── functions/                    # Cloud Functions for Firebase (TypeScript)
├── scripts/
│   ├── seed-firebase.ts          # Opt-in local emulator dev fixture seeder (--with-demo-fixtures)
│   ├── cleanup-demo-content.ts   # Back up & cleanly remove sample/demo Firestore records
│   └── bootstrap-admin.ts        # Provisions initial Super Admin securely
├── src/
│   ├── firebase/                 # Client config, Admin SDK, auth, firestore, storage, functions
│   ├── context/AuthContext.tsx   # Real-time Auth + Firestore profile provider
│   ├── hooks/                    # useAuth, useStorageUpload, useFirestoreCollection
│   ├── services/                 # Firestore data access & transactional business logic
│   ├── lib/                      # Session cookies, validators, audit, rate limiter
│   ├── app/                      # Next.js App Router pages & REST API routes
│   └── components/               # Cyber UI & role-based dashboards
└── tests/                        # Vitest Firebase Emulator & Security Rules test suite
```

---

## 5. Local Development with Firebase Emulator Suite

### Prerequisites
- Node.js 20.x+ (tested on Node v24)
- Java JDK 17+ / JRE (required for local Firebase Firestore Emulator)

### Quick Setup (100% Local Emulators — Zero Cloud Credentials Required)

1. **Install dependencies**:
   ```bash
   npm install
   npm --prefix functions install
   npm run functions:build
   ```

2. **Ensure `.env` uses Emulator Mode** (already configured in `.env` for local development):
   ```env
   NEXT_PUBLIC_USE_FIREBASE_EMULATORS="true"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="demo-shadow-byte-syndicate"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="demo-shadow-byte-syndicate.appspot.com"
   ```

3. **Start the Firebase Local Emulator Suite** (Terminal 1):
   ```bash
   npm run emulators:start
   ```
   Emulator UI opens at [http://127.0.0.1:4000](http://127.0.0.1:4000).

4. **Bootstrap your Super Admin & configure genuine content via `/admin`** (Terminal 2):
   ```bash
   npx tsx scripts/bootstrap-admin.ts <admin-email> <admin-password> "<Admin Name>"
   ```
   *(Automatic demo seeding is disabled. Sample fixtures are only loaded in the local Firebase Emulator if you explicitly opt in with `npx tsx scripts/seed-firebase.ts --with-demo-fixtures`.)*

   To export a JSON backup and remove any previously seeded demo records while preserving genuine data:
   ```bash
   npm run db:cleanup-demo            # Preview backup + candidate demo records (dry run)
   npm run db:cleanup-demo -- --apply # Export backup to backups/ and delete confirmed demo records
   ```

5. **Start Next.js** (Terminal 2):
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## 6. Connecting a Live Google Firebase Project

Copy `.env.example` to `.env` (setting `NEXT_PUBLIC_USE_FIREBASE_EMULATORS="false"`) and populate the values from **Google Firebase Console**:

1. **Authentication Providers**: In Firebase Console -> *Build -> Authentication -> Sign-in method*, enable **Email/Password** and **Google**.
2. **Client SDK Config**: Go to *Project Settings -> General -> Your Apps -> Web App* to copy:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
3. **Admin SDK Credentials (Server-Side Only)**: Go to *Project Settings -> Service Accounts -> Generate New Private Key* and configure:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (or single-line `FIREBASE_SERVICE_ACCOUNT_KEY`)
4. **Cloud Firestore & Storage**: Enable *Firestore Database* (Native mode) and *Storage* in Firebase Console, then deploy rules & indexes:
   ```bash
   npx firebase use <your-project-id>
   npx firebase deploy --only firestore:rules,firestore:indexes,storage,functions
   ```

---

## 7. Secure Super Admin Bootstrap

Provision an initial production or staging Super Admin account without shipping default credentials:

```bash
npx tsx scripts/bootstrap-admin.ts <admin-email> <admin-password> "[Admin Name]"
```

Or via environment variables:
```bash
BOOTSTRAP_ADMIN_EMAIL="admin@your-domain.example" \
BOOTSTRAP_ADMIN_PASSWORD="YourStrongSecurePassword123!" \
npx tsx scripts/bootstrap-admin.ts
```

---

## 8. Automated Test Suite

Run the full automated suite against the Firebase Local Emulator Suite (covering authentication, Google Sign-In, password reset, session cookie revocation, Firestore & Storage security rules, student isolation, concurrency, and transactional capacity):

```bash
npx firebase emulators:exec --project demo-shadow-byte-syndicate "npm test"
```

---

## 9. Production Deployment Checklist

- Configure all environment variables from `.env.example` in your hosting platform (Vercel / Cloud Run / Firebase App Hosting) with `NEXT_PUBLIC_USE_FIREBASE_EMULATORS="false"`.
- Set `NEXT_PUBLIC_APP_URL` to your production `https://` origin.
- Add your production domain(s) in **Firebase Console -> Authentication -> Settings -> Authorized domains** (required for Google Sign-In).
- Deploy `firestore.rules`, `firestore.indexes.json`, `storage.rules`, and `functions/` via Firebase CLI.
- Ensure Firebase Blaze plan is active if deploying Cloud Functions for Firebase in production.
- Never commit `.env` or Firebase Admin SDK private key files to version control.

---

## 10. Responsible Security Disclosure

Shadow Byte Syndicate operates under strict ethical research principles and coordinated vulnerability disclosure:
- **Contact**: Submitted directly via the portal `/contact` form or the verified administrative email configured in Super Admin Settings.
- **Protocol**: 90-day coordinated disclosure window before public advisory publication.
