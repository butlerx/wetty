const defaultTitle = document.title;

export const setTitle = (t: string): void => {
  document.title = t || defaultTitle;
};

export const resetTitle = (): void => {
  document.title = defaultTitle;
};
