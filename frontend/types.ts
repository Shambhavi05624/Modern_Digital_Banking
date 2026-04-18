
export enum AccountType {
  SAVINGS = 'savings',
  CHECKING = 'checking',
  CREDIT_CARD = 'credit_card',
  LOAN = 'loan',
  INVESTMENT = 'investment'
}

export enum BillStatus {
  UPCOMING = 'upcoming',
  PAID = 'paid',
  OVERDUE = 'overdue'
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  kyc_status: 'unverified' | 'verified';
}

export interface Account {
  id: number;
  bank_name: string;
  account_type: AccountType;
  masked_account: string;
  currency: string;
  balance: number;
}

export interface Transaction {
  id: number;
  account_id: number;
  description: string;
  category: string;
  amount: number;
  currency: string;
  txn_type: 'debit' | 'credit';
  merchant: string;
  txn_date: string;
}

export interface Budget {
  id: number;
  month: number;
  year: number;
  category: string;
  limit_amount: number;
  spent_amount: number;
}

// Fixed: Added category property to the Bill interface to resolve property access errors
export interface Bill {
  id: number;
  biller_name: string;
  due_date: string;
  amount_due: number;
  status: BillStatus;
  auto_pay: boolean;
  category: string;
}

// Fixed: Added point_value to Reward interface for multi-currency tracking
export interface Reward {
  id: number;
  program_name: string;
  points_balance: number;
  currency?: string;
  point_value?: number;
}

export interface Alert {
  id: number;
  type: 'low_balance' | 'bill_due' | 'budget_exceeded';
  message: string;
  created_at: string;
}
