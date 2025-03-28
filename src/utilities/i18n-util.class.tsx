import * as React from 'react';
import { usePreviousValueEffect } from '../hooks/use-previous-value-effect';
import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';
import { useUpdate } from 'ahooks';
import * as handlebars from 'handlebars';

type LanguageTextMap = Record<string, string>;

const LanguageContext = React.createContext<LanguageTextMap>({});

export interface ProviderProps {
    children?: React.ReactNode;
    code?: string;
    getLanguageTextMap: (code: string) => Promise<LanguageTextMap> | LanguageTextMap;
    onCodeChange?: (code?: string) => void;
}

export const Provider: React.FC<ProviderProps> = ({ children, code, onCodeChange, getLanguageTextMap }) => {
    const textMapRef = React.useRef<LanguageTextMap>({});
    const update = useUpdate();

    usePreviousValueEffect(
        () => {
            if (StringUtil.isFalsyString(code)) {
                textMapRef.current = {};
                update();
            } else {
                Promise.resolve(getLanguageTextMap(code)).then((result) => {
                    textMapRef.current = result;
                    update();
                });
                onCodeChange?.(code);
            }
        },
        [code, onCodeChange, getLanguageTextMap],
        (previousValue: [string]) => {
            return previousValue?.[0] === code ? undefined : ([code] as [string]);
        },
    );

    return <LanguageContext.Provider value={textMapRef.current}>{children}</LanguageContext.Provider>;
};

const useText = () => {
    const textMap = React.useContext(LanguageContext);
    return (rawText: string, context?: Record<string, any>) => {
        if (StringUtil.isFalsyString(rawText)) return '';

        let finalRawText = textMap?.[rawText];

        if (StringUtil.isFalsyString(finalRawText)) {
            finalRawText = rawText;
        }

        return handlebars.compile(finalRawText)(context);
    };
};

export class I18nUtil {
    public static Provider = Provider;
    public static useText = useText;
}
