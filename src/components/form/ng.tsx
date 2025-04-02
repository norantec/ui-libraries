import * as React from 'react';
import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';
import { UUIDUtil } from '@open-norantec/utilities/dist/uuid-util.class';
import { useUpdate } from 'ahooks';
import { EventEmitter } from 'eventemitter3';
import { createContext, JSX, useEffect, useRef } from 'react';
import { ComponentProviderUtil } from '../../utilities/component-provider-util.class';
import { CSSObject } from '@emotion/react';
import { usePreviousValueEffect } from '../../hooks/use-previous-value-effect';
import { cx } from '@emotion/css';
import * as _ from 'lodash';
import { PiXCircleFill } from 'react-icons/pi';

const getDefinedPropertyValue = (instance: FormInstance, key: string | symbol) => {
    try {
        const result = Object.getOwnPropertyDescriptor(instance, key)?.value ?? null;
        return result;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        return null;
    }
};

const eventEmitter = new EventEmitter();
// <formId, <fieldName, value>
const formItemsMap = new Map<string, Map<string, any>>();

enum EventName {
    CLEAR_ITEM_VALUE = 'CLEAR_ITEM_VALUE',
    FORM_VALUE_CHANGE = 'FORM_VALUE_CHANGE',
    ITEMS_VALUE_CHANGE = 'ITEMS_VALUE_CHANGE',
    REGISTER_ITEM = 'REGISTER_ITEM',
    RESET_ITEM_VALUE = 'RESET_ITEM_VALUE',
    SET_ITEM_VALUE = 'SET_ITEM_VALUE',
    SET_ITEMS_VALUE = 'SET_ITEMS_VALUE',
    UNREGISTER_ITEM = 'UNREGISTER_ITEM',
    VALIDATE_ITEM_RESULT = 'VALIDATE_ITEM_RESULT',
    VALIDATE_ITEMS = 'VALIDATE_ITEMS',
}

export interface FormValue {
    [name: string]: any;
}

export interface FormValidateResult {
    errors?: Record<string, string[]> | null;
    value?: FormValue;
}

export interface FormItemContext {
    defaultValue: any;
    errorMessages: string[];
    value: any;
    values: FormValue;
}

export type Validator = {
    validateOnChange?: boolean;
    validateOnValidation?: boolean;
    validate: (value: any, formValue: FormValue) => Promise<string> | string;
};

interface EventMessageDataMap {
    [EventName.CLEAR_ITEM_VALUE]: string[];
    [EventName.FORM_VALUE_CHANGE]: [FormValue, string[]];
    [EventName.REGISTER_ITEM]: [string, any];
    [EventName.RESET_ITEM_VALUE]: string[];
    [EventName.SET_ITEMS_VALUE]: FormValue;
    [EventName.UNREGISTER_ITEM]: string;
    [EventName.ITEMS_VALUE_CHANGE]: FormValue;
    [EventName.SET_ITEM_VALUE]: [string, any];
    [EventName.VALIDATE_ITEMS]: [string, string[]];
    // requestId, fieldName, errorMessage[];
    [EventName.VALIDATE_ITEM_RESULT]: [string, string, string[]];
}

class EventMessage<T extends EventName> {
    public constructor(
        public readonly eventName: T,
        public readonly data: EventMessageDataMap[T],
    ) {}
}

class FormInstance {
    public constructor(
        private readonly id: string,
        private readonly values: FormValue,
    ) {
        Object.defineProperty(this, 'id', {
            writable: false,
            value: id,
        });
    }

    public clearValues(inputNames?: string[]) {
        eventEmitter.emit(
            EventName.CLEAR_ITEM_VALUE,
            this.id,
            new EventMessage(EventName.CLEAR_ITEM_VALUE, inputNames),
        );
    }

    public resetValues(inputNames?: string[]) {
        eventEmitter.emit(
            EventName.RESET_ITEM_VALUE,
            this.id,
            new EventMessage(EventName.RESET_ITEM_VALUE, inputNames),
        );
    }

    public setValue(name: string, value: any) {
        if (StringUtil.isFalsyString(name)) return;
        eventEmitter.emit(
            EventName.RESET_ITEM_VALUE,
            this.id,
            new EventMessage(EventName.SET_ITEMS_VALUE, { [name]: value }),
        );
    }

    public setValues(newValues: FormValue) {
        if (!newValues || Object.keys(newValues).length === 0) return;
        eventEmitter.emit(EventName.SET_ITEMS_VALUE, this.id, new EventMessage(EventName.SET_ITEMS_VALUE, newValues));
    }

    public getValues() {
        return { ...this.values };
    }

    public getValue(name: string) {
        if (StringUtil.isFalsyString(name)) return;
        return { ...this.values }[name];
    }

    public async validate(inputNames?: string) {
        const names = Array.isArray(inputNames)
            ? inputNames.filter((inputName) => formItemsMap.get(this.id)?.has?.(inputName))
            : Array.from(formItemsMap.get(this.id)?.keys?.());
        return await new Promise<FormValidateResult>((resolve) => {
            const requestId = UUIDUtil.generateV4();
            const errorMessageMap = new Map<string, string[]>();
            const handleResult = (id: string, eventMessage: EventMessage<EventName.VALIDATE_ITEM_RESULT>) => {
                if (
                    id !== this.id ||
                    eventMessage?.data?.[0] !== requestId ||
                    !names.includes(eventMessage?.data?.[1])
                ) {
                    return;
                }

                let errorMessages = Array.isArray(eventMessage.data?.[2])
                    ? eventMessage.data[2].filter((message) => !StringUtil.isFalsyString(message))
                    : null;

                if (Array.isArray(errorMessages) && errorMessages.length === 0) {
                    errorMessages = null;
                }

                errorMessageMap.set(eventMessage.data[1], errorMessages);

                if (Array.from(errorMessageMap.keys()).length === names.length) {
                    eventEmitter.removeListener(EventName.VALIDATE_ITEM_RESULT, handleResult);
                    const errors = Object.fromEntries(
                        Array.from(errorMessageMap.entries()).filter(([, value]) => {
                            return Array.isArray(value) && value.length > 0;
                        }),
                    );
                    resolve({
                        errors: Object.keys(errors).length === 0 ? null : errors,
                        value: Object.fromEntries(formItemsMap.get(id).entries()),
                    });
                }
            };

            eventEmitter.addListener(EventName.VALIDATE_ITEM_RESULT, handleResult);
            eventEmitter.emit(
                EventName.VALIDATE_ITEMS,
                this.id,
                new EventMessage(EventName.VALIDATE_ITEMS, [requestId, names]),
            );
        });
    }
}

export const useForm = () => {
    const update = useUpdate();
    const formInstanceRef = useRef<FormInstance>(new FormInstance(UUIDUtil.generateV4(), null));
    useEffect(() => {
        const handler = (id: string | null, eventMessage: EventMessage<EventName.FORM_VALUE_CHANGE>) => {
            if (StringUtil.isFalsyString(id) || id !== getDefinedPropertyValue(formInstanceRef.current, 'id')) return;
            formInstanceRef.current = new FormInstance(id, eventMessage?.data?.[0]);
            update();
        };
        eventEmitter.addListener(EventName.FORM_VALUE_CHANGE, handler);
        return () => {
            eventEmitter.removeListener(EventName.FORM_VALUE_CHANGE, handler);
        };
    }, [formInstanceRef.current]);
    return formInstanceRef.current;
};

interface FormItemBaseProps {
    dangerColor?: string;
    dense?: number;
    labelProps?: React.HTMLAttributes<HTMLDivElement>;
    maxWidth?: number | string;
    minWidth?: number | string;
}

export interface FormProps
    extends FormItemBaseProps,
        Omit<React.HTMLAttributes<HTMLFormElement>, 'value' | 'onChange' | 'children' | 'defaultValue'> {
    form: FormInstance;
    children?: JSX.Element | JSX.Element[];
    disabled?: boolean;
    readOnly?: boolean;
    sx?: {
        wrapper?: CSSObject;
    };
    onChange?: (value: FormValue, changedFields: string[]) => void;
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
    preInputMerger: (context) => ({
        sx: {
            wrapper: {
                '& > *': {
                    marginBottom: 2 * context?.finalProps?.dense,
                },
            },
        },
    }),
});

export { FormProvider };

const IDContext = createContext<string>(null);

function Form(inputProps: FormProps) {
    const { sx, form, children, onChange, ...props } = useFormComponentConfig(inputProps);
    const classNames = useFormClassNames(sx);
    const idRef = useRef<string>(getDefinedPropertyValue(form, 'id'));
    const update = useUpdate();
    const handleChange = React.useCallback(
        (...parameters: Parameters<FormProps['onChange']>) => {
            onChange?.(...parameters);
            if (!StringUtil.isFalsyString(idRef.current)) {
                eventEmitter.emit(
                    EventName.FORM_VALUE_CHANGE,
                    idRef.current,
                    new EventMessage(EventName.FORM_VALUE_CHANGE, [parameters?.[0], parameters?.[1]]),
                );
            }
        },
        [onChange, idRef.current],
    );

    usePreviousValueEffect(
        () => {
            const currentFormId = getDefinedPropertyValue(form, 'id');
            if (StringUtil.isFalsyString(currentFormId)) return;
            idRef.current = currentFormId;
            formItemsMap.set(currentFormId, new Map());
            update();
        },
        [form],
        (previousValue: string) => {
            const currentFormId = getDefinedPropertyValue(form, 'id');
            if (previousValue !== currentFormId) return currentFormId;
            return;
        },
    );

    useEffect(() => {
        if (StringUtil.isFalsyString(idRef.current)) return;

        const handleRegisterItem = (id: string, eventMessage: EventMessage<EventName.REGISTER_ITEM>) => {
            if (
                id !== idRef.current ||
                StringUtil.isFalsyString(eventMessage?.data?.[0]) ||
                formItemsMap.get(id).has(eventMessage.data[0])
            ) {
                return;
            }
            formItemsMap.get(id).set(eventMessage.data[0], eventMessage.data[1]);
            handleChange(Object.fromEntries(formItemsMap.get(id).entries()), [eventMessage.data[0]]);
        };

        const handleUnregisterItem = (id: string, eventMessage: EventMessage<EventName.UNREGISTER_ITEM>) => {
            if (id !== idRef.current || StringUtil.isFalsyString(eventMessage?.data)) return;
            formItemsMap.get(id).delete(eventMessage.data);
            handleChange(Object.fromEntries(formItemsMap.get(id).entries()), [eventMessage.data]);
        };

        const handleSetItemsValue = (id: string, eventMessage: EventMessage<EventName.SET_ITEMS_VALUE>) => {
            if (id !== idRef.current) return;

            const changedFields: string[] = [];

            Object.entries(eventMessage?.data ?? {}).forEach(([key, value]) => {
                if (!formItemsMap.get(id).has(key)) return;
                changedFields.push(key);
                formItemsMap.get(id).set(key, value);
                eventEmitter.emit(
                    EventName.SET_ITEM_VALUE,
                    id,
                    new EventMessage(EventName.SET_ITEM_VALUE, [key, value]),
                );
            });

            if (changedFields.length > 0) {
                handleChange(Object.fromEntries(formItemsMap.get(id).entries()), changedFields);
            }
        };

        const handleItemsValueChange = (id: string, eventMessage: EventMessage<EventName.ITEMS_VALUE_CHANGE>) => {
            if (id !== idRef.current) return;

            const changedFields: string[] = [];

            Object.entries(eventMessage?.data ?? {}).forEach(([key, value]) => {
                if (!formItemsMap.get(id).has(key)) return;
                changedFields.push(key);
                formItemsMap.get(id).set(key, value);
            });

            if (changedFields.length > 0) {
                handleChange(Object.fromEntries(formItemsMap.get(id).entries()), changedFields);
            }
        };

        eventEmitter.addListener(EventName.REGISTER_ITEM, handleRegisterItem);
        eventEmitter.addListener(EventName.UNREGISTER_ITEM, handleUnregisterItem);
        eventEmitter.addListener(EventName.SET_ITEMS_VALUE, handleSetItemsValue);
        eventEmitter.addListener(EventName.ITEMS_VALUE_CHANGE, handleItemsValueChange);

        return () => {
            eventEmitter.removeListener(EventName.REGISTER_ITEM, handleRegisterItem);
            eventEmitter.removeListener(EventName.UNREGISTER_ITEM, handleUnregisterItem);
            eventEmitter.removeListener(EventName.SET_ITEMS_VALUE, handleSetItemsValue);
            eventEmitter.removeListener(EventName.ITEMS_VALUE_CHANGE, handleItemsValueChange);
        };
    }, [idRef.current, handleChange]);

    if (StringUtil.isFalsyString(idRef.current)) return null;

    return (
        <form {...props} className={cx(classNames?.wrapper, props?.className)}>
            <IDContext.Provider value={idRef.current}>{children}</IDContext.Provider>
        </form>
    );
}

const {
    Provider: FormItemProvider,
    useComponentConfig: useFormItemComponentConfig,
    useClassNames: useFormItemClassNames,
} = ComponentProviderUtil.create<FormItemProps>({
    defaultProps: () => ({
        required: false,
        validators: [],
        dangerColor: '#FF0000',
    }),
    preInputMerger: ({ finalProps }) => {
        return {
            sx: {
                wrapper: {
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    flexWrap: 'nowrap',
                    marginBottom: finalProps?.dense * 2,
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
                    flexDirection: 'column',
                    flexWrap: 'nowrap',
                    marginBottom: finalProps?.dense / 2,
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

export { FormItemProvider };

export interface FormItemProps
    extends FormItemBaseProps,
        Omit<React.HTMLAttributes<HTMLDivElement>, 'value' | 'onChange' | 'children' | 'defaultValue'> {
    name: string;
    children?: JSX.Element;
    defaultValue?: any;
    disabled?: boolean;
    errorMessageProps?: React.HTMLAttributes<HTMLDivElement>;
    errorWrapperProps?: React.HTMLAttributes<HTMLDivElement> | false;
    extra?: React.ReactNode | ((context: FormItemContext) => React.ReactNode);
    label?: React.ReactNode | ((context: FormItemContext) => React.ReactNode);
    readOnly?: boolean;
    required?: boolean | string;
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
    hideCondition?: (context: FormItemContext) => boolean;
    registerCondition?: (context: FormItemContext) => boolean;
}

Form.Item = function (inputProps: FormItemProps) {
    const {
        name,
        children,
        label,
        defaultValue,
        labelProps,
        errorWrapperProps,
        errorMessageProps,
        sx,
        extra,
        validators,
        required,
        registerCondition,
        hideCondition,
        ...props
    } = useFormItemComponentConfig(inputProps);
    const id = React.useContext(IDContext);
    const classNames = useFormItemClassNames(sx);
    const formValueRef = useRef<FormValue>({});
    const errorMessagesRef = useRef<string[]>([]);
    const [value, setValue] = React.useState(defaultValue);
    const context = React.useMemo<FormItemContext>(() => {
        return {
            value,
            defaultValue,
            values: formValueRef.current,
            errorMessages: errorMessagesRef.current,
        };
    }, [defaultValue, value, formValueRef.current]);
    const registeredRef = useRef(false);
    const hiddenRef = useRef(false);
    const update = useUpdate();
    const normalizedValidators = Array.isArray(validators)
        ? validators.filter((validator) => typeof validator?.validate === 'function')
        : [];

    if (required === true || !StringUtil.isFalsyString(required)) {
        normalizedValidators.unshift({
            validateOnChange: true,
            validateOnValidation: true,
            validate: (value) => {
                if (typeof value === 'undefined' || (typeof value === 'string' && value.length === 0)) {
                    return !StringUtil.isFalsyString(required) ? (required as string) : 'It is a required field';
                }
                return;
            },
        });
    }

    useEffect(() => {
        const handleFormValueChange = (currentId: string, eventMessage: EventMessage<EventName.FORM_VALUE_CHANGE>) => {
            if (id !== currentId) return;
            formValueRef.current = eventMessage?.data?.[0];
            update();
        };
        eventEmitter.addListener(EventName.FORM_VALUE_CHANGE, handleFormValueChange);
        return () => {
            eventEmitter.removeListener(EventName.FORM_VALUE_CHANGE, handleFormValueChange);
        };
    }, [id]);

    useEffect(() => {
        const handleSetItemValue = (currentId: string, eventMessage: EventMessage<EventName.SET_ITEM_VALUE>) => {
            if (
                id !== currentId ||
                StringUtil.isFalsyString(name) ||
                StringUtil.isFalsyString(eventMessage?.data?.[0]) ||
                !registeredRef.current ||
                name !== eventMessage.data[0]
            ) {
                return;
            }
            setValue(eventMessage?.data?.[1]);
        };
        eventEmitter.addListener(EventName.SET_ITEM_VALUE, handleSetItemValue);
        return () => {
            eventEmitter.removeListener(EventName.SET_ITEM_VALUE, handleSetItemValue);
        };
    }, [id, name, registeredRef.current]);

    useEffect(() => {
        const handleValidateItems = (currentId: string, eventMessage: EventMessage<EventName.VALIDATE_ITEMS>) => {
            if (
                currentId !== id ||
                StringUtil.isFalsyString(eventMessage?.data?.[0]) ||
                !eventMessage?.data?.[1]?.includes?.(name)
            ) {
                return;
            }

            const submitValidators = normalizedValidators.filter(
                (validator) => validator?.validateOnValidation !== false,
            );

            Promise.all(
                submitValidators.map((validator) => Promise.resolve(validator.validate(value, formValueRef.current))),
            )
                .then((resultList) => {
                    return resultList.filter((result) => !StringUtil.isFalsyString(result));
                })
                .then((result) => {
                    eventEmitter.emit(
                        EventName.VALIDATE_ITEM_RESULT,
                        id,
                        new EventMessage(EventName.VALIDATE_ITEM_RESULT, [eventMessage.data[0], name, result]),
                    );
                    if (!_.isEqual(errorMessagesRef.current, result)) {
                        errorMessagesRef.current = result;
                        update();
                    }
                });
        };

        eventEmitter.addListener(EventName.VALIDATE_ITEMS, handleValidateItems);

        return () => {
            eventEmitter.removeListener(EventName.VALIDATE_ITEMS, handleValidateItems);
        };
    }, [id, name, required, normalizedValidators, value, formValueRef.current]);

    useEffect(() => {
        if (StringUtil.isFalsyString(name)) return;

        let updated = false;
        const registered = typeof registerCondition === 'function' ? registerCondition(context) : true;
        const hidden = typeof hideCondition === 'function' ? hideCondition(context) : false;

        if (typeof hidden === 'boolean' && hiddenRef.current !== hidden) {
            updated = true;
            hiddenRef.current = hidden;
        }

        if (typeof registered === 'boolean' && registeredRef.current !== registered) {
            updated = true;
            registeredRef.current = registered;
            if (registered) {
                eventEmitter.emit(
                    EventName.REGISTER_ITEM,
                    id,
                    new EventMessage(EventName.REGISTER_ITEM, [name, defaultValue]),
                );
                setValue(defaultValue);
            } else {
                eventEmitter.emit(EventName.UNREGISTER_ITEM, id, new EventMessage(EventName.UNREGISTER_ITEM, name));
            }
        }

        if (updated) {
            update();
        }
    }, [hiddenRef.current, registeredRef.current, context, registerCondition, hideCondition, name, id]);

    if (!registeredRef.current) return null;

    return (
        <div
            {..._.omit(props, ['required', 'dangerColor', 'minWidth', 'maxWidth'])}
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
                {typeof label !== 'undefined' && (
                    <div {...labelProps} className={cx(classNames?.headerLabel, labelProps?.className)}>
                        {typeof label === 'function' ? label(context) : label}
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
                {children &&
                    React.cloneElement(children, {
                        value,
                        onChange: (value: any, ...others: any[]) => {
                            const outgoingValue = (() => {
                                let result: any;
                                if (
                                    (value as any)?._reactName === 'onChange' ||
                                    (value as React.BaseSyntheticEvent)?.target
                                ) {
                                    result = (value as React.BaseSyntheticEvent)?.target?.value;
                                } else {
                                    result = value;
                                }
                                return result;
                            })();
                            setValue(outgoingValue);
                            children?.props?.onChange?.(value, ...others);
                            eventEmitter.emit(
                                EventName.ITEMS_VALUE_CHANGE,
                                id,
                                new EventMessage(EventName.ITEMS_VALUE_CHANGE, { [name]: outgoingValue }),
                            );
                            const changeValidators = normalizedValidators.filter(
                                (validator) => validator?.validateOnChange !== false,
                            );

                            Promise.all(
                                changeValidators.map((validator) =>
                                    Promise.resolve(validator.validate(value, formValueRef.current)),
                                ),
                            )
                                .then((resultList) => {
                                    return resultList.filter((result) => !StringUtil.isFalsyString(result));
                                })
                                .then((result) => {
                                    if (!_.isEqual(errorMessagesRef.current, result)) {
                                        errorMessagesRef.current = result;
                                        update();
                                    }
                                });
                        },
                    })}
            </div>
            {typeof extra === 'function' ? extra(context) : extra}
            {(() => {
                if (
                    Array.isArray(context?.errorMessages) &&
                    context?.errorMessages?.length > 0 &&
                    errorWrapperProps !== false
                ) {
                    return (
                        <div
                            {...errorWrapperProps}
                            className={cx(classNames?.errorWrapper, errorWrapperProps?.className)}
                        >
                            {context?.errorMessages?.map((errorMessage, index) => (
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
        </div>
    );
};

export { Form };
