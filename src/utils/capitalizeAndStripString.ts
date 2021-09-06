export const capitalizeAndStrip = (input: string) => {
  if (input) {
    const updatedInput = input
      .replace(/\S+/g, txt => {
        // uppercase first letter and add rest unchanged
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      })
      .trim();

    return updatedInput;
  }

  return input;
};
