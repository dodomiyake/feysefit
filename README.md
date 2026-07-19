# FeyseFit

Premium mobile-first fashion technology MVP — remote measurements, project management, and designer marketplace.

## Design System

Built from the **FeyseFit Premium Design MVP** Stitch project with:

- **Fonts:** Playfair Display (headlines) + Inter (body)
- **Colors:** Dark Brown `#1c0900`, Soft Gold `#b38601`, Highlight Gold `#C8A45D`, Warm Cream `#FAF6EF`, Soft Beige `#EFE3D0`

## Getting Started

```bash
cd feysefit
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Backend (API + Database)

FeyseFit uses **Next.js Route Handlers**, **Prisma**, and **SQLite** for local development.

### Setup

```bash
cd feysefit
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

Check the API: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health + DB status |
| GET | `/api/v1/projects` | List projects |
| GET/PATCH | `/api/v1/projects/[id]` | Get / update project status |
| POST | `/api/v1/projects/[id]/references` | Add customer style/fabric reference |
| DELETE | `/api/v1/projects/[id]/references/[referenceId]` | Remove reference |
| GET | `/api/v1/designers` | List designers |
| GET | `/api/v1/customers` | List customers |
| GET | `/api/v1/customers/[id]/link` | Customer designer link state |
| GET/POST | `/api/v1/invites` | Pending invites |
| GET | `/api/v1/unlink-requests` | Unlink requests |
| GET/PATCH | `/api/v1/marketplace/approvals` | Marketplace approvals |
| GET | `/api/v1/marketplace/live` | Live marketplace designer IDs |

Set `NEXT_PUBLIC_USE_API=true` in `.env` when wiring the frontend to the API (see `src/lib/api/client.ts`).

## Prototype Flows

### Designer Flow
Landing → Sign up → Designer onboarding → Designer dashboard → Invite customer → Create project → Project details → Messaging

### Customer Flow
Landing → Sign up/Login → Customer onboarding → Customer dashboard → Submit measurements → Project details → Messaging

### Marketplace Flow
Landing → Marketplace → Designer profile → Request design

### Admin Flow
Login (demo) → Admin dashboard → View designers → Approve/disable marketplace profile

## Demo Access

On the login page, use the demo buttons:
- **Continue as Designer**
- **Continue as Customer**
- **Continue as Admin**

## Screens

| Screen | Route |
|--------|-------|
| Landing | `/` |
| Sign Up | `/signup` |
| Login | `/login` |
| Designer Onboarding | `/onboarding/designer` |
| Customer Onboarding | `/onboarding/customer` |
| Designer Dashboard | `/dashboard/designer` |
| Customer Dashboard | `/dashboard/customer` |
| Admin Dashboard | `/dashboard/admin` |
| Measurements | `/measurements` |
| Projects | `/projects` |
| Project Details | `/projects/[id]` |
| Create Project | `/projects/new` |
| Messages | `/messages` |
| Marketplace | `/marketplace` |
| Designer Profile | `/marketplace/[id]` |
| Invite Customer | `/invite` |
| Settings | `/settings` |

## Stitch Project

UI designs and HTML exports are available in Stitch project **FeyseFit Premium Design MVP** (ID: `121460024921328406`).
