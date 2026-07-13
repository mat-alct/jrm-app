export const removeUndefinedAndEmptyFields = (obj: object) => {
  const record = obj as Record<string, unknown>;
  Object.keys(record).forEach(key => {
    if (record[key] === undefined || record[key] === '') {
      delete record[key];
    }
  });
};
