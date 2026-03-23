# Feature roadmap – step-by-step

> **Note:** This file is a **historical step list**; many items are already implemented in the app. For an up-to-date picture, see **`docs/PROJECT_STATUS.md`** and the codebase.

Work on one feature at a time; tick steps as they’re done. Start with the feature you care about most (suggested first: **Accounts**).

---

## Login / Auth architecture

See [docs/LOGIN_ARCHITECTURE.md](LOGIN_ARCHITECTURE.md). Password = multiwallet; Private key + Quick login = one-account (session only).

---

## 1. Accounts feature

**Goal:** Multi-account wallet (IndexedDB). Private keys encrypted with password. Add/switch/delete, naming, persistence. See architecture above.

| Step | Task | Status |
|------|------|--------|
| 1.1 | **Encryption** – Store private keys encrypted with password in IndexedDB; decrypt only when needed (reveal, signing) | ⬜ |
| 1.2 | **Add account** – Add account flow (after password login): create new or import by private key; encrypt and save to DB | ⬜ |
| 1.3 | **Switch account** – Switch active account updates auth store and UI everywhere (header, dashboard, send/receive) | ⬜ |
| 1.4 | **Rename account** – Inline or modal edit for account name; persist and show in sidebar/header | ⬜ |
| 1.5 | **Delete account** – Confirm modal; remove from store + DB; if active, switch to another or redirect to login | ⬜ |
| 1.6 | **Password save** – Optional remember password / save password for session (user choice) | ⬜ |

---

## 2. Layout components *(skipped)*

**Decision:** AppLayout is kept as the single wrapper for all authenticated pages; no extraction into separate layout components. Layout is maintained in one place (`AppLayout.vue`).

---

## 3. Dashboard

**Goal:** One place to see balance, account, and recent activity; minimal and reliable.

| Step | Task | Status |
|------|------|--------|
| 3.1 | **Balance** – Load balance from API for active account; show loading/error; refresh on account switch | ⬜ |
| 3.2 | **Transaction count** – Load total or recent count from API; show in stat card | ⬜ |
| 3.3 | **Copy address** – “Copy address” works and shows brief feedback (toast or inline) | ⬜ |
| 3.4 | **Recent transactions** – Small list (e.g. last 5) with link to full Transaction History | ⬜ |
| 3.5 | **Empty / loading states** – Clear messages when no account, no balance, or API error | ⬜ |

---

## 4. Send

**Goal:** Send PHP: form, validation, submit, and clear feedback.

| Step | Task | Status |
|------|------|--------|
| 4.1 | **Form** – To address, amount, optional memo; basic HTML validation (required, number) | ⬜ |
| 4.2 | **Balance check** – Show available balance; prevent sending more than balance (and respect fee if shown) | ⬜ |
| 4.3 | **Validation** – Address format (PHP Coin), amount &gt; 0, max amount; show inline errors | ⬜ |
| 4.4 | **Submit** – Call send API (or signing flow); loading state; success toast + redirect or reset | ⬜ |
| 4.5 | **Error handling** – Network/API errors shown clearly; retry or back to form | ⬜ |

---

## 5. Receive

**Goal:** Show receiving address and QR; easy copy.

| Step | Task | Status |
|------|------|--------|
| 5.1 | **Address + QR** – Show active account address and QR; regenerate when account switches | ⬜ |
| 5.2 | **Copy address** – Button copies to clipboard with feedback | ⬜ |
| 5.3 | **Optional** – Short “What to do next” (e.g. “Share this address to receive PHP”) | ⬜ |

---

## 6. Transactions

**Goal:** List transactions for active account with basic pagination and clarity.

| Step | Task | Status |
|------|------|--------|
| 6.1 | **List** – Load transactions from API for active account; show in table or cards | ⬜ |
| 6.2 | **Sent vs received** – Clearly show direction (sent/received), amount, other address, date | ⬜ |
| 6.3 | **Pagination or “load more”** – Don’t load everything at once; page or limit + “Load more” | ⬜ |
| 6.4 | **Empty / loading / error** – States when no txs, loading, or API error | ⬜ |
| 6.5 | **Optional** – Click row for more details (block, tx id, etc.) | ⬜ |

---

## 7. Settings

**Goal:** Key app and account preferences in one place.

| Step | Task | Status |
|------|------|--------|
| 7.1 | **Node / API URL** – Setting for PHP Coin node URL; persist (e.g. localStorage); use in api.js | ⬜ |
| 7.2 | **Theme** – Light/dark toggle if not already in layout; persist preference | ⬜ |
| 7.3 | **Optional** – Default account, language, or other toggles | ⬜ |

---

## 8. Login / Auth (improvements)

**Goal:** Password login = multiwallet; Private key + Quick login = one-account (session only). See [docs/LOGIN_ARCHITECTURE.md](LOGIN_ARCHITECTURE.md).

| Step | Task | Status |
|------|------|--------|
| 8.1 | **Password login** – Master key for decrypt; remember password optional; integrate with accounts (encrypt on add) | ⬜ |
| 8.2 | **Validation** – Clear errors for wrong password, invalid private key, empty fields | ⬜ |
| 8.3 | **Optional** – “Forgot password” or account recovery flow (if you support it) | ⬜ |

---

## 9. Migrate from older multiwallet

**Goal:** Allow users to migrate/import accounts from an older PHP Coin multiwallet (legacy backup format, different encryption, or previous wallet version).

| Step | Task | Status |
|------|------|--------|
| 9.1 | **Identify legacy formats** – Document older multiwallet backup/export formats (file structure, encryption) | ⬜ |
| 9.2 | **Migration UI** – Add “Migrate from older wallet” option (e.g. in AccountManager or RestoreAccount) | ⬜ |
| 9.3 | **Format detection** – Detect legacy format from uploaded file; route to appropriate parser | ⬜ |
| 9.4 | **Decrypt & convert** – Decrypt legacy backup with user password; convert to current account structure | ⬜ |
| 9.5 | **Merge or replace** – Option to merge into existing accounts or replace; confirm before applying | ⬜ |

---

## How to use this doc

- Pick one feature (e.g. **1. Accounts**).
- Do steps in order (e.g. 1.1 → 1.2 → …).
- Update the table: replace ⬜ with ✅ when a step is done.
- When a feature is finished, you can add a short “Done” note and date under its section.
- If you want to change or add steps, edit this file and keep the same step-by-step style.

Suggested order to tackle: **1 (Accounts)** → **3 (Dashboard)** → **4 (Send)** → **6 (Transactions)** → **5 (Receive)** → **7 (Settings)** → **8 (Login)**. You can switch order based on priority.
