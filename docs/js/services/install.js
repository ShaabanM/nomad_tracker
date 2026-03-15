const INSTALL_HINT_KEY = 'nomad_install_hint_dismissed';

let deferredPromptEvent = null;

export function captureInstallPrompt(event) {
  deferredPromptEvent = event;
}

export function hasNativeInstallPrompt() {
  return deferredPromptEvent !== null;
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function isSafari() {
  const ua = window.navigator.userAgent;
  return /safari/i.test(ua) && !/crios|fxios|edgios|chrome|android/i.test(ua);
}

export function shouldShowInstallHint() {
  if (isStandalone()) return false;
  if (localStorage.getItem(INSTALL_HINT_KEY) === 'true') return false;
  return hasNativeInstallPrompt() || (isIOS() && isSafari());
}

export async function promptInstall() {
  if (!deferredPromptEvent) return { outcome: 'unavailable' };

  deferredPromptEvent.prompt();
  const result = await deferredPromptEvent.userChoice;
  deferredPromptEvent = null;

  if (result.outcome !== 'accepted') {
    dismissInstallHint();
  }

  return result;
}

export function dismissInstallHint() {
  localStorage.setItem(INSTALL_HINT_KEY, 'true');
}

export function installInstructions() {
  if (hasNativeInstallPrompt()) {
    return 'Install this app for faster launches, offline access, and a home-screen icon.';
  }

  if (isIOS() && isSafari()) {
    return 'Use Share, then "Add to Home Screen" to install this app on your iPhone.';
  }

  return 'Install this app from your browser menu for a full-screen travel planner on your phone.';
}

export function installActionLabel() {
  return hasNativeInstallPrompt() ? 'Install App' : 'How to Install';
}
