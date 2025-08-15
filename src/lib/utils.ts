export const openInPopup = (url: string) => {
  const width = 500;
  const height = 1000;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  const popup = window.open(
    url,
    "discordSignInPopup",
    `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`,
  );

  if (popup) {
    popup.focus();
  }
};
