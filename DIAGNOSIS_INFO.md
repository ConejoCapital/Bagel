# Diagnosis Information for Arcium Macro Issues

## Top-Level Cargo.toml

**Status:** No top-level `Cargo.toml` exists. Only `programs/bagel/Cargo.toml` exists.

**Current Structure:**
- Root: No Cargo.toml
- `programs/bagel/Cargo.toml`: Program-specific dependencies

## programs/bagel/Cargo.toml

```toml
[package]
name = "bagel"
version = "0.1.0"
description = "Simple payroll, private paydays, and a little extra cream cheese"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "bagel"

[features]
default = []
cpi = ["no-entrypoint"]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
# Arcium requires idl-build feature for macro-generated client helpers
idl-build = ["anchor-lang/idl-build", "arcium-anchor/idl-build"]

[dependencies]
# Anchor 0.32.1 (required for Arcium and MagicBlock compatibility)
anchor-lang = "0.32.1"
anchor-spl = "0.32.1"
# Pin to Edition 2021 compatible versions (Solana 2.3.13 toolchain)
blake3 = "=1.8.2"
constant_time_eq = "=0.3.1"
# Kamino Lend V2 SDK
kamino-lend = { version = "0.4.1", features = ["cpi"] }
# MagicBlock Ephemeral Rollups SDK
ephemeral-rollups-sdk = { version = "0.7.2", features = ["anchor"] }
# Arcium Anchor SDK for MPC computations (v0.6.x aligned with Anchor 0.32.1)
arcium-anchor = { version = "0.6.1", features = ["idl-build"] }
# Arcium client for accessing types directly
arcium-client = { version = "0.6.1" }

[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1

[profile.release.build-override]
opt-level = 3
incremental = false
codegen-units = 1
```

**Note:** No `[workspace]` or `[patch.crates-io]` sections exist.

## Exact Error Output from `cargo check`

```
error: custom attribute panicked
  --> src/lib.rs:41:1
   |
41 | #[queue_computation_accounts("queue_get_dough_mpc", payer)]
   | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: message: Confidential instruction was not found at path: build/queue_get_dough_mpc.arcis

error: struct `FinalizeGetDoughFromMpcCallback` must be named `QueueGetDoughMpcCallback` for encrypted instruction 'queue_get_dough_mpc'
   --> src/lib.rs:132:12
    |
132 | pub struct FinalizeGetDoughFromMpcCallback<'info> {
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0432]: unresolved import `crate`
   --> src/lib.rs:191:1
   |
191 | #[arcium_program]
   | ^^^^^^^^^^^^^^^^^ could not find `__client_accounts_queue_get_dough_mpc` in the crate root
```

## Key Findings

1. **Missing Circuit File:** `build/queue_get_dough_mpc.arcis` not found
   - The macro expects a compiled circuit at this path
   - Circuit source exists at: `encrypted-ixs/circuits/payroll.arcis`

2. **Wrong Callback Struct Name:** 
   - Current: `FinalizeGetDoughFromMpcCallback`
   - Required: `QueueGetDoughMpcCallback` (must match pattern `{InstructionName}Callback`)

3. **Missing __client_accounts_* Symbol:**
   - Macro expansion failing because of errors 1 & 2 above

## Arcium.toml Configuration

```toml
[workspace]
members = ["programs/bagel"]

[mxe]
name = "bagel-payroll"
version = "1.0.0"
cluster_offset = 1078779259

[circuits]
[[circuits.definitions]]
name = "payroll"
path = "encrypted-ixs/circuits/payroll.arcis"
description = "Privacy-preserving payroll calculation: salary_per_second * elapsed_seconds"

[build]
target = "sbpf-solana-solana"
anchor_version = "0.32.1"
```

## anchor build Output

```
error: failed to download `const-oid v0.10.2`

Caused by:
  unable to get packages from source

Caused by:
  failed to parse manifest at `/Users/thebunnymac/.cargo/registry/src/index.crates.io-6f17d22bba15001f/const-oid-0.10.2/Cargo.toml`

Caused by:
  feature `edition2024` is required

  The package requires the Cargo feature called `edition2024`, but that feature is not stabilized in this version of Cargo (1.84.0 (12fe57a9d 2025-04-07)).
```

**This is a toolchain/Cargo version issue, not related to the macro errors.**
