const defaultTitle = document.title;

export const setTitle = (t: string): void => {
  if (t) document.title = t;
};

export const resetTitle = (): void => {
  document.title = defaultTitle;
};
