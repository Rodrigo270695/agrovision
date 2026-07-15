import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'light';

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const applyLightTheme = (): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

/** Fuerza siempre el modo claro (sin opción oscura ni sistema). */
export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    currentAppearance = 'light';
    localStorage.setItem('appearance', 'light');
    setCookie('appearance', 'light');
    applyLightTheme();
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'light',
    );

    const updateAppearance = (_mode?: Appearance): void => {
        currentAppearance = 'light';
        localStorage.setItem('appearance', 'light');
        setCookie('appearance', 'light');
        applyLightTheme();
        notify();
    };

    return {
        appearance,
        resolvedAppearance: 'light',
        updateAppearance,
    } as const;
}
