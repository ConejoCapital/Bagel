/**
 * 🥯 useBagel Hook
 * 
 * React hook for Bagel operations using BagelClient API
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BagelClient, createBagelClient } from '../lib/api';

export interface PayrollData {
  employer: PublicKey;
  employee: PublicKey;
  encryptedSalary: Uint8Array;
  lastWithdraw: number;
  totalAccrued: number;
  doughVault: PublicKey;
  isActive: boolean;
}

export interface UseBagelReturn {
  // Client instance
  bagel: BagelClient | null;
  
  // State
  payrollData: PayrollData | null;
  balance: number; // Accrued balance in lamports
  loading: boolean;
  error: string | null;
  
  // Actions
  createPayroll: (employeeAddress: string, salaryPerSecond: number) => Promise<string>;
  fundPayroll: (employeeAddress: string, amountSOL: number) => Promise<string>;
  withdraw: (employerAddress: string) => Promise<string>;
  fetchPayroll: (employeeAddress: string, employerAddress: string) => Promise<void>;
  
  // Helpers
  balanceInSOL: number;
  refreshPayroll: () => Promise<void>;
}

export function useBagel(employeeAddress?: string, employerAddress?: string): UseBagelReturn {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  // Create BagelClient instance
  const bagel = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }
    return createBagelClient(connection, wallet);
  }, [connection, wallet]);

  // State
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch payroll data
  const fetchPayroll = useCallback(async (
    empAddress: string,
    empAddress2: string
  ) => {
    if (!bagel) {
      setError('Wallet not connected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await bagel.getPayroll(empAddress, empAddress2);
      
      if (data) {
        setPayrollData({
          employer: new PublicKey(data.employer),
          employee: new PublicKey(data.employee),
          encryptedSalary: data.encryptedSalary,
          lastWithdraw: data.lastWithdraw,
          totalAccrued: data.totalAccrued,
          doughVault: new PublicKey(data.doughVault),
          isActive: data.isActive,
        });
      } else {
        setPayrollData(null);
      }
    } catch (err: any) {
      console.error('Error fetching payroll:', err);
      setError(err.message || 'Failed to fetch payroll');
      setPayrollData(null);
    } finally {
      setLoading(false);
    }
  }, [bagel]);

  // Auto-fetch if addresses provided
  useEffect(() => {
    if (employeeAddress && employerAddress && bagel) {
      fetchPayroll(employeeAddress, employerAddress);
    }
  }, [employeeAddress, employerAddress, bagel, fetchPayroll]);

  // Real-time balance calculation
  useEffect(() => {
    if (!payrollData || !bagel) return;

    // For now, we'll use a mock salary per second
    // In production, this would be decrypted from Arcium
    const MOCK_SALARY_PER_SECOND = 27_777; // From verification test

    const interval = setInterval(() => {
      const accrued = bagel.calculateAccrued(
        payrollData.lastWithdraw,
        MOCK_SALARY_PER_SECOND
      );
      setBalance(accrued);
    }, 1000);

    return () => clearInterval(interval);
  }, [payrollData, bagel]);

  // Create payroll
  const createPayroll = useCallback(async (
    empAddress: string,
    salaryPerSecond: number
  ): Promise<string> => {
    if (!bagel) {
      throw new Error('Wallet not connected');
    }

    try {
      setError(null);
      const signature = await bagel.initEmployer(empAddress, salaryPerSecond);
      
      // Refresh payroll data after creation
      if (wallet.publicKey) {
        await fetchPayroll(empAddress, wallet.publicKey.toBase58());
      }
      
      return signature;
    } catch (err: any) {
      setError(err.message || 'Failed to create payroll');
      throw err;
    }
  }, [bagel, wallet.publicKey, fetchPayroll]);

  // Fund payroll (deposit dough)
  const fundPayroll = useCallback(async (
    empAddress: string,
    amountSOL: number
  ): Promise<string> => {
    if (!bagel) {
      throw new Error('Wallet not connected');
    }

    try {
      setError(null);
      const signature = await bagel.depositDough(empAddress, amountSOL);
      
      // Refresh payroll data after deposit
      if (empAddress && wallet.publicKey) {
        await fetchPayroll(empAddress, wallet.publicKey.toBase58());
      }
      
      return signature;
    } catch (err: any) {
      setError(err.message || 'Failed to fund payroll');
      throw err;
    }
  }, [bagel, wallet.publicKey, fetchPayroll]);

  // Withdraw salary
  const withdraw = useCallback(async (
    empAddress: string
  ): Promise<string> => {
    if (!bagel) {
      throw new Error('Wallet not connected');
    }

    try {
      setError(null);
      const signature = await bagel.withdrawSalary(empAddress);
      
      // Refresh payroll data after withdrawal
      if (wallet.publicKey && empAddress) {
        await fetchPayroll(wallet.publicKey.toBase58(), empAddress);
      }
      
      return signature;
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw');
      throw err;
    }
  }, [bagel, wallet.publicKey, fetchPayroll]);

  // Refresh payroll data
  const refreshPayroll = useCallback(async () => {
    if (employeeAddress && employerAddress) {
      await fetchPayroll(employeeAddress, employerAddress);
    }
  }, [employeeAddress, employerAddress, fetchPayroll]);

  // Calculate balance in SOL
  const balanceInSOL = useMemo(() => {
    if (!bagel) return 0;
    return bagel.lamportsToSOL(balance);
  }, [bagel, balance]);

  return {
    bagel,
    payrollData,
    balance,
    loading,
    error,
    createPayroll,
    fundPayroll,
    withdraw,
    fetchPayroll,
    balanceInSOL,
    refreshPayroll,
  };
}
