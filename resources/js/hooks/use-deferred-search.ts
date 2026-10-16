import { useEffect, useRef, useState } from 'react';

const DEFAULT_DELAY_MS = 450;
const SINGLE_CHAR_DELAY_MS = 700;

/**
 * El input responde al instante. La búsqueda al servidor espera a que
 * el usuario deje de escribir, y al borrar todo sale de inmediato.
 */
export function useDeferredSearch(
    value: string,
    onChange: (value: string) => void,
    delayMs = DEFAULT_DELAY_MS,
): {
    text: string;
    setText: (value: string) => void;
    flush: () => void;
} {
    const [text, setText] = useState(value);
    const sent = useRef(value);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        setText((current) => {
            if (current.trim() !== sent.current) {
                return current;
            }

            if (value === sent.current) {
                return value;
            }

            return current;
        });
    }, [value]);

    useEffect(() => {
        const next = text.trim();

        if (next === sent.current) {
            return;
        }

        const wait =
            delayMs === 0
                ? 0
                : next.length === 0
                  ? 0
                  : next.length === 1
                    ? SINGLE_CHAR_DELAY_MS
                    : delayMs;

        const timer = window.setTimeout(() => {
            if (next === sent.current) {
                return;
            }

            sent.current = next;
            onChangeRef.current(next);
        }, wait);

        return () => window.clearTimeout(timer);
    }, [text, delayMs]);

    const flush = () => {
        const next = text.trim();

        if (next === sent.current) {
            return;
        }

        sent.current = next;
        onChangeRef.current(next);
    };

    return { text, setText, flush };
}
