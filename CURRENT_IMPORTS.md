# Current Arcium Import Layout

## On-Chain Program Imports

### `programs/bagel/src/lib.rs`
```rust
use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use crate::{constants::*, error::*, privacy::*, state::*};
```

### `programs/bagel/src/privacy/arcium.rs`
```rust
use anchor_lang::prelude::*;
```

### `programs/bagel/src/privacy/mpc_output.rs`
```rust
use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
```

## Summary

✅ **No `arcium_client` imports found** in any on-chain program files
- Only `arcium_anchor::prelude::*` is used
- `arcium_client` is only mentioned in comments (lines 234, 282 in `privacy/arcium.rs`)

⚠️ **However:** `arcium-client = "0.6.1"` is listed in `Cargo.toml` as a dependency

## Current Dependencies (from Cargo.toml)

```toml
arcium-anchor = { version = "0.6.1", features = ["idl-build"] }
arcium-client = { version = "0.6.1" }  # <-- This is present but not imported
```

## Question

Should `arcium-client` be removed from `Cargo.toml` since it's not used in the on-chain program? Or is it needed for some other reason (like build-time code generation)?
