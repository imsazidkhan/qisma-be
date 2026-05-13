import type { ExpenseSplitType } from '../constants/expense-split.constants';
import { EXPENSE_SPLIT_TYPE } from '../constants/expense-split.constants';

export { EXPENSE_SPLIT_TYPE };
export type { ExpenseSplitType };

/** Single line in an itemized split (sub-expense shared by a subset). */
export type ItemizedLineInput = {
  label: string;
  /** Monetary amount for this line. */
  amount: string;
  /**
   * Split equally among these users.
   * When **splitAmongEveryone** is true, **participantUserIds** is ignored.
   */
  participantUserIds?: readonly string[] | undefined;
  splitAmongEveryone?: boolean | undefined;
};

/** Base fields for every split computation. */
type SplitBase = {
  totalAmount: string;
  currency: string;
  scale?: number | undefined;
};

export type EqualSplitInput = SplitBase & {
  splitType: typeof EXPENSE_SPLIT_TYPE.EQUAL;
  participantUserIds: readonly string[];
};

export type ExactSplitInput = SplitBase & {
  splitType: typeof EXPENSE_SPLIT_TYPE.EXACT;
  amountsByUserId: Readonly<Record<string, string>>;
};

export type PercentageSplitInput = SplitBase & {
  splitType: typeof EXPENSE_SPLIT_TYPE.PERCENTAGE;
  percentageByUserId: Readonly<Record<string, string>>;
};

export type SharesSplitInput = SplitBase & {
  splitType: typeof EXPENSE_SPLIT_TYPE.SHARES;
  sharesByUserId: Readonly<Record<string, string>>;
};

export type AdjustmentSplitInput = SplitBase & {
  splitType: typeof EXPENSE_SPLIT_TYPE.ADJUSTMENT;
  fixedAmountsByUserId: Readonly<Record<string, string>>;
  remainderUserIds: readonly string[];
};

export type ItemizedSplitInput = SplitBase & {
  splitType: typeof EXPENSE_SPLIT_TYPE.ITEMIZED;
  allParticipantUserIds: readonly string[]; // for “everyone” lines
  lines: readonly ItemizedLineInput[];
};

export type ExpenseSplitComputationInput =
  | EqualSplitInput
  | ExactSplitInput
  | PercentageSplitInput
  | SharesSplitInput
  | AdjustmentSplitInput
  | ItemizedSplitInput;

export type ParticipantOwedShare = {
  userId: string;
  owedAmount: string;
  percentage?: string | undefined;
  shares?: string | undefined;
};

export type SplitComputationResult = {
  splitType: ExpenseSplitType;
  participantShares: readonly ParticipantOwedShare[];
  sumOwed: string;
  currency: string;
  scale: number;
};

export type GroupBalanceEdge = {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
};

export type ExpenseBalanceEntry = {
  paidByUserId: string;
  totalAmount: string;
  owedByUserId: Readonly<Record<string, string>>;
};

export type SimplifiedTransfer = {
  fromUserId: string;
  toUserId: string;
  amount: string;
};
