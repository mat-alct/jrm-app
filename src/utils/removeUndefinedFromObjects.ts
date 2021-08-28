// eslint-disable-next-line @typescript-eslint/ban-types
export const removeUndefined = (obj: Object) => {
  return Object.keys(obj).forEach(key => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line no-param-reassign
    obj[key] === undefined ? delete obj[key] : {};
  });
};
