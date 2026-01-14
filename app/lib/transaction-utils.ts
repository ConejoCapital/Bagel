/**
 * 🛡️ Transaction Verification Utilities
 * 
 * Properly checks if transactions actually succeeded, not just if they were included.
 */

import { Connection, TransactionSignature, ParsedTransactionWithMeta } from '@solana/web3.js';

/**
 * Verify that a transaction actually succeeded (not just included in a block)
 * 
 * @param connection - Solana connection
 * @param signature - Transaction signature
 * @returns Transaction status and parsed transaction
 * @throws Error if transaction failed
 */
export async function verifyTransactionSuccess(
  connection: Connection,
  signature: TransactionSignature
): Promise<{ success: boolean; transaction: ParsedTransactionWithMeta | null; error?: string }> {
  // Wait a bit for transaction to be fully processed
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Fetch the transaction
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    return {
      success: false,
      transaction: null,
      error: 'Transaction not found',
    };
  }

  // Check if transaction succeeded
  if (tx.meta?.err) {
    // Transaction failed - extract error details
    const error = tx.meta.err;
    let errorMessage = 'Transaction failed';
    
    if (typeof error === 'object') {
      // Parse program error
      if ('InstructionError' in error) {
        const [instructionIndex, instructionError] = error.InstructionError as [number, any];
        errorMessage = `Instruction #${instructionIndex} failed`;
        
        if (typeof instructionError === 'object') {
          if ('Custom' in instructionError) {
            const customError = instructionError.Custom;
            errorMessage += `: Custom error ${customError}`;
          } else if ('ProgramError' in instructionError) {
            errorMessage += `: ${instructionError.ProgramError}`;
          }
        }
      } else if ('Err' in error) {
        errorMessage = `Transaction error: ${JSON.stringify(error.Err)}`;
      }
    } else {
      errorMessage = `Transaction error: ${error}`;
    }

    // Extract logs for debugging
    const logs = tx.meta.logMessages || [];
    const errorLogs = logs.filter(log => 
      log.includes('Error') || 
      log.includes('failed') || 
      log.includes('AnchorError')
    );

    return {
      success: false,
      transaction: tx,
      error: `${errorMessage}. ${errorLogs.length > 0 ? 'Logs: ' + errorLogs.join('; ') : ''}`,
    };
  }

  // Transaction succeeded
  return {
    success: true,
    transaction: tx,
  };
}

/**
 * Confirm transaction and verify it actually succeeded
 * 
 * @param connection - Solana connection
 * @param signature - Transaction signature
 * @param blockhash - Recent blockhash
 * @param lastValidBlockHeight - Last valid block height
 * @throws Error if transaction failed
 */
export async function confirmAndVerifyTransaction(
  connection: Connection,
  signature: TransactionSignature,
  blockhash: string,
  lastValidBlockHeight: number
): Promise<void> {
  // First, confirm the transaction was included
  await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature,
  }, 'confirmed');

  // Then verify it actually succeeded
  const result = await verifyTransactionSuccess(connection, signature);
  
  if (!result.success) {
    throw new Error(result.error || 'Transaction failed');
  }
}
