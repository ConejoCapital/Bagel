# Contributing to Bagel

Thank you for your interest in contributing to Bagel! This document provides guidelines and instructions for contributing.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)

## Code of Conduct

Be respectful, collaborative, and constructive. We're building privacy tools that matter!

## Getting Started

### Prerequisites
- Rust 1.92+
- Solana CLI 2.0+
- Anchor CLI 0.31.1
- Node.js 18+

### Setup
```bash
# Clone the repository
git clone https://github.com/ConejoCapital/Bagel.git
cd Bagel

# Build the Solana program
anchor build

# Run tests
anchor test

# Set up the frontend
cd app
npm install
npm run dev
```

## Development Workflow

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** if you've added functionality
4. **Update documentation** if needed
5. **Submit a pull request**

## Pull Request Process

1. Update the README.md with details of major changes
2. Add entries to CHANGELOG.md for user-facing changes
3. Ensure all tests pass and linting is clean
4. Request review from maintainers

## Coding Standards

### Rust (Solana Programs)
- Follow standard Rust formatting (`cargo fmt`)
- Use checked arithmetic for all financial calculations
- Add comprehensive doc comments
- Include unit tests for all logic

Example:
```rust
/// Calculate accrued salary using encrypted computation
/// 
/// # Arguments
/// * `encrypted_salary` - Encrypted salary per second
/// * `elapsed_seconds` - Time elapsed since last withdrawal
///
/// # Returns
/// * `Result<EncryptedU64>` - Encrypted accrued amount
pub fn calculate_accrued(
    encrypted_salary: &EncryptedU64,
    elapsed_seconds: u64,
) -> Result<EncryptedU64> {
    // Implementation
}
```

### TypeScript (Frontend)
- Use TypeScript for all new code
- Follow Airbnb style guide
- Add JSDoc comments for exported functions
- Use functional components with hooks

Example:
```typescript
/**
 * Connect to the Bagel program and fetch payroll data
 * @param connection - Solana RPC connection
 * @param wallet - Connected wallet
 * @returns PayrollJar account data
 */
export async function fetchPayrollJar(
  connection: Connection,
  wallet: PublicKey,
): Promise<PayrollJar> {
  // Implementation
}
```

## Testing Guidelines

### Unit Tests (Rust)
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_calculate_accrued() {
        let salary = EncryptedU64::new(1_000_000);
        let result = calculate_accrued(&salary, 3600).unwrap();
        assert_eq!(result.decrypt().unwrap(), 3_600_000_000);
    }
}
```

### Integration Tests (TypeScript)
```typescript
describe('Bagel Program', () => {
  it('should create a payroll jar', async () => {
    // Test implementation
  });
});
```

## Privacy Integration Guidelines

When working with privacy features:

1. **Never log decrypted values** in production
2. **Use mock implementations** for local testing
3. **Document privacy guarantees** clearly
4. **Follow SDK best practices** for each integration

### Inco Lightning Integration
- Use FHE encryption for all sensitive data
- Never decrypt salary amounts unless absolutely necessary
- Document encrypted fields clearly

### ShadowWire Integration
- Generate Bulletproofs client-side
- Never expose plaintext transfer amounts
- Test with devnet tokens

### MagicBlock Integration
- Use PERs for high-frequency updates
- Commit to L1 only when necessary
- Handle rollback scenarios

## Documentation

- Update README.md for user-facing changes
- Update DEVELOPMENT.md for developer-facing changes
- Add inline comments for complex logic
- Keep DEMO_SCRIPT.md up to date with new features

## Questions?

Open an issue or reach out to the maintainers. We're here to help!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
