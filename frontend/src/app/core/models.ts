export type Role = 'admin' | 'employee';
export type Metal = 'gold' | 'silver';
export type FundStatus = 'pending' | 'approved' | 'rejected';
export type TxnStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  role: Role;
  phone: string;
}

export interface Company {
  name: string;
  addressLines: string[];
  gstn: string;
  phone: string;
  legalName: string;
  terms: string[];
}

export interface Rates {
  gold: number;
  silver: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface IdProof { type: string; number: string; }

export interface Customer {
  name: string;
  dob?: string;
  phone: string;
  address1: string;
  address2?: string;
  pincode: string;
  landmark?: string;
}

export interface Reference {
  number?: string;
  relationship?: string;
  phone?: string;
  address?: string;
}

export interface RegisteredCustomer {
  id: string;
  name: string;
  dob?: string;
  phone: string;
  address1: string;
  address2?: string;
  pincode: string;
  landmark?: string;
  idProofs: IdProof[];
  reference: Reference;
  selfie: string | null;
  createdAt: string;
}

export interface TxnItem {
  article: string;
  gross: number;
  stone: number;
  other: number;
  net: number;
  purity: number;
  rate: number;
  amount: number;
}

export interface Totals {
  grossAmount: number;
  margin: number;
  netAmount: number;
  billingCharges: number;
  amountPayable: number;
  netWeight: number;
}

export interface Txn {
  id: string;
  billNo: string;
  date: string;
  metal: Metal;
  employeeId: string;
  employeeName: string;
  customer: Customer;
  idProofs: IdProof[];
  reference: Reference;
  selfie: string | null;
  clientOtpVerified: boolean;
  article: string;
  items: TxnItem[];
  totals: Totals;
  status: TxnStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface BillingConfig {
  defaultMargin: number;
  defaultBillingCharges: number;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'IMPS' | 'NEFT' | 'RTGS' | 'Cheque';

export interface FundRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  note: string;
  status: FundStatus;
  method?: string | null;
  reference?: string | null;
  requestedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
}

export interface AppState {
  me: User;
  users: User[];
  company: Company;
  rates: Rates;
  transactions: Txn[];
  funds: FundRequest[];
  balances: Record<string, number>;
  customers: RegisteredCustomer[];
  billingConfig: BillingConfig;
  deletedTransactions: Txn[];
}
