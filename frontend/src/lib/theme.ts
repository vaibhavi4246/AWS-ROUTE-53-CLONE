import { applyMode, Mode } from '@cloudscape-design/global-styles';

export type Theme = 'light' | 'dark';

const listeners = new Set<() => void>();

/** Runs before first paint (first child of <body>) so a saved dark mode never flashes light. */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem('theme')==='dark')document.body.classList.add('awsui-dark-mode');}catch(e){}`;

export const themeStore = {
  get(): Theme {
    return document.body.classList.contains('awsui-dark-mode') ? 'dark' : 'light';
  },
  getServerSnapshot: (): Theme => 'light',
  set(theme: Theme) {
    applyMode(theme === 'dark' ? Mode.Dark : Mode.Light);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* storage unavailable (private mode) */
    }
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
