# Login / Auth architecture

| Mode | Purpose | Storage | Accounts |
|------|---------|---------|----------|
| **Password login** | Default multi-account wallet | One password for all; accounts in IndexedDB with private keys **encrypted** with password. Password can be saved (optional). Decrypt key only when needed (reveal, signing tx). | Multiple |
| **Private key login** | One-account wallet | Session only; no "save as permanent account" (cannot link with password-protected accounts). | One |
| **Quick login** | One-time login for testing | Session only; newly generated account. | One |

**Accounts** = multiwallet. Stored in IndexedDB, encrypted with password. Add account via "Add account" (create new or import by private key) after password login.
