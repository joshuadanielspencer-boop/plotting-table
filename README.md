# plotting-table

A static, single-page tactical game. The page is encrypted at rest with
AES-256-GCM; the key is derived in the browser with PBKDF2-SHA256
(310,000 iterations) from a passphrase that is never transmitted or
stored server-side.

Personal project. Opening it requires the passphrase.
