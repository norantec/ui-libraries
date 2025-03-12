import type { DependencyList, EffectCallback } from 'react';
import { useEffect, useRef } from 'react';

export type UpdateValueFn<T> = (value: T) => void;

export const usePreviousValueEffect = <T>(
    effect: EffectCallback,
    dependencies: DependencyList,
    comparator?: (previousValue: T) => T | undefined,
) => {
    const previousValue = useRef<T>(undefined!);
    useEffect(() => {
        if (typeof comparator !== 'function') {
            return effect();
        } else {
            const comparatorResult = comparator(previousValue.current);

            if (comparatorResult === undefined) {
                return;
            }

            previousValue.current = comparatorResult;

            return effect();
        }
    }, dependencies ?? []);
};
