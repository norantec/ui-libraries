import { useEffect, useRef } from 'react';
import { useMatchMedia } from '../use-match-media';
import { useUpdate } from 'ahooks';

export type ColorSchemeFinalValue = 'light' | 'dark';
export type ColorSchemeSettingValue = ColorSchemeFinalValue | 'preference';

export const useColorScheme = (colorScheme: ColorSchemeSettingValue = 'preference') => {
    const update = useUpdate();
    const colorSchemeFinalValueRef = useRef<ColorSchemeFinalValue | null>(null);
    const systemMatchedDark = useMatchMedia('(prefers-color-scheme: dark)');

    useEffect(() => {
        if (colorScheme === 'preference') {
            colorSchemeFinalValueRef.current = systemMatchedDark ? 'dark' : 'light';
        } else {
            colorSchemeFinalValueRef.current = (['dark', 'light'] as ColorSchemeFinalValue[]).includes(colorScheme)
                ? colorScheme
                : 'light';
        }
        update();
    }, [systemMatchedDark, colorScheme]);

    return colorSchemeFinalValueRef.current;
};
