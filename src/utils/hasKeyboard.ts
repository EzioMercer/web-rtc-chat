// A device used with a mouse or touchpad, which usually has a real keyboard. On phones and tablets, focusing a text
// field pops up the on-screen keyboard (there is no reliable way to place the cursor without it), so fields aren't
// focused there until tapped.
export const hasKeyboard = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
