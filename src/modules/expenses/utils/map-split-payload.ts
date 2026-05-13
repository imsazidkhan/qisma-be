import { EXPENSE_SPLIT_TYPE } from '../../splits/constants/expense-split.constants';
import type { ExpenseSplitComputationInput } from '../../splits/types/split.types';
import {
  ExpenseSplitValidationException,
} from '../../../common/exceptions/api.exception';
import type { ExpenseSplitPayloadDto } from '../dto/create-expense.dto';

const SCALE = 2;

/**
 * Maps API **split** DTO to {@link ExpenseSplitService.compute} input.
 * Throws {@link ExpenseSplitValidationException} on invariant violations.
 */
export function mapSplitPayloadToComputation(
  split: ExpenseSplitPayloadDto,
  totalAmount: string,
  currency: string,
): ExpenseSplitComputationInput {
  const base = { totalAmount, currency, scale: SCALE } as const;

  switch (split.splitType) {
    case EXPENSE_SPLIT_TYPE.EQUAL: {
      const ids = split.participantUserIds;
      if (!ids?.length) {
        throw new ExpenseSplitValidationException(
          'equal split requires participantUserIds',
        );
      }
      return {
        ...base,
        splitType: EXPENSE_SPLIT_TYPE.EQUAL,
        participantUserIds: ids,
      };
    }
    case EXPENSE_SPLIT_TYPE.EXACT: {
      const amounts = split.amountsByUserId;
      if (!amounts || Object.keys(amounts).length === 0) {
        throw new ExpenseSplitValidationException(
          'exact split requires amountsByUserId',
        );
      }
      return {
        ...base,
        splitType: EXPENSE_SPLIT_TYPE.EXACT,
        amountsByUserId: amounts,
      };
    }
    case EXPENSE_SPLIT_TYPE.PERCENTAGE: {
      const pct = split.percentageByUserId;
      if (!pct || Object.keys(pct).length === 0) {
        throw new ExpenseSplitValidationException(
          'percentage split requires percentageByUserId',
        );
      }
      return {
        ...base,
        splitType: EXPENSE_SPLIT_TYPE.PERCENTAGE,
        percentageByUserId: pct,
      };
    }
    case EXPENSE_SPLIT_TYPE.SHARES: {
      const sh = split.sharesByUserId;
      if (!sh || Object.keys(sh).length === 0) {
        throw new ExpenseSplitValidationException(
          'shares split requires sharesByUserId',
        );
      }
      return {
        ...base,
        splitType: EXPENSE_SPLIT_TYPE.SHARES,
        sharesByUserId: sh,
      };
    }
    case EXPENSE_SPLIT_TYPE.ADJUSTMENT: {
      const fixed = split.fixedAmountsByUserId ?? {};
      const rem = split.remainderUserIds;
      if (!rem?.length) {
        throw new ExpenseSplitValidationException(
          'adjustment split requires remainderUserIds',
        );
      }
      return {
        ...base,
        splitType: EXPENSE_SPLIT_TYPE.ADJUSTMENT,
        fixedAmountsByUserId: fixed,
        remainderUserIds: rem,
      };
    }
    case EXPENSE_SPLIT_TYPE.ITEMIZED: {
      const all = split.allParticipantUserIds;
      const lines = split.lines;
      if (!all?.length) {
        throw new ExpenseSplitValidationException(
          'itemized split requires allParticipantUserIds',
        );
      }
      if (!lines?.length) {
        throw new ExpenseSplitValidationException(
          'itemized split requires lines',
        );
      }
      return {
        ...base,
        splitType: EXPENSE_SPLIT_TYPE.ITEMIZED,
        allParticipantUserIds: all,
        lines,
      };
    }
    default:
      throw new ExpenseSplitValidationException(
        `Unknown splitType: ${String(split.splitType)}`,
      );
  }
}
