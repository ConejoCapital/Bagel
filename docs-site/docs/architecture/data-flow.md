---
sidebar_position: 4
---

# Data Flow

Complete data flow diagrams for all operations.

## Business Onboarding

```mermaid
flowchart TD
    subgraph Client
        A[Connect Wallet] --> B[Enter Business Info]
        B --> C[Sign Transaction]
    end

    subgraph Encryption
        C --> D[Hash Employer Pubkey]
        D --> E[Encrypt Hash via Inco SDK]
        E --> F[Generate Ciphertext]
    end

    subgraph OnChain
        F --> G[register_business]
        G --> H[Get next_business_index]
        H --> I[Create BusinessEntry PDA]
        I --> J[Store encrypted_employer_id]
        J --> K[Initialize encrypted_balance = E(0)]
        K --> L[Increment vault.encrypted_business_count]
    end

    subgraph Result
        L --> M[BusinessRegistered Event]
        M --> N[Update UI]
    end
```

## Deposit Flow

```mermaid
flowchart TD
    subgraph Client
        A[Enter Amount] --> B[Encrypt via Inco SDK]
        B --> C[Submit Transaction]
    end

    subgraph Validation
        C --> D{Confidential tokens enabled?}
        D -->|No| E[Reject: InvalidState]
        D -->|Yes| F[Continue]
    end

    subgraph Transfer
        F --> G[CPI to Inco Tokens]
        G --> H[Transfer encrypted amount]
        H --> I[Update source balance]
        I --> J[Update destination balance]
    end

    subgraph Balance Update
        J --> K[new_euint128(encrypted_amount)]
        K --> L[e_add(business.balance, amount)]
        L --> M[Store new encrypted balance]
    end

    subgraph Result
        M --> N[FundsDeposited Event]
        N --> O[Transaction Confirmed]
    end
```

## Employee Addition

```mermaid
flowchart TD
    subgraph Client
        A[Enter Employee Details] --> B[Hash Employee Pubkey]
        B --> C[Encrypt ID via Inco]
        C --> D[Encrypt Salary via Inco]
        D --> E[Submit Transaction]
    end

    subgraph OnChain
        E --> F[add_employee]
        F --> G[Get next_employee_index]
        G --> H[Create EmployeeEntry PDA]
    end

    subgraph Storage
        H --> I[new_euint128(encrypted_employee_id)]
        I --> J[new_euint128(encrypted_salary)]
        J --> K[encrypted_accrued = E(0)]
    end

    subgraph Counts
        K --> L[business.encrypted_employee_count += E(1)]
        L --> M[vault.encrypted_employee_count += E(1)]
    end

    subgraph Result
        M --> N[EmployeeAdded Event]
    end
```

## Withdrawal Flow

```mermaid
flowchart TD
    subgraph PreCheck
        A[Employee Requests Withdrawal] --> B{Is Active?}
        B -->|No| C[Reject: PayrollInactive]
        B -->|Yes| D{Elapsed >= 60s?}
        D -->|No| E[Reject: WithdrawTooSoon]
        D -->|Yes| F[Continue]
    end

    subgraph Client
        F --> G[Encrypt Amount via Inco]
        G --> H[Submit Transaction]
    end

    subgraph Transfer
        H --> I[CPI to Inco Tokens]
        I --> J[transfer(vault → employee, encrypted)]
        J --> K[Encrypted transfer complete]
    end

    subgraph BalanceUpdate
        K --> L[new_euint128(encrypted_amount)]
        L --> M[e_sub(accrued, amount)]
        M --> N[Update last_action timestamp]
    end

    subgraph Result
        N --> O[WithdrawalProcessed Event]
        O --> P[Funds in Employee Wallet]
    end
```

## TEE Streaming Flow

```mermaid
flowchart TD
    subgraph Delegation
        A[Employer Initiates Streaming] --> B[delegate_to_tee]
        B --> C[Employee Entry delegated to TEE]
    end

    subgraph TEE["TEE Execution (MagicBlock)"]
        C --> D[TEE Takes Control]
        D --> E{Every ~10ms}
        E --> F[Calculate elapsed time]
        F --> G["accrued = e_add(accrued, salary × elapsed)"]
        G --> E
    end

    subgraph Commit
        H[Employee Ready to Withdraw] --> I[commit_from_tee]
        I --> J[TEE commits state to L1]
        J --> K[Employee entry undelegated]
    end

    subgraph Withdrawal
        K --> L[request_withdrawal]
        L --> M[Standard withdrawal flow]
    end
```

## Token Account Setup

```mermaid
flowchart TD
    subgraph Initialization
        A[User Connects] --> B[Derive UserTokenAccount PDA]
        B --> C[initialize_user_token_account]
        C --> D[Create PDA with owner/mint]
    end

    subgraph IncoSetup
        D --> E[Inco Token account created externally]
        E --> F[set_inco_token_account]
        F --> G[Link Inco account to PDA]
    end

    subgraph Usage
        G --> H[User can deposit/withdraw]
        H --> I[PDA used for lookups]
    end
```

## Complete Payroll Cycle

```mermaid
sequenceDiagram
    participant E as Employer
    participant EE as Employee
    participant B as Bagel
    participant I as Inco
    participant T as TEE

    Note over E,T: Setup Phase
    E->>B: register_business()
    B->>I: Encrypt employer ID
    E->>B: add_employee()
    B->>I: Encrypt employee ID + salary

    Note over E,T: Funding Phase
    E->>I: encrypt(deposit_amount)
    E->>B: deposit()
    B->>I: Confidential transfer

    Note over E,T: Streaming Phase (Optional)
    E->>B: delegate_to_tee()
    B->>T: Delegate employee entry

    loop Every 10ms
        T->>T: Update encrypted_accrued
    end

    Note over E,T: Withdrawal Phase
    EE->>B: commit_from_tee() (if streaming)
    T->>B: Commit state

    EE->>I: encrypt(withdrawal_amount)
    EE->>B: request_withdrawal()
    B->>I: Confidential transfer
    I->>EE: Funds received
```

## Data Visibility Matrix

| Data Point | Employer | Employee | Observer |
|------------|----------|----------|----------|
| Business exists | Yes | No | Yes (opaque) |
| Employee exists | Yes | Yes | Yes (opaque) |
| Salary amount | Yes (encrypted) | Yes (decrypt) | No |
| Accrued balance | No | Yes (decrypt) | No |
| Transfer amount | Yes (owns) | Yes (decrypt) | No |
| Transaction timing | Yes | Yes | Yes |
| Employer identity | Yes | No | No |
| Employee identity | Yes | Yes | No |
