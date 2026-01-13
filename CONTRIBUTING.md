# Contributing to Bagel 🥯

Thanks for your interest in contributing to Bagel! This is a hackathon project, but we welcome improvements and suggestions.

## Brand Voice Guidelines

Remember: **We are the Gusto of Web3.** Keep it warm, friendly, and slightly silly.

### ✅ Good Examples
- "Start baking" instead of "Initialize transaction"
- "Rising dough" instead of "Yield APY"
- "Get your dough" instead of "Withdraw funds"

### ❌ Avoid
- Crypto jargon without explanation
- Cold, technical language in user-facing text
- Cyberpunk aesthetics

## Code Style

### Rust/Anchor
- Use friendly function names: `bake_payroll`, `get_dough`, `check_recipe`
- Comment complex privacy operations
- Follow Anchor best practices

### TypeScript/React
- Use functional components with hooks
- Maintain warm color palette (#FF8C42, #FFF8E7)
- Keep components simple and testable

### Friendly Variable Names
```rust
// Good
let dough_vault = ...;
let rising_amount = ...;
let bagel_jar = ...;

// Avoid
let vault_0x123 = ...;
let encrypted_state_buffer = ...;
```

## Development Workflow

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/your-feature`
3. **Make changes** (follow style guide above)
4. **Test**: `anchor test`
5. **Commit**: Use clear commit messages
6. **Push**: `git push origin feature/your-feature`
7. **Open PR**: Describe your changes

## Testing

All privacy features must be tested:
- Salary encryption works
- Private transfers execute correctly
- Yield calculations are accurate
- No sensitive data leaks on-chain

```bash
anchor test
```

## Documentation

Update relevant docs when making changes:
- **README.md** - User-facing features
- **BAGEL_SPEC.md** - Technical architecture
- **Code comments** - Complex logic

## Questions?

Open an issue or reach out to the team!

---

**Remember: Simple payroll, private paydays, and a little extra cream cheese.** 🥯
