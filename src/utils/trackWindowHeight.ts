// Keeps the CSS variable --window-height equal to the window's real height. Phone browsers change it when the
// address bar or the keyboard shows or hides, and don't always resize the page with it.
export const trackWindowHeight = () => {
  const update = () => document.documentElement.style.setProperty('--window-height', `${window.innerHeight}px`);

  update();
  window.addEventListener('resize', update);
  window.visualViewport?.addEventListener('resize', update);
};
