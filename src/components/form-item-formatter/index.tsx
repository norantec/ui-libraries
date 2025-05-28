/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import * as React from 'react';
import { ComponentProviderUtil } from '../../utilities/component-provider-util.class';

export interface FormItemFormatterProps<I = any, O = any> {
    children?: React.ReactNode;
    value?: I;
    incoming?: (value: I) => O;
    onChange?: (value?: I) => void;
    outgoing?: (value: O) => I;
}

const { Provider: FormItemFormatterProvider, useComponentConfig: useFormItemFormatterComponentConfig } =
    ComponentProviderUtil.create<FormItemFormatterProps>({});

export { FormItemFormatterProvider, useFormItemFormatterComponentConfig };

export const FormItemFormatter = <I extends any = any, O extends any = any>({
    children,
    value,
    outgoing,
    incoming,
    onChange,
}: FormItemFormatterProps<I, O>) => {
    if (!React.isValidElement(children)) return <></>;
    return React.cloneElement(children as any, {
        value: typeof incoming === 'function' ? incoming(value) : value,
        onChange: (value: O) => {
            if (typeof outgoing === 'function') {
                onChange?.(outgoing(value));
            } else {
                onChange?.(value as unknown as I);
            }
        },
    });
};
