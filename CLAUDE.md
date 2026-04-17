# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GPC (Gestione Presa in Carico) is a Next.js 15 multi-tenant portal for managing personal records ("anagrafica") for social service organizations. Built with React 19, Firebase (Auth, Firestore, Storage), and Tailwind CSS 4.

## Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build with Turbopack
npm run lint         # Biome linter check
npm run format       # Biome format with auto-fix
```

## Architecture

### Authentication Flow
- Firebase Auth with session cookies (5-day expiry)
- Middleware (`src/middleware.js`) verifies sessions via `/api/auth/verify` and sets `x-user-uid` header
- Client-side auth state managed via `AuthContext` (`src/context/AuthContext.js`)
- Session endpoints: `/api/auth/sessionLogin`, `/api/auth/sessionLogout`, `/api/auth/me`

### Multi-Tenant Structure
- Routes use `[structureId]` dynamic segment: `src/app/(portal)/[structureId]/...`
- Users belong to one or more structures via `operators.structureIds` in Firestore
- Permission checks use `verifyUserPermissions()` from `src/utils/server-auth.js`
- Super admins (role: 'admin') bypass structure checks

### Server Actions Pattern
- Server actions in `src/actions/` use `'use server'` directive
- All actions call `requireUser()` to get authenticated user from headers
- Then call `verifyUserPermissions()` with structure or allowed structure list
- Return JSON-stringified results for serialization

### Key Firestore Collections
- `operators` - User profiles with `structureIds` array
- `structures` - Organization/facility records with `admins` array
- `anagrafica` - Personal records with `canBeAccessedBy` structure list
- `accessi` - Access/service records linked to anagrafica
- `reminders` - Scheduled reminders linked to access records

### File Storage
- Firebase Storage for file uploads
- Path pattern: `files/{anagraficaId}/accessi/{accessId}/{filename}`
- Signed URLs generated via `getAccessFileUrl()` (1-hour expiry)

### UI Components
- Shadcn/ui components in `src/components/ui/`
- Feature components in `src/components/Anagrafica/` for forms/dialogs
- Tiptap rich text editor with custom extensions
- Form options/enums in `src/data/formOptions.js`

### Path Alias
`@/*` maps to `./src/*` (configured in jsconfig.json)

## Key Files

- `src/utils/server-auth.js` - Authentication helpers: `requireUser()`, `verifyUserPermissions()`, `verifyStructureAdmin()`, `verifySuperAdmin()`
- `src/lib/firebase/firebaseAdmin.js` - Server-side Firebase Admin SDK
- `src/lib/firebase/firebaseClient.js` - Client-side Firebase SDK
- `src/lib/utils.js` - Utility functions including `cn()` for class merging and `serializeFirestoreData()`
