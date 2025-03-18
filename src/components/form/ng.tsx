/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import * as React from 'react';
import { BaseSyntheticEvent, cloneElement, isValidElement, JSX, useContext, useEffect, useMemo, useRef } from 'react';
import { useUpdate } from 'ahooks';
import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';
import { EventEmitter } from 'eventemitter3';
import { Map as ImmutableMap, Set as ImmutableSet } from 'immutable';
import { CSSObject } from '@emotion/react';
import { cx } from '@emotion/css';
import { ComponentProviderUtil } from '../../utilities/component-provider-util.class';
import { PiXCircleFill } from 'react-icons/pi';
import * as _ from 'lodash';

export type FormTemplateRegistry = (helpers: FormTemplateRegistryHelpers) => FormItemProps[];

interface ValueState {
    data: any;
    errorMessages: string[];
}

const formTemplateMap = new Map<string, FormTemplateRegistry>();

interface FormItemBaseProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'value' | 'onChange' | 'children' | 'defaultValue'> {
    dangerColor?: string;
    dense?: number;
    labelProps?: React.HTMLAttributes<HTMLDivElement>;
    maxWidth?: number | string;
    minWidth?: number | string;
    validateOnChange?: boolean;
}

type GetPartialTemplateFn = (id: string, names?: string[]) => FormItemProps[];

export interface FormTemplateRegistryHelpers {
    getPartialTemplate: GetPartialTemplateFn;
}

export interface FormChildrenRegistryHelpers extends FormTemplateRegistryHelpers {
    getPartialTemplate: GetPartialTemplateFn;
    render: (propsList: FormItemProps[]) => JSX.Element[];
}

export interface FormStatic {
    registerTemplate: (name: string, registry: FormTemplateRegistry) => void;
}

export type ComponentPropsItem = any[];

export interface ComponentProps {
    [name: string]: ComponentPropsItem;
}

export interface FormProps extends FormItemBaseProps {
    children?: JSX.Element | JSX.Element[] | ((helpers: FormChildrenRegistryHelpers) => JSX.Element | JSX.Element[]);
    disabled?: boolean;
    instance?: FormInstance;
    readOnly?: boolean;
    sx?: {
        wrapper?: CSSObject;
    };
    onChange?: (value: Value, changedFields: string[]) => void;
}

export interface Value {
    [name: string]: any;
}

export interface ErrorMap {
    [name: string]: string[];
}

export interface ItemContext {
    defaultValue: any;
    errorMessages: string[];
    formValueStateMap: ImmutableMap<string, ValueState>;
    value: any;
}

export interface SubmitValue {
    errors?: ErrorMap;
    value?: Value;
}

interface FormInnerInstance {
    clearValues: (names?: string[]) => void;
    resetValues: (names?: string[]) => void;
    setValue: (name: string, value?: any) => void;
    setValues: (values?: Value) => void;
    validate: (names?: string[]) => Promise<SubmitValue>;
}

export interface FormItemProps extends FormItemBaseProps {
    name: string;
    children?: JSX.Element | JSX.Element[] | ((context: ItemContext) => JSX.Element | JSX.Element[]);
    defaultValue?: any;
    disabled?: boolean | ((context: ItemContext) => boolean);
    effects?: EffectItem[];
    errorMessageProps?: React.HTMLAttributes<HTMLDivElement>;
    errorWrapperProps?: React.HTMLAttributes<HTMLDivElement> | false;
    extra?: React.ReactNode;
    label?: React.ReactNode;
    readOnly?: boolean | ((context: ItemContext) => boolean);
    required?: boolean | string;
    serializer?: FormItemSerializer;
    sx?: {
        wrapper?: CSSObject;
        headerWrapper?: CSSObject;
        headerLabel?: CSSObject;
        headerControls?: CSSObject;
        elementWrapper?: CSSObject;
        errorWrapper?: CSSObject;
        errorMessage?: CSSObject;
        errorMessageContent?: CSSObject;
        errorMessageIcon?: CSSObject;
    };
    validators?: Validator[];
    hideCondition?: (context: ItemContext) => boolean;
    registerCondition?: (context: ItemContext) => boolean;
}

export interface EffectActionHelpers {
    clear: () => void;
    reset: () => void;
    set: (value: any) => void;
}

export interface EffectItem {
    dependencies: string[];
    action: (value: Value, helpers: EffectActionHelpers) => void | Promise<void>;
}

export interface FormItemSerializer {
    incoming?: (incomingValue: any) => any;
    outgoing?: (outgoingValue: any) => any;
}

export type Validator = (value: any, formValue: Value) => Promise<string> | string;

interface FormInnerInstance {
    clearValues: (names?: string[]) => void;
    resetValues: (names?: string[]) => void;
    setValue: (name: string, value?: any) => void;
    setValues: (values?: Value) => void;
    validate: (names?: string[]) => Promise<SubmitValue>;
}

class FormInstance implements FormInnerInstance {
    public constructor(
        useFormId: string,
        instanceId: string,
        private readonly innerInstance?: FormInnerInstance,
        private readonly value?: ImmutableMap<string, any>,
    ) {
        Object.defineProperty(this, 'useFormId', {
            writable: false,
            value: useFormId,
        });
        Object.defineProperty(this, 'instanceId', {
            writable: false,
            value: instanceId,
        });
    }

    clearValues(names?: string[]) {
        return this.innerInstance?.clearValues?.(names);
    }

    resetValues(names?: string[]) {
        return this.innerInstance?.resetValues?.(names);
    }

    setValue(name: string, value?: any) {
        return this.innerInstance?.setValue?.(name, value);
    }

    setValues(values?: Value) {
        return this.innerInstance?.setValues?.(values);
    }

    validate(names?: string[]) {
        return this.innerInstance?.validate?.(names);
    }

    getValue(name: string) {
        return this.value?.get?.(name);
    }

    getValues() {
        return this.value?.toJS?.();
    }
}

const {
    Provider: FormProvider,
    useComponentConfig: useFormComponentConfig,
    useClassNames: useFormClassNames,
} = ComponentProviderUtil.create<FormProps>({
    defaultProps: () => ({
        disabled: false,
        readOnly: false,
        dense: 4,
        dangerColor: '#FF0000',
        sx: {
            wrapper: {
                display: 'flex',
                flexDirection: 'column',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
            },
        },
    }),
    merger: (context) => ({
        sx: {
            wrapper: {
                '& > *': {
                    marginBottom: 2 * context?.finalProps?.dense,
                },
            },
        },
    }),
});

const EventContext = React.createContext<EventEmitter>(null);
const EVENT_NAMES = {
    CLEAR: Symbol(''),
    PARTIAL_CHANGE: Symbol(''),
    REGISTER_ITEM: Symbol(''),
    RESET: Symbol(''),
    UNREGISTER_ITEM: Symbol(''),
};

// export const FormProvider: React.FC<React.PropsWithChildren<Parameters<typeof FormBaseProvider>[0]>> = ({
//     children,
//     ...props
// }) => {
//     const eventEmitterRef = useRef(new EventEmitter());
//     return (
//         <FormBaseProvider {...props}>
//             <EventContext.Provider value={eventEmitterRef.current}>{children}</EventContext.Provider>
//         </FormBaseProvider>
//     );
// };

const {
    Provider: FormItemProvider,
    useComponentConfig: useFormItemComponentConfig,
    useClassNames: useFormItemClassNames,
} = ComponentProviderUtil.create<FormItemProps>({
    defaultProps: () => ({
        required: false,
        validators: [],
        effects: [],
    }),
    merger: ({ finalProps }) => {
        return {
            sx: {
                wrapper: {
                    maxWidth: '100%',
                    fontSize: 14,
                },
                headerWrapper: {
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                },
                headerLabel: {
                    userSelect: 'none',
                    position: 'relative',
                    ...(() => {
                        if (finalProps?.required === true || !StringUtil.isFalsyString(finalProps?.required)) {
                            return {
                                '&::before': {
                                    content: '"*"',
                                    lineHeight: 1,
                                    color: finalProps?.dangerColor,
                                    fontWeight: 'bolder',
                                },
                            };
                        }
                        return {};
                    })(),
                    flexGrow: 1,
                    flexShrink: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    alignItems: 'center',
                },
                headerControls: {
                    display: 'flex',
                    flexWrap: 'nowrap',
                    flexDirection: 'row',
                    flexGrow: 0,
                    flexShrink: 0,
                },
                elementWrapper: {
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    alignItems: 'flex-start',
                },
                errorWrapper: {
                    display: 'flex',
                    flexDirection: 'column',
                    flexWrap: 'nowrap',
                    alignItems: 'flex-start',
                    maxWidth: '100%',
                },
                errorMessage: {
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    position: 'relative',
                    boxSizing: 'border-box',
                    color: finalProps?.dangerColor,
                    lineHeight: 1,
                    marginTop: 4,
                },
                errorMessageIcon: {
                    display: 'inline-block',
                    flexShrink: 0,
                    flexGrow: 0,
                },
                errorMessageContent: {
                    display: 'inline-block',
                    flexShrink: 1,
                    flexGrow: 1,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                },
            },
        };
    },
});

export { FormProvider, FormItemProvider };

const ValueStateMapContext = React.createContext<ImmutableMap<string, ValueState>>(ImmutableMap());
const RegisteredFieldNamesContext = React.createContext<ImmutableSet<string>>(ImmutableSet());

export const Form = React.forwardRef<HTMLDivElement, FormProps>((inputProps, ref) => {
    const getPartialTemplate: GetPartialTemplateFn = (id, names) => {
        const registryFunction = formTemplateMap.get(id);

        if (typeof registryFunction !== 'function') {
            return [];
        }

        const formItems = registryFunction({
            getPartialTemplate,
        });

        if (!Array.isArray(formItems)) {
            return [];
        }

        if (!Array.isArray(names) || names.length === 0) {
            return formItems;
        }

        return names.map((name) => formItems.find((formItem) => formItem.name === name));
    };
    const {
        children: inputChildren = [],
        dense,
        dangerColor,
        labelProps,
        maxWidth,
        minWidth,
        validateOnChange = true,
        disabled = false,
        readOnly = false,
        sx,
        // instance,
        // onChange,
    } = useFormComponentConfig(inputProps);
    const update = useUpdate();
    const classNames = useFormClassNames(sx);
    const eventEmitterRef = useRef(new EventEmitter());
    const children = useMemo(() => {
        let result: JSX.Element[] = [];

        if (typeof inputChildren === 'function') {
            const generatedChildren = inputChildren({
                getPartialTemplate,
                render: (propsList) => propsList.map((props) => <FormItem {...props} />),
            });
            if (Array.isArray(generatedChildren)) {
                result = generatedChildren;
            } else if (isValidElement(generatedChildren)) {
                result = [generatedChildren];
            } else {
                result = [];
            }
        } else if (Array.isArray(inputChildren)) {
            result = inputChildren;
        } else if (isValidElement(inputChildren)) {
            result = [inputChildren];
        } else {
            result = [];
        }

        return result
            .filter((child) => !StringUtil.isFalsyString(child?.props?.name))
            .map((child, index) => {
                return cloneElement(child, {
                    key: index,
                    dense: child?.props?.dense ?? dense,
                    dangerColor: child?.props?.dangerColor ?? dangerColor,
                    labelProps: child?.props?.labelProps ?? labelProps,
                    maxWidth: child?.props?.maxWidth ?? maxWidth,
                    minWidth: child?.props?.minWidth ?? minWidth,
                    disabled: child?.props?.disabled ?? disabled,
                    readOnly: child?.props?.readOnly ?? readOnly,
                    validateOnChange: child?.props?.validateOnChange ?? validateOnChange,
                });
            });
    }, [inputChildren]);
    const registratedFieldNamesRef = useRef<ImmutableSet<string>>(ImmutableSet());
    const formValueStateMapRef = useRef<ImmutableMap<string, ValueState>>(ImmutableMap());

    useEffect(() => {
        let formValueStateMap = ImmutableMap<string, ValueState>();
        children.forEach((child) => {
            formValueStateMap = formValueStateMap.set(child?.props?.name, {
                data: child?.props?.defaultValue,
                errorMessages: [],
            });
        });
        formValueStateMapRef.current = formValueStateMap;
        update();
    }, [children]);

    useEffect(() => {
        if (!(eventEmitterRef.current instanceof EventEmitter)) return;

        const resetHandler = () => {
            let formValueStateMap = ImmutableMap<string, ValueState>();
            children?.forEach?.((child) => {
                formValueStateMap = formValueStateMap.set(child?.props?.name, {
                    data: child?.props?.defaultValue,
                    errorMessages: [],
                });
            });
            formValueStateMapRef.current = formValueStateMap;
            update();
        };

        const clearHandler = () => {
            formValueStateMapRef.current = ImmutableMap<string, ValueState>();
            update();
        };

        const partialChangeHandler = (updatePart: Value) => {
            if (!updatePart || !_.isObjectLike(updatePart)) return;
            let formValueStateMap = formValueStateMapRef.current;
            Object.entries(updatePart).forEach(([key, value]) => {
                formValueStateMap = formValueStateMap.set(key, {
                    ...formValueStateMap.get(key),
                    data: value,
                });
            });
            formValueStateMapRef.current = formValueStateMap;
            update();
        };

        const registerHandler = (name: string) => {
            registratedFieldNamesRef.current = registratedFieldNamesRef.current.add(name);
            update();
        };

        const unregisterHandler = (name: string) => {
            registratedFieldNamesRef.current = registratedFieldNamesRef.current.delete(name);
            update();
        };

        eventEmitterRef.current.addListener(EVENT_NAMES.RESET, resetHandler);
        eventEmitterRef.current.addListener(EVENT_NAMES.CLEAR, clearHandler);
        eventEmitterRef.current.addListener(EVENT_NAMES.PARTIAL_CHANGE, partialChangeHandler);
        eventEmitterRef.current.addListener(EVENT_NAMES.REGISTER_ITEM, registerHandler);
        eventEmitterRef.current.addListener(EVENT_NAMES.UNREGISTER_ITEM, unregisterHandler);

        return () => {
            eventEmitterRef.current.removeListener(EVENT_NAMES.RESET, resetHandler);
            eventEmitterRef.current.removeListener(EVENT_NAMES.CLEAR, clearHandler);
            eventEmitterRef.current.removeListener(EVENT_NAMES.PARTIAL_CHANGE, partialChangeHandler);
            eventEmitterRef.current.removeListener(EVENT_NAMES.REGISTER_ITEM, registerHandler);
            eventEmitterRef.current.removeListener(EVENT_NAMES.UNREGISTER_ITEM, unregisterHandler);
        };
    }, [eventEmitterRef.current, children]);

    return (
        <EventContext.Provider value={eventEmitterRef.current}>
            <ValueStateMapContext.Provider value={formValueStateMapRef.current}>
                <RegisteredFieldNamesContext.Provider value={registratedFieldNamesRef.current}>
                    <div ref={ref} className={cx(classNames?.wrapper)}>
                        {children}
                    </div>
                </RegisteredFieldNamesContext.Provider>
            </ValueStateMapContext.Provider>
        </EventContext.Provider>
    );
});

export const FormItem: React.FC<FormItemProps> = (inputProps) => {
    const {
        name,
        children,
        // required,
        label,
        disabled,
        readOnly,
        serializer,
        defaultValue,
        // validators,
        // effects,
        labelProps,
        errorWrapperProps,
        errorMessageProps,
        sx,
        extra,
        // validateOnChange = true,
        registerCondition,
        hideCondition,
        ...props
    } = useFormItemComponentConfig(inputProps);
    const update = useUpdate();
    const classNames = useFormItemClassNames(sx);
    const eventEmitter = useContext(EventContext);
    const formValueStateMap = useContext(ValueStateMapContext);
    const hiddenRef = useRef(true);
    const formItemContextRef = useRef<ItemContext>(undefined);
    const registratedFieldNames = useContext(RegisteredFieldNamesContext);

    const getCurrentValueState = () => formValueStateMap?.get?.(name);

    const getContext = (): ItemContext => {
        const currentValueState = getCurrentValueState();
        return {
            formValueStateMap,
            defaultValue,
            value: currentValueState?.data,
            errorMessages: currentValueState?.errorMessages,
        };
    };

    useEffect(() => {
        formItemContextRef.current = getContext();
        update();
    }, [formValueStateMap, defaultValue]);

    useEffect(() => {
        if (typeof registerCondition !== 'function' ? true : registerCondition?.(formItemContextRef.current)) {
            eventEmitter?.emit?.(EVENT_NAMES.REGISTER_ITEM, name);
        } else {
            eventEmitter?.emit?.(EVENT_NAMES.UNREGISTER_ITEM, name);
        }
    }, [name, formItemContextRef.current, eventEmitter, registerCondition]);

    useEffect(() => {
        if (typeof hideCondition === 'function') {
            hiddenRef.current = hideCondition(formItemContextRef.current);
        } else if (typeof hideCondition === 'boolean') {
            hiddenRef.current = hideCondition;
        } else {
            hiddenRef.current = false;
        }
        update();
    }, [formItemContextRef.current, hideCondition]);

    let normalizedChildren = typeof children === 'function' ? children(formItemContextRef.current) : children;

    if (!Array.isArray(normalizedChildren)) {
        normalizedChildren = normalizedChildren ? [normalizedChildren] : [];
    }

    const parsedValue = (() => {
        const value = formValueStateMap?.get?.(name)?.data;

        if (typeof serializer?.incoming === 'function') {
            return serializer.incoming(value);
        }

        return value;
    })();

    if (!registratedFieldNames?.includes?.(name)) return;

    return (
        <div
            {..._.omit(props, [
                'required',
                'validators',
                'effects',
                'validateOnChange',
                'dangerColor',
                'minWidth',
                'maxWidth',
            ])}
            className={cx(classNames?.wrapper, props?.className)}
            style={{
                ...props?.style,
                ...(() => {
                    if (hiddenRef.current) {
                        return {
                            display: 'none',
                        };
                    }
                    return {};
                })(),
            }}
        >
            <div className={cx(classNames?.headerWrapper)}>
                {label && (
                    <div {...labelProps} className={cx(classNames?.headerLabel, labelProps?.className)}>
                        {label}
                    </div>
                )}
                <div
                    className={cx(classNames?.headerControls)}
                    style={{
                        flex: 'unset',
                        flexGrow: 0,
                        flexShrink: 0,
                    }}
                ></div>
            </div>
            <div className={cx(classNames?.elementWrapper)}>
                {normalizedChildren.slice(0, 1).map((element, elementIndex) =>
                    cloneElement(element, {
                        key: elementIndex,
                        disabled:
                            element.props?.disabled ??
                            (() => {
                                return typeof disabled === 'function' ? disabled(getContext()) : disabled;
                            })(),
                        readOnly:
                            element.props?.readOnly ??
                            (() => {
                                return typeof readOnly === 'function' ? readOnly(getContext()) : readOnly;
                            })(),
                        value: parsedValue,
                        onChange: (value: any, ...others: any[]) => {
                            eventEmitter?.emit?.(EVENT_NAMES.PARTIAL_CHANGE, {
                                [name]: (() => {
                                    let result: any;
                                    if (typeof serializer?.outgoing === 'function') {
                                        result = serializer.outgoing(value);
                                    } else if ((value as any)?._reactName === 'onChange') {
                                        result = (value as BaseSyntheticEvent)?.target?.value;
                                    } else {
                                        result = value;
                                    }
                                    return result;
                                })(),
                            });
                            element?.props?.onChange?.(value, ...others);
                        },
                    }),
                )}
            </div>
            {(() => {
                const currentValueState = getCurrentValueState();
                if (
                    Array.isArray(currentValueState?.errorMessages) &&
                    currentValueState?.errorMessages?.length > 0 &&
                    errorWrapperProps !== false
                ) {
                    return (
                        <div
                            {...errorWrapperProps}
                            className={cx(classNames?.errorWrapper, errorWrapperProps?.className)}
                        >
                            {currentValueState.errorMessages.map((errorMessage, index) => (
                                <div
                                    key={index}
                                    {...errorMessageProps}
                                    className={cx(classNames?.errorMessage, errorMessageProps?.className)}
                                >
                                    <PiXCircleFill className={classNames?.errorMessageIcon} />
                                    <div className={classNames?.errorMessageContent}>{errorMessage}</div>
                                </div>
                            ))}
                        </div>
                    );
                }
                return null;
            })()}
            {extra}
        </div>
    );
};
