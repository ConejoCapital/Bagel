import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bagel } from "../target/types/bagel";
import { assert } from "chai";

describe("bagel", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Bagel as Program<Bagel>;
  
  // Test accounts
  const employer = provider.wallet.publicKey;
  const employee = anchor.web3.Keypair.generate();

  it("Bakes a payroll (initializes BagelJar)", async () => {
    // Salary: $100k/year = ~$3.17/second = 3_170_000 lamports/second
    const salaryPerSecond = 3_170_000;

    // Derive the BagelJar PDA
    const [bagelJar] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bagel_jar"),
        employer.toBuffer(),
        employee.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Execute transaction
    const tx = await program.methods
      .bakePayroll(new anchor.BN(salaryPerSecond))
      .accounts({
        employer: employer,
        employee: employee.publicKey,
        payrollJar: bagelJar,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("🥯 Payroll baked! Transaction:", tx);

    // Fetch and verify the account
    const payrollAccount = await program.account.payrollJar.fetch(bagelJar);
    
    assert.equal(
      payrollAccount.employer.toString(),
      employer.toString(),
      "Employer mismatch"
    );
    assert.equal(
      payrollAccount.employee.toString(),
      employee.publicKey.toString(),
      "Employee mismatch"
    );
    assert.equal(
      payrollAccount.isActive,
      true,
      "Payroll should be active"
    );

    console.log("✅ Payroll verified on-chain");
  });

  // TODO: Add more tests
  // - Test deposit_dough
  // - Test get_dough (with time manipulation)
  // - Test update_salary
  // - Test close_jar
  // - Test error cases
});
