/**
 * Telegram WebApp & Monetag Ad Utilities
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        openLink: (url: string) => void;
        openTelegramLink: (url: string) => void;
        showPopup: (params: { title?: string; message: string; buttons?: any[] }, callback?: (buttonId: string) => void) => void;
        showAlert: (message: string, callback?: () => void) => void;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
        version?: string;
        isVersionAtLeast?: (ver: string) => boolean;
        CloudStorage?: {
          setItem: (key: string, value: string, callback?: (error: Error | null, result?: boolean) => void) => any;
          getItem: (key: string, callback: (error: Error | null, result?: string | null) => void) => any;
          getItems: (keys: string[], callback: (error: Error | null, result?: Record<string, string | null>) => void) => any;
          removeItem: (key: string, callback?: (error: Error | null, result?: boolean) => void) => any;
          removeItems: (keys: string[], callback?: (error: Error | null, result?: boolean) => void) => any;
          getKeys: (callback: (error: Error | null, result?: string[]) => void) => any;
        };
      };
    };
    show_11775264?: () => Promise<void>;
    show_11780436?: (options?: {
      type: string;
      inAppSettings?: {
        frequency: number;
        capping: number;
        interval: number;
        timeout: number;
        everyPage: boolean;
      };
    }) => Promise<any> | void;
  }
}

export function initTelegramWebApp() {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  } catch (e) {
    console.warn('Telegram WebApp init notice:', e);
  }

  // Activate Monetag In-App Interstitial on app start with user specified settings
  activateMonetagInAppInterstitial();
  setTimeout(() => activateMonetagInAppInterstitial(), 2000);

  return true;
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  try {
    const haptic = window.Telegram?.WebApp?.HapticFeedback;
    if (!haptic) return;
    if (type === 'success' || type === 'warning' || type === 'error') {
      haptic.notificationOccurred(type);
    } else {
      haptic.impactOccurred(type);
    }
  } catch {}
}

export function getTelegramUser() {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
  } catch {
    return null;
  }
}

/**
 * Activates Monetag In-App Interstitial (Zone 11780436)
 * Configuration matches user's Monetag settings:
 * - 2 ads within 0.1 hours (6 minutes)
 * - 30-second interval between them
 * - 5-second delay before the first one is shown
 * - everyPage: false (preserves session between transitions)
 */
export function activateMonetagInAppInterstitial(): boolean {
  try {
    if (typeof window.show_11780436 === 'function') {
      console.log('Activating Monetag In-App Interstitial (Zone 11780436)...');
      window.show_11780436({
        type: 'inApp',
        inAppSettings: {
          frequency: 2,
          capping: 0.1,
          interval: 30,
          timeout: 5,
          everyPage: false,
        },
      });
      return true;
    }
  } catch (err) {
    console.warn('Monetag in-app interstitial activate notice:', err);
  }
  return false;
}

/**
 * Safely trigger Monetag Ad SDK function (prioritizing user's zone 11780436)
 */
export async function triggerMonetagAd(): Promise<boolean> {
  try {
    // 1. Activate / show In-App Interstitial (Zone 11780436)
    if (typeof window.show_11780436 === 'function') {
      activateMonetagInAppInterstitial();
      return true;
    }
    // 2. Fallback to Zone 11775264 if loaded
    if (typeof window.show_11775264 === 'function') {
      await window.show_11775264();
      return true;
    }
  } catch (err) {
    console.warn('Monetag ad callback info:', err);
  }
  return false;
}
