# Consumed task ledger

Append-only. One row per completed task. Do not edit or delete rows.

A blocked task has no row until it later completes. An ID with a row must not be promoted or executed again. Different work needs a new ID.

| ID | Result | Commit | Notes |
| --- | --- | --- | --- |
| QUEUE-CONTROL-001 | completed | `052a275d0bd04f3b58d09f81c06ee46f50f42b1f` | Pre-approved queue. Authorized by `5e184549b3ea8413bcd856b4c433f9419d82a8b0` before this ledger existed. Not a product task. |
| QUEUE-TRIGGER-TEST-001 | completed | `d50d130397ee22fae6c8fcc1cc6e1b8fbdf6b04b` | Control-plane trigger verification. No production change. Authorized by `f791ef4b46cae02f220310d5df3493131997fc8b`. `DB-POSTGRES-001` was not promoted. |
| DB-POSTGRES-001 | completed | `ea2f350b9ae00bb5e5ef041fc2a523ffc52c0087` | Prisma PostgreSQL foundation. Authorized by `f9774f4cb443f15a652e64ca00d271af908dc2c0`. PR https://github.com/Arildb88/Motorcycle_clothing/pull/30. `api-ci` passed. Hosted Supabase apply was not run. |
