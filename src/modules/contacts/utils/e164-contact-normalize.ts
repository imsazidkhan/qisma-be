import {
  type CountryCode,
  parsePhoneNumberFromString,
  type PhoneNumber,
} from 'libphonenumber-js';

import { CONTACT_SYNC_CONSTANTS } from '../constants/contact-sync.constants';

/**
 * Derive default **ISO region** from the authenticated user’s stored `identifier`
 * (**digits**, no leading `+`) so national-format contacts can be parsed consistently.
 */
export function inferCountryFromUserIdentifier(
  identifierDigits: string,
): CountryCode | undefined {
  const digits = identifierDigits.replace(/\D/g, '');
  if (
    digits.length < CONTACT_SYNC_CONSTANTS.MIN_DIGITS ||
    digits.length > CONTACT_SYNC_CONSTANTS.MAX_DIGITS
  ) {
    return undefined;
  }

  const pn = parsePhoneNumberFromString(`+${digits}`);
  return pn?.isValid() === true ? pn.country : undefined;
}

/**
 * Parse one raw address-book string into **E.164 subscriber digits**
 * (**no** leading `+`, matches `User.identifier` storage).
 */
export function normalizeRawContactToE164Digits(
  raw: string,
  defaultCountry: CountryCode,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let pn: PhoneNumber | undefined = parsePhoneNumberFromString(trimmed);
  if (pn?.isValid() !== true) {
    pn = parsePhoneNumberFromString(trimmed, defaultCountry);
  }
  if (pn?.isValid() !== true) {
    const stripped = trimmed.replace(/\D/g, '');
    pn = parsePhoneNumberFromString(`+${stripped}`);
  }

  if (pn?.isValid() !== true) {
    return null;
  }

  const formatted = pn.format('E.164');
  const withoutPlus = formatted.replace(/^\+/, '');
  if (
    withoutPlus.length < CONTACT_SYNC_CONSTANTS.MIN_DIGITS ||
    withoutPlus.length > CONTACT_SYNC_CONSTANTS.MAX_DIGITS
  ) {
    return null;
  }
  return withoutPlus;
}
