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

const shallowObjectCompare = (object1: object, object2: object): string[] => {
    if (object1 === object2) return [];

    const object1Keys = Object.keys(_.isObject(object1) ? object1 : {});
    const object2Keys = Object.keys(_.isObject(object2) ? object2 : {});
    const xorKeys = _.xor(object1Keys, object2Keys);
    const intersectedKeys = _.intersection(object1Keys, object2Keys);

    if (xorKeys.length === 0 && intersectedKeys.length === 0) return [];

    return intersectedKeys
        .filter((intersectedKey) => {
            return object1[intersectedKey] !== object2[intersectedKey];
        })
        .concat(xorKeys);
};

interface FormConfig {
    registeredFields: Set<string>;
    previousValue: FormValue;
}

const eventEmitter = new EventEmitter();
// <formId, <fieldName, value>
const formItemsMap = new Map<string, FormConfig>();

const getRegisteredFieldNames = (id: string, inputNames?: string[]) => {
    if (StringUtil.isFalsyString(id)) return [];
    return Array.isArray(inputNames)
        ? inputNames.filter((inputName) => formItemsMap.get(id)?.registeredFields?.has?.(inputName))
        : Array.from(formItemsMap.get(id)?.registeredFields ?? []);
};

const getFormValue = async (id: string): Promise<FormValue> => {
    return await new Promise((resolve) => {
        const registeredFieldNames = getRegisteredFieldNames(id);
        const requestId = UUIDUtil.generateV4();
        const resultMap = new Map<string, any>();
        const handleGetItemValueResponse = (
            currentId: string,
            eventMessage: EventMessage<EventName.GET_ITEM_VALUE_RESPONSE>,
        ) => {
            if (
                id !== currentId ||
                eventMessage?.data?.[0] !== requestId ||
                StringUtil.isFalsyString(eventMessage?.data?.[1]) ||
                !registeredFieldNames.includes(eventMessage?.data?.[1])
            ) {
                return;
            }
            resultMap.set(eventMessage.data[1], eventMessage.data[2]);
            if (resultMap.size === registeredFieldNames.length) {
                eventEmitter.removeListener(EventName.GET_ITEM_VALUE_RESPONSE, handleGetItemValueResponse);
                resolve(
                    Object.fromEntries(
                        Array.from(resultMap.entries()).filter(([, value]) => typeof value !== 'undefined'),
                    ),
                );
            }
        };
        eventEmitter.addListener(EventName.GET_ITEM_VALUE_RESPONSE, handleGetItemValueResponse);
        setTimeout(() => {
            eventEmitter.emit(EventName.GET_ITEMS_VALUE, id, new EventMessage(EventName.GET_ITEMS_VALUE, requestId));
        }, 0);
    });
};

enum EventName {
    CLEAR_ITEMS_VALUE = 'CLEAR_ITEMS_VALUE',
    FORM_VALUE_CHANGE = 'FORM_VALUE_CHANGE',
    GET_ITEM_VALUE_RESPONSE = 'GET_ITEM_VALUE_RESPONSE',
    GET_ITEMS_VALUE = 'GET_ITEMS_VALUE',
    ITEMS_VALUE_CHANGE = 'ITEMS_VALUE_CHANGE',
    RESET_ITEMS_VALUE = 'RESET_ITEMS_VALUE',
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
    [EventName.CLEAR_ITEMS_VALUE]: string[];
    [EventName.FORM_VALUE_CHANGE]: [FormValue, string[]];
    [EventName.RESET_ITEMS_VALUE]: string[];
    [EventName.SET_ITEMS_VALUE]: FormValue;
    [EventName.UNREGISTER_ITEM]: string;
    [EventName.ITEMS_VALUE_CHANGE]: null;
    [EventName.VALIDATE_ITEMS]: [string, string[]];
    [EventName.VALIDATE_ITEM_RESULT]: [string, string, string[]];
    [EventName.GET_ITEMS_VALUE]: string;
    // requestId, fieldName, value
    [EventName.GET_ITEM_VALUE_RESPONSE]: [string, string, any];
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
        const names = getRegisteredFieldNames(this.id, inputNames);
        eventEmitter.emit(EventName.CLEAR_ITEMS_VALUE, this.id, new EventMessage(EventName.CLEAR_ITEMS_VALUE, names));
    }

    public resetValues(inputNames?: string[]) {
        const names = getRegisteredFieldNames(this.id, inputNames);
        eventEmitter.emit(EventName.RESET_ITEMS_VALUE, this.id, new EventMessage(EventName.RESET_ITEMS_VALUE, names));
    }

    public setValue(name: string, value: any) {
        if (StringUtil.isFalsyString(name)) return;
        eventEmitter.emit(
            EventName.SET_ITEMS_VALUE,
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

    public async validate(inputNames?: string[]) {
        const names = getRegisteredFieldNames(this.id, inputNames);
        const value = await getFormValue(this.id);
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
                        value,
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
    action?: string;
    form?: FormInstance;
    method?: 'get' | 'post';
    children?: JSX.Element | JSX.Element[];
    disabled?: boolean;
    readOnly?: boolean;
    sx?: {
        wrapper?: CSSObject;
    };
    value?: FormValue;
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

const Form: React.ForwardRefExoticComponent<FormProps & React.RefAttributes<HTMLFormElement>> & {
    Item: React.FC<FormItemProps>;
} = React.forwardRef<HTMLFormElement, FormProps>(function (inputProps, outerRef) {
    const { sx, form, children, action, method, value, onChange, ...props } = useFormComponentConfig(inputProps);
    const classNames = useFormClassNames(sx);
    const idRef = useRef<string>(getDefinedPropertyValue(form, 'id') ?? UUIDUtil.generateV4());
    const innerRef = useRef<HTMLFormElement>(null);
    const update = useUpdate();
    const handleChange = React.useCallback(async () => {
        if (StringUtil.isFalsyString(idRef.current)) return;
        const currentFormValue = await getFormValue(idRef.current);
        const changedFields = shallowObjectCompare(formItemsMap.get(idRef.current)?.previousValue, currentFormValue);
        if (changedFields.length === 0) return;
        formItemsMap.get(idRef.current).previousValue = currentFormValue;
        onChange?.(currentFormValue, changedFields);
        if (!StringUtil.isFalsyString(idRef.current)) {
            setTimeout(() => {
                eventEmitter.emit(
                    EventName.FORM_VALUE_CHANGE,
                    idRef.current,
                    new EventMessage(EventName.FORM_VALUE_CHANGE, [currentFormValue, changedFields]),
                );
            }, 0);
        }
    }, [onChange, idRef.current]);

    React.useImperativeHandle(outerRef, () => innerRef.current);

    usePreviousValueEffect(
        () => {
            const currentFormId = getDefinedPropertyValue(form, 'id');
            if (StringUtil.isFalsyString(currentFormId)) return;
            idRef.current = currentFormId;
            formItemsMap.set(currentFormId, {
                registeredFields: new Set(),
                previousValue: {},
            });
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

        const handleUnregisterItem = (id: string, eventMessage: EventMessage<EventName.UNREGISTER_ITEM>) => {
            if (id !== idRef.current || StringUtil.isFalsyString(eventMessage?.data)) return;
            formItemsMap.get(id)?.registeredFields?.delete?.(eventMessage.data);
            // handleChange();
        };

        const handleItemsValueChange = async (id: string) => {
            if (id !== idRef.current) return;
            handleChange();
        };

        eventEmitter.addListener(EventName.UNREGISTER_ITEM, handleUnregisterItem);
        eventEmitter.addListener(EventName.ITEMS_VALUE_CHANGE, handleItemsValueChange);

        return () => {
            eventEmitter.removeListener(EventName.UNREGISTER_ITEM, handleUnregisterItem);
            eventEmitter.removeListener(EventName.ITEMS_VALUE_CHANGE, handleItemsValueChange);
        };
    }, [idRef.current, handleChange]);

    useEffect(() => {
        if (StringUtil.isFalsyString(idRef.current) || typeof value === 'undefined') return;
        setTimeout(() => {
            if (value === null) {
                eventEmitter.emit(
                    EventName.CLEAR_ITEMS_VALUE,
                    idRef.current,
                    new EventMessage(EventName.CLEAR_ITEMS_VALUE, getRegisteredFieldNames(idRef.current)),
                );
            } else {
                eventEmitter.emit(
                    EventName.SET_ITEMS_VALUE,
                    idRef.current,
                    new EventMessage(EventName.SET_ITEMS_VALUE, value),
                );
            }
        }, 0);
    }, [value, idRef.current]);

    if (StringUtil.isFalsyString(idRef.current) || !children) return <></>;

    return (
        <form
            {..._.omit(props, ['dangerColor'])}
            action={action}
            method={method}
            ref={innerRef}
            className={cx(classNames?.wrapper, props?.className)}
        >
            <IDContext.Provider value={idRef.current}>{children}</IDContext.Provider>
        </form>
    );
}) as React.ForwardRefExoticComponent<FormProps & React.RefAttributes<HTMLFormElement>> & {
    Item: React.FC<FormItemProps>;
};

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
    required?: boolean | string | ((value: any, formValue: FormValue) => string);
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
    onChange?: (oldValue: any, newValue: any, source: 'clear' | 'item' | 'reset' | 'set') => void;
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
        onChange,
        ...props
    } = useFormItemComponentConfig(inputProps);
    const id = React.useContext(IDContext);
    const classNames = useFormItemClassNames(sx);
    const formValueRef = useRef<FormValue>({});
    const [errorMessages, setErrorMessages] = React.useState<string[]>([]);
    const valueRef = React.useRef<any>(undefined);
    const context = React.useMemo<FormItemContext>(() => {
        return {
            value: valueRef.current,
            defaultValue,
            values: formValueRef.current,
            errorMessages,
        };
    }, [defaultValue, valueRef.current, errorMessages, formValueRef.current]);
    const registeredRef = useRef(false);
    const hiddenRef = useRef(false);
    const update = useUpdate();
    const normalizedValidators = Array.isArray(validators)
        ? validators.filter((validator) => typeof validator?.validate === 'function')
        : [];

    if (required === true || !StringUtil.isFalsyString(required) || typeof required === 'function') {
        normalizedValidators.unshift({
            validateOnChange: true,
            validateOnValidation: true,
            validate: (value, formValue) => {
                if (typeof required === 'function') {
                    return required(value, formValue);
                } else if (typeof value === 'undefined' || (typeof value === 'string' && value.length === 0)) {
                    return !StringUtil.isFalsyString(required) ? (required as string) : 'It is a required field';
                }
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

    usePreviousValueEffect(
        () => {
            setTimeout(() => {
                eventEmitter.emit(
                    EventName.ITEMS_VALUE_CHANGE,
                    id,
                    new EventMessage(EventName.ITEMS_VALUE_CHANGE, null),
                );
            }, 0);
        },
        [valueRef.current, registeredRef.current, id],
        (previousValue: [any, boolean]) => {
            return valueRef.current === previousValue?.[0] && registeredRef.current === previousValue?.[1]
                ? undefined
                : ([valueRef.current, registeredRef.current] as [any, boolean]);
        },
    );

    useEffect(() => {
        const handleSetItemValue = (currentId: string, eventMessage: EventMessage<EventName.SET_ITEMS_VALUE>) => {
            if (
                id !== currentId ||
                StringUtil.isFalsyString(name) ||
                !Object.keys(eventMessage.data ?? {}).includes(name)
            ) {
                return;
            }
            onChange?.(valueRef.current, eventMessage?.data?.[name], 'set');
            valueRef.current = eventMessage?.data?.[name];
            update();
        };

        const handleResetItemValue = (currentId: string, eventMessage: EventMessage<EventName.RESET_ITEMS_VALUE>) => {
            if (id !== currentId || StringUtil.isFalsyString(name) || !(eventMessage.data ?? []).includes(name)) {
                return;
            }
            onChange?.(valueRef.current, defaultValue, 'reset');
            valueRef.current = defaultValue;
            update();
        };

        const handleClearItemValue = (currentId: string, eventMessage: EventMessage<EventName.CLEAR_ITEMS_VALUE>) => {
            if (id !== currentId || StringUtil.isFalsyString(name) || !(eventMessage.data ?? []).includes(name)) {
                return;
            }
            onChange?.(valueRef.current, undefined, 'clear');
            valueRef.current = undefined;
            update();
        };

        eventEmitter.addListener(EventName.SET_ITEMS_VALUE, handleSetItemValue);
        eventEmitter.addListener(EventName.RESET_ITEMS_VALUE, handleResetItemValue);
        eventEmitter.addListener(EventName.CLEAR_ITEMS_VALUE, handleClearItemValue);

        return () => {
            eventEmitter.removeListener(EventName.SET_ITEMS_VALUE, handleSetItemValue);
            eventEmitter.removeListener(EventName.RESET_ITEMS_VALUE, handleResetItemValue);
            eventEmitter.removeListener(EventName.CLEAR_ITEMS_VALUE, handleClearItemValue);
        };
    }, [id, defaultValue, name, onChange]);

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
                submitValidators.map((validator) =>
                    Promise.resolve(validator.validate(valueRef.current, formValueRef.current)),
                ),
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
                    if (!_.isEqual(errorMessages, result)) {
                        setErrorMessages(result);
                    }
                });
        };

        eventEmitter.addListener(EventName.VALIDATE_ITEMS, handleValidateItems);

        return () => {
            eventEmitter.removeListener(EventName.VALIDATE_ITEMS, handleValidateItems);
        };
    }, [id, name, required, normalizedValidators, errorMessages, valueRef.current, formValueRef.current]);

    useEffect(() => {
        const handleGetItemsValue = (currentId: string, eventMessage: EventMessage<EventName.GET_ITEMS_VALUE>) => {
            if (id !== currentId || StringUtil.isFalsyString(eventMessage?.data)) return;
            eventEmitter.emit(
                EventName.GET_ITEM_VALUE_RESPONSE,
                id,
                new EventMessage(EventName.GET_ITEM_VALUE_RESPONSE, [eventMessage.data, name, valueRef.current]),
            );
        };
        eventEmitter.addListener(EventName.GET_ITEMS_VALUE, handleGetItemsValue);
        return () => {
            eventEmitter.removeListener(EventName.GET_ITEMS_VALUE, handleGetItemsValue);
        };
    }, [valueRef.current, id, name]);

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
                if (!formItemsMap.has(id)) {
                    formItemsMap.set(id, {
                        registeredFields: new Set(),
                        previousValue: {},
                    });
                }
                formItemsMap.get(id).registeredFields.add(name);
                if (typeof valueRef.current === 'undefined') {
                    valueRef.current = defaultValue;
                }
            } else {
                eventEmitter.emit(EventName.UNREGISTER_ITEM, id, new EventMessage(EventName.UNREGISTER_ITEM, name));
            }
        }

        if (updated) {
            update();
        }
    }, [
        hiddenRef.current,
        registeredRef.current,
        valueRef.current,
        context,
        registerCondition,
        hideCondition,
        name,
        id,
    ]);

    useEffect(() => {
        const changeValidators = normalizedValidators.filter((validator) => validator?.validateOnChange !== false);

        Promise.all(
            changeValidators.map((validator) =>
                Promise.resolve(validator.validate(valueRef.current, formValueRef.current)),
            ),
        )
            .then((resultList) => {
                return resultList.filter((result) => !StringUtil.isFalsyString(result));
            })
            .then((result) => {
                if (!_.isEqual(errorMessages, result)) {
                    setErrorMessages(result);
                }
            });
    }, [valueRef.current]);

    if (!registeredRef.current || !children) return <></>;

    return (
        <div
            data-form-item-name={name}
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
                        value: valueRef.current,
                        name,
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
                            onChange?.(valueRef.current, outgoingValue, 'item');
                            valueRef.current = outgoingValue;
                            update();
                            children?.props?.onChange?.(value, ...others);
                        },
                    })}
            </div>
            {typeof extra !== 'undefined' && (typeof extra === 'function' ? extra(context) : extra)}
            {(() => {
                if (Array.isArray(errorMessages) && errorMessages?.length > 0 && errorWrapperProps !== false) {
                    return (
                        <div
                            {...errorWrapperProps}
                            className={cx(classNames?.errorWrapper, errorWrapperProps?.className)}
                        >
                            {errorMessages?.map((errorMessage, index) => (
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
                return <></>;
            })()}
        </div>
    );
};

export { Form };
