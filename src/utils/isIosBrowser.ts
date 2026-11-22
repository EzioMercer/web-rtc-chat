// Safari on an iPhone or iPad, not installed on the Home Screen. Safari deletes the data of such sites after 7
// days without a visit (installed apps keep theirs). iPads may say they are Macs; touch gives them away.
export const isIosBrowser = () => {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return ios && !installed;
};
