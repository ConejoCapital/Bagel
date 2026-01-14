# 🥯 Bagel Build Troubleshooting

This document covers common build issues and their solutions for the Bagel Solana program.

## ⚠️ Known Issues & Fixes

### Issue 1: Edition 2024 Conflict

**Error:**
```
error: feature `edition2024` is required
  The package requires the Cargo feature called `edition2024`, but that feature is not stabilized in this version of Cargo (1.84.0).
```

**Root Cause:**  
Solana's bundled `cargo-build-sbf` uses Rust toolchain v1.84.0, which hasn't stabilized Edition 2024. Dependencies like `blake3` v1.8.3+ and `base64ct` v1.8.0+ require Edition 2024.

**Solution:**  
Pin the offending dependencies to their last Edition 2021 compatible versions:

```bash
cd programs/bagel
cargo update -p blake3 --precise 1.8.2
cargo update -p base64ct --precise 1.6.0
cargo update -p constant_time_eq --precise 0.3.1
```

**Prevention:**  
These versions are now pinned in `Cargo.toml`:
```toml
[dependencies]
blake3 = "=1.8.2"
constant_time_eq = "=0.3.1"
```

**DO NOT** delete `Cargo.lock` without re-applying this fix.

---

### Issue 2: Stack Offset Exceeded (SPL Token 2022)

**Error:**
```
Error: Function _ZN14spl_token_20229extension21confidential_transfer...
Stack offset of 4264 exceeded max offset of 4096 by 168 bytes
```

**Root Cause:**  
`anchor-spl` v0.29.0+ pulls in `spl-token-2022` with confidential transfer features that exceed the Solana BPF stack limit (4096 bytes). This is a known issue in the SPL library, not our code.

**Current Solution:**  
We are temporarily building **without SPL token functionality** to stay within stack limits:

```toml
[dependencies]
anchor-lang = "0.29.0"
# anchor-spl = "0.29.0"  # Temporarily disabled due to spl-token-2022 stack issues
```

This allows the core payroll logic to compile and deploy while the SPL team optimizes stack usage.

**Alternative (if tokens are required immediately):**  
Downgrade to an older version that uses the legacy SPL library:
```toml
anchor-spl = "0.28.0"
```

**Tracking:**  
- SPL Token 2022 stack optimization: https://github.com/solana-labs/solana-program-library/issues
- We will re-enable full SPL functionality once the upstream fix is available

---

## 🔧 General Build Commands

### Clean Build
```bash
anchor clean
# or
rm -rf target
```

### Check Toolchain
```bash
cargo-build-sbf --version
# Should show: rustc 1.84.x
```

### Build Program
```bash
anchor build
# or without IDL (faster for debugging)
anchor build --no-idl
```

### Verify Installation
```bash
# Solana CLI
solana --version  # Should be 3.0.13+

# Anchor CLI
anchor --version  # Should be 0.29.0-0.32.1

# Rust
rustc --version  # Should be 1.79+ (Solana's BPF target)
```

---

## 📚 Additional Resources

- **Solana Docs:** https://solana.com/docs
- **Anchor Book:** https://book.anchor-lang.com/
- **Skills Documentation:** `.cursor/skills/`
  - `solana-installation.md` - Setup guide
  - `solana-programs.md` - Program development
  - `solana-best-practices.md` - Best practices & links

---

## 🆘 Still Having Issues?

1. Check that you're using the official Solana installer (NOT Homebrew)
2. Ensure `Cargo.lock` exists and contains pinned versions
3. Try `anchor clean && anchor build`
4. Check the GitHub issues for similar problems
5. Reach out to the team in Discord/Telegram

---

**Last Updated:** January 14, 2026  
**Bagel Version:** 0.1.0  
**Anchor Version:** 0.29.0 / 0.32.1  
**Solana Version:** 3.0.13
