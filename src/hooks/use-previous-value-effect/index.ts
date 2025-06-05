import type { DependencyList } from 'react';
import { useEffect, useRef } from 'react';

export type UpdateValueFn<T> = (value: T) => void;

export const usePreviousValueEffect = <T>(
    effect: (previousValue?: T) => void | (() => void),
    dependencies: DependencyList,
    comparator?: (previousValue: T) => T | undefined,
) => {
    const previousValue = useRef<T>(undefined!);
    useEffect(() => {
        if (typeof comparator !== 'function') {
            return effect(previousValue.current);
        } else {
            const comparatorResult = comparator(previousValue.current);

            if (comparatorResult === undefined) {
                return;
            }

            previousValue.current = comparatorResult;

            return effect(previousValue.current);
        }
    }, dependencies ?? []);
};
