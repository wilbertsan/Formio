# Amplify Gen2 Backend com Cognito — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize Amplify Gen2 backend with Cognito email-based authentication.

**Architecture:** Manual file creation (no `npm create amplify` interactive). Backend defined via `amplify/backend.ts` and `amplify/auth/resource.ts`. TypeScript config for amplify in separate tsconfig.

**Tech Stack:** @aws-amplify/backend, @aws-amplify/backend-cli, TypeScript

---

### Task 1: Install backend dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install devDependencies**

```bash
npm install @aws-amplify/backend @aws-amplify/backend-cli --save-dev
```

**Step 2: Verify package.json updated**

Run: `cat package.json | grep -E "backend|backend-cli"`
Expected: both appear in devDependencies

---

### Task 2: Create amplify/tsconfig.json

**Files:**
- Create: `amplify/tsconfig.json`

**Step 1: Create file**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["**/*.ts"]
}
```

---

### Task 3: Create amplify/auth/resource.ts

**Files:**
- Create: `amplify/auth/resource.ts`

**Step 1: Create file**

```ts
import { defineAuth } from '@aws-amplify/backend'

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
})
```

---

### Task 4: Create amplify/backend.ts

**Files:**
- Create: `amplify/backend.ts`

**Step 1: Create file**

```ts
import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'

defineBackend({
  auth,
})
```

---

### Task 5: Add typecheck:amplify script to package.json

**Files:**
- Modify: `package.json:13`

**Step 1: Add script**

```json
"typecheck:amplify": "tsc -p amplify/tsconfig.json --noEmit"
```

---

### Task 6: Verify typecheck

**Step 1: Run amplify typecheck**

```bash
npm run typecheck:amplify
```

Expected: exits 0, no errors

---

### Task 7: Verify nothing broke

**Step 1: Run full verification**

```bash
npm run test && npm run lint && npm run typecheck && npm run build
```

Expected: all pass

---

### Task 8: Commit

```bash
git add amplify package.json package-lock.json
git commit -m "chore: inicializa backend Amplify Gen2 com autenticação"
```
