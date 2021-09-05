export const normalizeTelephoneInput = (
  value: string,
  previousValue: string,
): string => {
  // return nothing if no value
  if (!value) return value;

  // only allows 0-9 inputs
  const currentValue = value.replace(/[^\d]/g, '');
  const cvLength = currentValue.length;

  if (!previousValue || value.length > previousValue.length) {
    // returns: "x", "xx", "xxx"
    if (cvLength < 3) return currentValue;

    // returns: "(xxx)", "(xxx) x", "(xxx) xx", "(xxx) xxx",
    if (cvLength < 7)
      return `(${currentValue.slice(0, 2)}) ${currentValue.slice(2)}`;

    // returns: "(xxx) xxx-", (xxx) xxx-x", "(xxx) xxx-xx", "(xxx) xxx-xxx", "(xxx) xxx-xxxx"
    return `(${currentValue.slice(0, 2)}) ${currentValue.slice(
      2,
      7,
    )}-${currentValue.slice(7, 11)}`;
  }

  return '';
};
