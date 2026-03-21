# GPC (Gestione Presenze e Contatti) - Architecture Documentation

**Last Updated:** February 6, 2026
**Version:** 1.1

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Core Modules](#core-modules)
5. [Data Model](#data-model)
6. [Authentication & Authorization](#authentication--authorization)
7. [Audit Logging System](#audit-logging-system)
8. [Caching Strategy](#caching-strategy)
9. [File Management](#file-management)
10. [Key Design Patterns](#key-design-patterns)
11. [Security Considerations](#security-considerations)
12. [File Structure](#file-structure)

---

## Overview

GPC is a web application for managing personal records (anagrafica) and service access records (accessi) for social services organizations. It provides multi-tenant support through a structure-based permission system, comprehensive audit logging, and secure file handling.

### Key Features

- **Personal Records Management** (Anagrafica): Comprehensive individual profiles with personal, family, legal, employment, education, and vulnerability information
- **Service Access Tracking** (Accessi): Track services and interventions provided to individuals
- **Project-Based Organization**: Hierarchical organization with Projects containing Structures
- **Multi-Tenant Architecture**: Project and structure-based permissions with role-based access control
- **Audit Logging**: Complete audit trail for all data operations
- **History Tracking**: Detailed change history for anagrafica records
- **File Management**: Secure file upload and access with validation
- **Soft Delete**: Non-destructive record deletion

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: React 18+
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context + Server Actions
- **Forms**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes & Server Actions
- **Database**: Firebase Firestore (NoSQL)
- **Storage**: Firebase Cloud Storage
- **Authentication**: Firebase Authentication
- **Admin SDK**: Firebase Admin SDK

### Development
- **Language**: JavaScript (ES6+)
- **Package Manager**: npm
- **Linting**: ESLint
- **Version Control**: Git

---

## Architecture Patterns

### 1. **Server-First Architecture**
- Leverages Next.js Server Actions for data mutations
- Server-side rendering for optimal performance
- Client components only where interactivity is needed

### 2. **Action-Based Data Layer**
- All data operations centralized in `/src/actions/`
- Consistent error handling and validation
- Separation of internal and public APIs

### 3. **Transaction-Based Mutations**
- Critical operations use Firestore transactions
- Prevents race conditions
- Ensures data consistency

### 4. **Tag-Based Cache Invalidation**
- Fine-grained cache control
- Structure-specific cache tags
- Automatic invalidation on mutations

### 5. **Permission-First Design**
- Every operation checks permissions
- Fresh permission checks (never cached)
- Structure-based access control

---

## Core Modules

### 1. Anagrafica Module

**Purpose**: Manage comprehensive personal records with modular data separation.

> [!IMPORTANT]
> **Modular Data Architecture**: Since February 2026, Anagrafica uses a split data model:
> - **Global Data** (`anagrafica` collection): Identity fields shared across all structures.
> - **Structure-Specific Data** (`anagrafica_data` collection): Situation fields owned by each structure.

**Key Files**:
- [src/actions/anagrafica/anagrafica.js](../src/actions/anagrafica/anagrafica.js) - CRUD operations
- [src/actions/anagrafica/history.js](../src/actions/anagrafica/history.js) - Change history
- [src/schemas/anagrafica.js](../src/schemas/anagrafica.js) - Validation schemas
- [src/utils/anagraficaUtils.js](../src/utils/anagraficaUtils.js) - Utilities

**Operations**:
- `createAnagrafica()` - Create new record (splits data automatically)
- `getAnagrafica()` / `getAnagraficaInternal()` - Read with caching (merges global + structure data)
- `updateAnagrafica()` / `updateAnagraficaInternal()` - Update with history tracking (routes changes to correct collection)
- `deleteAnagrafica()` / `deleteAnagraficaInternal()` - Soft delete

**Global Data Groups** (stored in `anagrafica`):
1. **anagrafica** - Personal information (name, DOB, contact, address)

**Structure-Specific Data Groups** (stored in `anagrafica_data`):
1. **nucleoFamiliare** - Family unit information
2. **legaleAbitativa** - Legal and housing status
3. **lavoroFormazione** - Employment and education
4. **vulnerabilita** - Vulnerabilities and prospects
5. **referral** - Referral source

### 2. Accessi Module

**Purpose**: Track service access records and interventions

**Key Files**:
- [src/actions/anagrafica/access.js](../src/actions/anagrafica/access.js) - CRUD operations
- [src/components/Anagrafica/AccessDialog/AccessTypes.js](../src/components/Anagrafica/AccessDialog/AccessTypes.js) - Service types

**Operations**:
- `createAccessInternal()` / `createAccessAction()` - Create access record
- `getAccessAction()` - Read access records
- `getAccessFileUrl()` - Get signed URL for file access

**Service Categories**:
1. Legale (Legal) - 20+ subcategories
2. Lavoro (Employment) - 14+ subcategories
3. Abitare (Housing) - 18+ subcategories
4. Educativo/Formativo (Education) - 10+ subcategories
5. Sanitario (Healthcare) - 11+ subcategories
6. Amministrativo/Fiscale (Administrative) - 6+ subcategories
7. Sociale (Social) - 2+ subcategories

### 3. User Management Module

**Purpose**: Manage users and operators

**Key Files**:
- [src/actions/admin/users.js](../src/actions/admin/users.js) - User CRUD operations
- [src/utils/server-auth.js](../src/utils/server-auth.js) - Authentication utilities

**User Types**:
- **Operators**: Primary users in the `operators` collection
- **Users**: Legacy/fallback users in the `users` collection
- **Super Admins**: Users with `role: 'admin'` have global access

### 4. Project Management Module

**Purpose**: Manage projects that contain multiple structures (organizational hierarchy)

**Key Files**:
- [src/actions/admin/project.js](../src/actions/admin/project.js) - Project operations
- [src/schemas/project.js](../src/schemas/project.js) - Validation schemas

**Operations**:
- `createProject()` - Create new project (Super Admin only)
- `getProject()` / `updateProject()` - Read/update project
- `listProjects()` - List projects based on user access
- `getUsersByProject()` - Get project members
- `addUserToProject()` / `removeUserFromProject()` - Manage project membership
- `toggleProjectAdminStatus()` - Promote/demote project admins
- `getStructuresByProject()` - List structures in a project
- `createStructureInProject()` - Create structure within a project
- `addProjectUserToStructure()` - Add project member to structure

**Hierarchy**:
```
Project
├── Project Admin (can manage project users and structures)
└── Structure
    ├── Structure Admin (can add project users to structure)
    └── Anagrafica/Categories
```

### 5. Structure Management Module

**Purpose**: Manage organizational structures within projects (multi-tenant)

**Key Files**:
- [src/actions/admin/structure.js](../src/actions/admin/structure.js) - Structure operations

**Features**:
- Project-based organization (`projectId` field)
- User-structure associations
- Structure-based data access control
- Custom access categories per structure

### 5. File Management Module

**Purpose**: Manage file uploads, storage, and access independently or linked to records

**Key Files**:
- [src/actions/files/files.js](../src/actions/files/files.js) - File operations

**Operations**:
- `uploadFiles()` - Upload one or more files
- `getFiles()` - List files for an anagrafica
- `getFileUrl()` - Get signed URL for download
- `deleteFile()` - Soft delete a file
- `updateFileMetadata()` - Update file metadata
- `getFileStats()` - Get file statistics

**File Categories**:
- DOCUMENT - General documents
- IDENTITY - ID cards, passports
- LEGAL - Legal documents
- MEDICAL - Medical records
- EMPLOYMENT - Work-related documents
- EDUCATION - Educational certificates
- HOUSING - Housing documents
- FINANCIAL - Financial documents
- OTHER - Uncategorized

**Features**:
- Independent file uploads (not tied to accessi)
- Optional linking to accessi records
- Comprehensive metadata tracking
- File expiration dates
- Custom tags and categorization
- Access tracking (last accessed, access count)
- Soft delete support
- File statistics by category

### 6. Audit Logging Module

**Purpose**: Track all data operations for compliance and security

**Key Files**:
- [src/utils/audit.js](../src/utils/audit.js) - Audit logging utilities

**Functions**:
- `logAdminAction()` - General admin operations
- `logDataCreate()` - Record creation
- `logDataAccess()` - Data reads
- `logDataUpdate()` - Record updates
- `logDataDelete()` - Record deletions
- `logFileAccess()` - File access
- `logPermissionChange()` - Permission modifications
- `logResourceModification()` - Resource changes

### 7. History Tracking Module

**Purpose**: Maintain detailed change history for anagrafica

**Key Files**:
- [src/actions/anagrafica/history.js](../src/actions/anagrafica/history.js) - History operations

**Features**:
- Before/after snapshots for each field group
- Tracks which groups changed
- Stores user and structure context
- Paginated history retrieval

---

## Data Model

### Firestore Collections

#### 1. `anagrafica` (Global Identity)

> [!NOTE]
> This collection now stores **only global identity data**. Situation-specific fields are stored in `anagrafica_data`.

```javascript
{
  id: string,                        // Document ID

  // Personal Information (Global)
  anagrafica: {
    nome: string,
    cognome: string,
    sesso: enum,
    dataDiNascita: date,
    luogoDiNascita: string,
    cittadinanza: string[],
    comuneDiDomicilio: string,
    telefono: string,
    email: string
  },
  codiceFiscale: string,             // Codice Fiscale

  // Access Control
  canBeAccessedBy: string[],         // Structure IDs with access
  registeredByStructure: string,     // Creating structure

  // Metadata
  registeredBy: string,              // Creating user UID
  createdAt: date,
  updatedAt: date,
  updatedBy: string,
  updatedByMail: string,
  updatedByStructure: string,

  // Soft Delete
  deleted: boolean,
  deletedAt: date,
  deletedBy: string
}
```

**Subcollection**: `anagrafica/{id}/history` - Tracks changes to global identity fields.
```javascript
{
  changedAt: date,
  changedBy: string,
  changedByMail: string,
  changedByStructure: string,
  changeType: enum,                  // "create" | "update" | "delete"
  changedGroups: string[],
  changes: { [groupName]: { before: object, after: object } }
}
```

#### 1b. `anagrafica_data` (Structure-Specific Situation)

> [!IMPORTANT]
> **New Collection (Feb 2026)**: Stores structure-specific situation data. Each structure that interacts with a person may have its own document here.

```javascript
{
  id: string,                        // Document ID
  anagraficaId: string,              // Reference to parent anagrafica
  structureId: string,               // Owning structure

  // Family Unit
  nucleoFamiliare: {
    nucleo: enum,
    nucleoTipo: string,
    figli: number
  },

  // Legal & Housing
  legaleAbitativa: {
    situazioneLegale: enum,
    situazioneAbitativa: enum[]
  },

  // Employment & Education
  lavoroFormazione: {
    situazioneLavorativa: enum,
    titoloDiStudioOrigine: enum,
    titoloDiStudioItalia: enum,
    conoscenzaItaliano: enum
  },

  // Vulnerability
  vulnerabilita: {
    vulnerabilita: enum[],
    intenzioneItalia: string,
    paeseDestinazione: string
  },

  // Referral
  referral: {
    referral: string
  },

  // Metadata
  createdAt: date,
  updatedAt: date,
  migratedAt: date                   // If created by migration script
}
```

**Subcollection**: `anagrafica_data/{id}/history` - Tracks changes to this structure's data.
```

#### 2. `accessi`

```javascript
{
  id: string,                        // Document ID
  anagraficaId: string,              // Reference to anagrafica

  services: [{
    tipoAccesso: string,             // Service type
    sottoCategorie: string,          // Sub-category
    altro: string,                   // Custom field if "altro" selected
    note: string,                    // Service notes (HTML/rich text)
    classificazione: string,         // Classification
    enteRiferimento: string,         // Referring entity

    files: [{
      nome: string,                  // Display name
      nomeOriginale: string,         // Original filename
      tipo: string,                  // MIME type
      dimensione: number,            // Size in bytes
      path: string,                  // Storage path
      dataCreazione: ISO date,
      dataScadenza: ISO date         // Expiration date
    }],

    reminderDate: date,              // Optional reminder
    reminderId: string               // Link to reminder doc
  }],

  // Access Control
  structureIds: string[],            // Structures with access

  // Metadata
  createdByStructure: string,        // Creating structure
  createdBy: string,                 // Creating user UID
  createdAt: ISO date
}
```

#### 3. `files`

```javascript
{
  id: string,                        // Document ID

  // File Information
  nome: string,                      // Display name
  nomeOriginale: string,             // Original filename
  tipo: string,                      // MIME type
  dimensione: number,                // Size in bytes
  path: string,                      // Storage path in Firebase Storage

  // Links
  anagraficaId: string,              // Required: Linked anagrafica
  accessoId: string,                 // Optional: Linked accesso
  category: string,                  // File category (see FILE_CATEGORIES)
  tags: string[],                    // Custom tags

  // Dates
  dataCreazione: date,               // Upload date
  dataScadenza: date,                // Optional: Expiration date

  // Access Control
  structureIds: string[],            // Structures that can access
  uploadedByStructure: string,       // Structure that uploaded

  // Metadata
  uploadedBy: string,                // User UID who uploaded
  uploadedByEmail: string,           // User email
  createdAt: date,
  updatedAt: date,

  // Soft Delete
  deleted: boolean,
  deletedAt: date,
  deletedBy: string,

  // Access Tracking
  lastAccessedAt: date,              // Last download time
  accessCount: number                // Number of times accessed
}
```

#### 4. `audit_logs`

```javascript
{
  action: string,                    // Action type (e.g., "anagrafica_create")
  actorUid: string,                  // User performing action
  targetUid: string,                 // Target user (if applicable)
  resourceId: string,                // Affected resource ID
  resourceType: string,              // Resource type ("anagrafica", "accessi", etc.)

  details: {                         // Action-specific details
    structureId: string,
    changedFields: string[],
    accessType: string,              // "create" | "read" | "update" | "delete"
    // ... additional context
  },

  success: boolean,                  // Operation success status
  timestamp: date,
  environment: string                // NODE_ENV value
}
```

#### 5. `projects`

```javascript
{
  id: string,                        // Document ID
  name: string,                      // Project name
  description: string,               // Project description
  admins: string[],                  // UIDs of project administrators
  createdAt: date,
  createdBy: string,                 // Creating user UID
  updatedAt: date,
  updatedBy: string
}
```

#### 6. `operators`

```javascript
{
  uid: string,                       // User UID (from Firebase Auth)
  email: string,
  displayName: string,
  role: string,                      // "admin" | "project_admin" | "structure_admin" | "user"
  projectIds: string[],              // Associated project IDs
  structureIds: string[],            // Associated structure IDs
  createdAt: date,
  updatedAt: date,
  active: boolean
}
```

#### 7. `users`

```javascript
{
  uid: string,                       // User UID (from Firebase Auth)
  email: string,
  displayName: string,
  // Legacy user fields...
}
```

#### 8. `structures`

```javascript
{
  id: string,                        // Document ID
  name: string,
  description: string,
  projectId: string,                 // Parent project ID
  admins: string[],                  // UIDs of structure administrators
  accessCategories: Array,           // Custom access categories
  active: boolean,
  createdAt: date,
  createdBy: string,
  updatedAt: date,
  updatedBy: string
}
```

### Storage Structure

**Firebase Cloud Storage Paths**:
```
files/
  {anagraficaId}/
    accessi/
      {accessId}/
        {index}_{UUID}.{ext}
```

**Path Security**:
- UUID-based filenames prevent guessing
- Alphanumeric validation on anagraficaId
- Path normalization prevents traversal attacks
- Signed URLs with 1-hour expiry

---

## Authentication & Authorization

### Authentication Flow

1. **Session Cookie**: Set via Firebase Authentication
2. **Middleware**: [src/middleware.js](../src/middleware.js)
   - Validates session cookie
   - Calls `/api/auth/verify` endpoint
   - Sets headers:
     - `x-user-uid`: User UID
     - `x-user-email`: User email
     - `x-user-role`: User role (optional)
     - `x-user-structures`: Structure IDs (optional)
3. **Session Caching**: Reduces verification calls

### Authorization Patterns

#### 1. User Extraction
```javascript
const { userUid, headers } = await requireUser();
```

#### 2. Permission Verification
```javascript
await verifyUserPermissions({
  userUid,
  structureId,          // Optional: specific structure check
  allowedStructures     // Optional: allowed structure list
});
```

**Returns**:
```javascript
{
  operatorData,         // User document
  userStructures,       // User's structure IDs
  isSuperAdmin         // Boolean flag
}
```

#### 3. Project Admin Check
```javascript
await verifyProjectAdmin({ userUid, projectId });
```

#### 4. Project Membership Check
```javascript
await verifyProjectMembership({ userUid, projectId });
```

#### 5. Structure Admin Check
```javascript
await verifyStructureAdmin({ userUid, structureId });
```

#### 6. Super Admin Check
```javascript
await verifySuperAdmin({ userUid });
```

### Permission Levels

1. **Super Admin** (`role: 'admin'`)
   - Bypass all project and structure checks
   - Access to all data
   - Can create projects
   - Full admin operations

2. **Project Admin** (`role: 'project_admin'` or in project's `admins` array)
   - Manage users within assigned projects
   - Create structures within their projects
   - Add project users to any structure in their project
   - Full access to project data

3. **Structure Admin** (in structure's `admins` array)
   - Manage users within assigned structures
   - Can only add users who are already project members
   - Manage categories for their structure
   - Full access to structure data

4. **Operator** (`role: 'user'`)
   - Access to assigned structures
   - Create/read/update permissions for anagrafica
   - Limited delete permissions

5. **Viewer**
   - Read-only access
   - No modifications allowed

### Security Rules

- **Permission checks are NEVER cached** - Always run fresh
- **Data caching is separate** - Fast reads, secure access
- **Dual collection pattern** - Checks `operators` first, then `users`
- **Structure-based isolation** - Data only visible to authorized structures

---

## Audit Logging System

### Overview

The audit logging system provides comprehensive tracking of all data operations for compliance, security, and accountability.

### Implementation

**Location**: [src/utils/audit.js](../src/utils/audit.js)

### Core Functions

#### 1. `logAdminAction(params)`
General-purpose admin action logging.

**Parameters**:
```javascript
{
  action: string,          // Required: Action type
  actorUid: string,        // Required: User performing action
  targetUid?: string,      // Optional: Target user
  resourceId?: string,     // Optional: Resource ID
  resourceType?: string,   // Optional: Resource type
  details?: object,        // Optional: Additional context
  success?: boolean        // Optional: Success flag
}
```

#### 2. `logDataCreate(params)`
Logs creation of new records.

**Usage**:
```javascript
await logDataCreate({
  actorUid: userUid,
  resourceType: 'anagrafica',
  resourceId: anagraficaId,
  structureId: structureId,
  details: { /* ... */ }
});
```

#### 3. `logDataAccess(params)`
Logs read operations on sensitive data.

**Usage**:
```javascript
await logDataAccess({
  actorUid: userUid,
  resourceType: 'anagrafica',
  resourceId: anagraficaId,
  details: { /* ... */ }
});
```

#### 4. `logDataUpdate(params)`
Logs update operations with changed fields tracking.

**Usage**:
```javascript
await logDataUpdate({
  actorUid: userUid,
  resourceType: 'anagrafica',
  resourceId: anagraficaId,
  structureId: structureId,
  changedFields: ['anagrafica', 'lavoroFormazione'],
  details: { /* ... */ }
});
```

#### 5. `logDataDelete(params)`
Logs deletion operations.

**Usage**:
```javascript
await logDataDelete({
  actorUid: userUid,
  resourceType: 'anagrafica',
  resourceId: anagraficaId,
  softDelete: true
});
```

#### 6. `logFileAccess(params)`
Logs file access events.

**Usage**:
```javascript
await logFileAccess({
  actorUid: userUid,
  resourceId: anagraficaId,
  filePath: 'files/...'
});
```

### Logged Operations

#### Anagrafica Operations
- ✅ `anagrafica_create` - Record creation
- ✅ `anagrafica_read` - Record access
- ✅ `anagrafica_update` - Record updates
- ✅ `anagrafica_delete` - Soft deletes

#### Accessi Operations
- ✅ `accessi_create` - Access record creation
- ✅ `accessi_read` - Access record retrieval
- ✅ `file_access` - File downloads

#### Admin Operations
- ✅ `create_user` - User creation
- ✅ `update_user` - User updates
- ✅ `permission_add` - Permission grants
- ✅ `permission_remove` - Permission revocations

### Audit Log Storage

**Collection**: `audit_logs` in Firestore

**Retention**: Logs are retained indefinitely (consider implementing archival strategy)

**Query Patterns**:
- By user: `actorUid == uid`
- By resource: `resourceId == id && resourceType == type`
- By action: `action == actionType`
- By date range: `timestamp >= start && timestamp <= end`

### Error Handling

Audit logging uses graceful failure:
- Errors are logged to console
- Operations continue even if logging fails
- Prevents audit failures from blocking user operations

---

## Caching Strategy

### Overview

**Location**: [src/lib/cache.js](../src/lib/cache.js)

The application uses Next.js `unstable_cache` with tag-based invalidation for optimal performance while maintaining data consistency.

### Cache Tags

```javascript
CACHE_TAGS = {
  anagrafica: (id) => `anagrafica-${id}`,
  anagraficaList: (structureId) => `anagrafica-list-${structureId}`,
  accessi: (anagraficaId) => `accessi-${anagraficaId}`,
  user: (uid) => `user-${uid}`,
  structure: (id) => `structure-${id}`,
  // ... additional tags
}
```

### Revalidation Times

```javascript
REVALIDATE = {
  anagraficaDetail: 300,      // 5 minutes
  anagraficaList: 60,         // 1 minute
  userProfile: 300,           // 5 minutes
  structure: 600,             // 10 minutes
}
```

### Invalidation Patterns

#### 1. Single Record Invalidation
```javascript
revalidateTag(CACHE_TAGS.anagrafica(id));
```

#### 2. Multi-Structure Invalidation
```javascript
invalidateAnagraficaCaches(anagraficaId, allowedStructures);
// Invalidates:
// - anagrafica-{id}
// - anagrafica-list-{structureId} for each structure
```

#### 3. Access Records Invalidation
```javascript
invalidateAccessiCache(anagraficaId);
// Invalidates: accessi-{anagraficaId}
```

### Cache Patterns

#### Read with Cache
```javascript
const getCachedData = unstable_cache(
  async () => fetchFromDb(id),
  [`resource`, id],
  {
    tags: [CACHE_TAGS.resource(id)],
    revalidate: REVALIDATE.resource,
  }
);

const data = await getCachedData();
```

#### Write with Invalidation
```javascript
// Perform write
await db.collection('resource').doc(id).update(data);

// Invalidate cache
revalidateTag(CACHE_TAGS.resource(id));
```

### Important Rules

1. **Permission checks are NEVER cached** - Always run fresh for security
2. **Data caching is separate from permission checks**
3. **Invalidate immediately after mutations**
4. **Invalidate for ALL affected structures**
5. **Use specific tags for targeted invalidation**

---

## File Management

**New Architecture**: Files are stored in a separate `files` collection with comprehensive metadata tracking. Files can be uploaded independently or linked to accessi records.

**Location**: [src/actions/files/files.js](../src/actions/files/files.js)

### Upload Process

#### 1. Validation
- **Size limit**: 10MB default (configurable)
- **MIME type check**: Validates against allowed types list
- **File validation**: Checks file name, size, and type
- **Path validation**: Alphanumeric checks, no traversal

**Allowed File Types**:
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, Word (.doc, .docx), Excel (.xls, .xlsx)
- Text: Plain text, CSV

#### 2. Storage Path Generation
```
files/{anagraficaId}/{category}/{timestamp}_{UUID}.{ext}
```

**Security Features**:
- UUID prevents filename guessing
- Timestamp for uniqueness
- Category-based organization
- Normalized paths prevent traversal
- Structure-based access control

#### 3. File Upload
```javascript
await bucket.file(filePath).save(fileBuffer, {
  metadata: {
    contentType: file.type,
    uploadedAt: new Date().toISOString()
  }
});
```

#### 4. Metadata Storage
File metadata is stored in the `files` collection with:
- File information (name, size, type, path)
- Links (anagraficaId, optional accessoId)
- Categorization (category, tags)
- Access control (structureIds, uploadedByStructure)
- Tracking (lastAccessedAt, accessCount)
- Expiration dates (optional)

### Download Process

#### 1. Permission Check
- Fetch file document from `files` collection
- Verify user has access to linked anagraficaId
- Check structure membership

#### 2. Signed URL Generation
```javascript
const [url] = await bucket.file(filePath).getSignedUrl({
  action: 'read',
  expires: Date.now() + 3600000, // 1 hour
});
```

#### 3. Access Tracking
Update file document with:
- `lastAccessedAt`: Current timestamp
- `accessCount`: Increment by 1

#### 4. Audit Logging
```javascript
await logFileAccess({
  actorUid: userUid,
  resourceId: anagraficaId,
  filePath: filePath,
  details: {
    fileId,
    fileName,
    category
  }
});
```

### File Operations

#### Upload Files
```javascript
const result = await uploadFiles({
  anagraficaId: 'anagrafica-123',
  files: [{ name, type, size, buffer }],
  accessoId: 'accesso-456',  // Optional
  category: FILE_CATEGORIES.LEGAL,
  tags: ['passport', 'identity'],
  expirationDate: '2025-12-31',
  structureId: 'structure-789'
});
```

#### List Files
```javascript
const result = await getFiles(anagraficaId, accessoId); // accessoId optional
```

#### Get File URL
```javascript
const result = await getFileUrl(fileId);
// Returns signed URL valid for 1 hour
```

#### Delete File (Soft Delete)
```javascript
const result = await deleteFile(fileId);
```

#### Update Metadata
```javascript
const result = await updateFileMetadata(fileId, {
  nome: 'New Display Name',
  tags: ['updated', 'tags'],
  category: FILE_CATEGORIES.MEDICAL,
  dataScadenza: '2026-12-31'
});
```

#### Get Statistics
```javascript
const result = await getFileStats(anagraficaId);
// Returns: totalFiles, totalSize, byCategory, withExpiration, expired
```

### File Categories

```javascript
FILE_CATEGORIES = {
  DOCUMENT: 'document',
  IDENTITY: 'identity',
  LEGAL: 'legal',
  MEDICAL: 'medical',
  EMPLOYMENT: 'employment',
  EDUCATION: 'education',
  HOUSING: 'housing',
  FINANCIAL: 'financial',
  OTHER: 'other'
}
```

### Benefits of New Architecture

1. **Independence**: Files can exist without being tied to accessi
2. **Better Tracking**: Comprehensive metadata and access tracking
3. **Categorization**: Organized by category with custom tags
4. **Expiration**: Support for document expiration dates
5. **Statistics**: Easy to generate file statistics and reports
6. **Queryability**: Can query all files by category, tag, or date
7. **Access Control**: Structure-based permissions with audit trail
8. **Soft Delete**: Files can be recovered if deleted by mistake

---

## Key Design Patterns

### 1. Internal/External API Pattern

Many operations have two versions:
- **External** (Server Action): Entry point, authentication, JSON response
- **Internal**: Core logic, can be called from multiple contexts

**Example**:
```javascript
// External (Server Action)
export async function updateAnagrafica(id, body, structureId) {
  const { userUid, headers } = await requireUser();
  const userMail = headers.get('x-user-mail');
  const result = await updateAnagraficaInternal(id, body, userUid, userMail, structureId);
  return JSON.stringify(result);
}

// Internal (Core Logic)
export async function updateAnagraficaInternal(id, body, userUid, userMail, structureId) {
  // ... implementation
}
```

### 2. Transaction Pattern

Critical operations use Firestore transactions:

```javascript
const result = await adminDb.runTransaction(async (transaction) => {
  // 1. Read
  const snap = await transaction.get(ref);

  // 2. Validate
  if (!snap.exists) throw new Error('Not found');

  // 3. Check permissions
  await verifyUserPermissions({ /* ... */ });

  // 4. Write
  transaction.update(ref, updateData);

  // 5. Return context for post-transaction operations
  return { /* ... */ };
});

// Post-transaction operations (history, audit, cache)
await createHistoryEntry(/* ... */);
await logDataUpdate(/* ... */);
invalidateCache(/* ... */);
```

### 3. Soft Delete Pattern

Records are never actually deleted:

```javascript
// Soft delete
transaction.update(ref, {
  deleted: true,
  deletedAt: new Date(),
  deletedBy: userUid
});

// Query filtering
where('deletedAt', '==', null)
// or check in code:
if (data.deletedAt) {
  throw new Error('Not found');
}
```

### 4. Error Handling Pattern

Consistent error handling across the application:

```javascript
try {
  // Operation
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  console.error('[SCOPE_ERROR]:', error.stack);

  if (error.code === 'NOT_FOUND') {
    return { error: true, message: 'Record not found' };
  }

  if (error.code === 'PERMISSION_DENIED') {
    return { error: true, message: 'Access denied' };
  }

  return { error: true, message: error.message };
}
```

### 5. Dual Collection User Pattern

User lookup checks two collections:

```javascript
async function getUserDocument(uid) {
  // Check operators first (primary)
  let userDoc = await db.collection('operators').doc(uid).get();

  if (userDoc.exists) {
    return { collection: 'operators', data: userDoc.data() };
  }

  // Fallback to users collection
  userDoc = await db.collection('users').doc(uid).get();

  if (userDoc.exists) {
    return { collection: 'users', data: userDoc.data() };
  }

  throw new Error('User not found');
}
```

### 6. History Tracking Pattern

Track field group changes:

```javascript
// 1. Compute changes
const { changedGroups, changes } = computeGroupChanges(oldData, newData);

// 2. Create history entry
if (changedGroups.length > 0) {
  await createHistoryEntry({
    anagraficaId,
    changeType: 'update',
    changedGroups,
    changes: {
      anagrafica: { before: {...}, after: {...} },
      lavoroFormazione: { before: {...}, after: {...} }
    },
    userUid,
    userMail,
    structureId
  });
}
```

---

## Security Considerations

### 1. Authentication
- ✅ Firebase Authentication for user management
- ✅ Secure session cookies
- ✅ Server-side verification on every request
- ✅ Session caching with timeout

### 2. Authorization
- ✅ Fresh permission checks (never cached)
- ✅ Structure-based access control
- ✅ Role-based permissions (super admin, admin, operator, viewer)
- ✅ Resource-level access checks

### 3. Input Validation
- ✅ Zod schemas for all inputs
- ✅ Whitelist-based validation (rejects unknown fields)
- ✅ Type checking and constraints
- ✅ HTML sanitization for rich text fields

### 4. File Security
- ✅ MIME type validation
- ✅ Magic number verification (prevents spoofing)
- ✅ File size limits
- ✅ Path traversal prevention
- ✅ UUID-based filenames
- ✅ Signed URLs with expiration
- ✅ Audit logging for file access

### 5. SQL Injection Prevention
- ✅ NoSQL database (Firestore) - no SQL injection risk
- ✅ Parameterized queries
- ✅ No string concatenation for queries

### 6. XSS Prevention
- ✅ React auto-escaping
- ✅ HTML sanitization for rich text
- ✅ Content Security Policy headers
- ✅ DOMPurify for user-generated HTML

### 7. CSRF Protection
- ✅ Same-origin policy
- ✅ Server Actions with built-in CSRF protection
- ✅ Secure session cookies

### 8. Data Privacy
- ✅ Comprehensive audit logging
- ✅ Soft delete (data retention)
- ✅ Structure-based isolation
- ✅ Minimal data exposure in APIs

### 9. Error Handling
- ✅ Generic error messages to users
- ✅ Detailed logs server-side
- ✅ No stack traces in production
- ✅ Graceful degradation

### 10. Rate Limiting
- ⚠️ **TODO**: Implement rate limiting for API routes
- ⚠️ **TODO**: Add request throttling

---

## File Structure

```
gpc/
├── src/
│   ├── actions/                    # Server Actions (data layer)
│   │   ├── admin/
│   │   │   ├── project.js         # Project management
│   │   │   ├── structure.js       # Structure management
│   │   │   └── users.js           # User management
│   │   └── anagrafica/
│   │       ├── access.js          # Accessi CRUD
│   │       ├── anagrafica.js      # Anagrafica CRUD
│   │       └── history.js         # History tracking
│   │
│   ├── app/                        # Next.js App Router
│   │   ├── (portal)/              # Main portal layout
│   │   │   └── [structureId]/    # Structure-scoped routes
│   │   │       ├── anagrafica/   # Anagrafica pages
│   │   │       └── ...
│   │   ├── api/                   # API routes
│   │   │   └── auth/             # Authentication endpoints
│   │   └── layout.js             # Root layout
│   │
│   ├── components/                 # React components
│   │   ├── Anagrafica/
│   │   │   ├── Form/             # Form sections
│   │   │   ├── AccessDialog/     # Access dialogs
│   │   │   └── ...
│   │   ├── ui/                   # shadcn/ui components
│   │   └── ...
│   │
│   ├── lib/                        # Libraries and utilities
│   │   ├── cache.js              # Cache management
│   │   ├── firebase/             # Firebase config
│   │   └── ...
│   │
│   ├── schemas/                    # Validation schemas
│   │   └── anagrafica.js         # Anagrafica validation
│   │
│   ├── utils/                      # Utility functions
│   │   ├── audit.js              # Audit logging
│   │   ├── logger.js             # Operational logging
│   │   ├── server-auth.js        # Authentication utilities
│   │   ├── database.js           # Database utilities
│   │   └── anagraficaUtils.js    # Anagrafica utilities
│   │
│   └── middleware.js               # Next.js middleware
│
├── public/                         # Static assets
├── docs/                          # Documentation
│   └── ARCHITECTURE.md           # This file
├── package.json
└── next.config.js
```

### Key Files Reference

| Purpose | File Path | Description |
|---------|-----------|-------------|
| **Authentication** | `src/middleware.js` | Session validation, header injection |
| **Authorization** | `src/utils/server-auth.js` | Permission checking utilities |
| **Audit Logging** | `src/utils/audit.js` | Comprehensive audit trail |
| **Operational Logging** | `src/utils/logger.js` | Debug/info/warn/error logging |
| **Cache Management** | `src/lib/cache.js` | Tag-based cache invalidation |
| **Database Access** | `src/utils/database.js` | Collection accessors, utilities |
| **Anagrafica CRUD** | `src/actions/anagrafica/anagrafica.js` | Personal records operations |
| **Anagrafica History** | `src/actions/anagrafica/history.js` | Change history tracking |
| **Accessi CRUD** | `src/actions/anagrafica/access.js` | Service access operations |
| **File Management** | `src/actions/files/files.js` | File upload, download, management |
| **Validation** | `src/schemas/anagrafica.js` | Zod validation schemas |
| **User Management** | `src/actions/admin/users.js` | User CRUD operations |
| **Project Management** | `src/actions/admin/project.js` | Project operations |
| **Structure Management** | `src/actions/admin/structure.js` | Structure operations |
| **Project Schema** | `src/schemas/project.js` | Project validation |

---

## Development Guidelines

### Adding New Features

1. **Create server actions** in `/src/actions/`
2. **Add validation schemas** in `/src/schemas/`
3. **Implement permission checks** using `verifyUserPermissions()`
4. **Add audit logging** using appropriate `log*()` functions
5. **Implement caching** with tag-based invalidation
6. **Add UI components** in `/src/components/`
7. **Create routes** in `/src/app/`
8. **Update documentation** in `/docs/`

### Code Standards

- Use server-side validation for all inputs
- Always check permissions before data access
- Log all data mutations for audit trail
- Use transactions for critical operations
- Implement soft delete for all records
- Follow the internal/external API pattern
- Add comprehensive error handling
- Use TypeScript-style JSDoc comments
- Follow existing naming conventions

### Testing Checklist

- [ ] Authentication works correctly
- [ ] Permission checks prevent unauthorized access
- [ ] Audit logs are created for all operations
- [ ] Cache invalidation works properly
- [ ] Soft delete doesn't expose deleted records
- [ ] File uploads validate correctly
- [ ] Signed URLs expire as expected
- [ ] History tracking captures all changes
- [ ] Error messages don't leak sensitive info
- [ ] Transactions handle race conditions

---

## Future Improvements

### High Priority
- [ ] Implement rate limiting for API routes
- [ ] Add request throttling
- [ ] Implement audit log archival strategy
- [ ] Add comprehensive error monitoring (e.g., Sentry)
- [x] Implement backup and disaster recovery procedures

### Medium Priority
- [ ] Add real-time updates using Firestore listeners
- [ ] Implement bulk operations for anagrafica
- [ ] Add advanced search and filtering
- [ ] Create admin dashboard for audit log analysis
- [x] Implement data export functionality (CSV, PDF)

### Low Priority
- [ ] Add multi-language support
- [ ] Implement email notifications
- [x] Add calendar integration for reminders
- [ ] Create mobile app
- [ ] Add GraphQL API layer

---

## Maintenance

### Monitoring

**Key Metrics to Track**:
- Authentication failures
- Permission denied errors
- Audit log failures
- Cache hit/miss ratios
- API response times
- File upload success rates
- Database transaction conflicts

### Regular Tasks

**Daily**:
- Review error logs
- Monitor authentication issues
- Check audit log integrity

**Weekly**:
- Review cache performance
- Analyze slow queries
- Check storage usage

**Monthly**:
- Review access patterns
- Audit permission assignments
- Clean up test data
- Update dependencies

**Quarterly**:
- Security audit
- Performance optimization
- Documentation updates
- User feedback review

---

## Support & Contact

For questions or issues:
1. Check this documentation first
2. Review relevant source code files
3. Check audit logs for operation history
4. Contact the development team

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2026-02-06 | Added Project hierarchy (Projects > Structures), new roles (project_admin), project management module |
| 1.0 | 2026-02-05 | Initial comprehensive architecture documentation |

---

**End of Document**
