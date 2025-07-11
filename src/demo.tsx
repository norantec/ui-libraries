import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
// import { Form, FormItemProvider, FormProvider, useForm, Validator } from './components/form/ng';
import { Form, FormInstance, FormItem, FormItemProvider, FormProvider, Validator } from './components/form';
import { ProviderFactory } from './components/provider-factory';
import { useEffect, useState } from 'react';
import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';

interface InputProps extends Omit<React.HTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: string;
    placeholder?: string;
    onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ value, onChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(undefined);

    React.useImperativeHandle(ref, () => innerRef.current);

    useEffect(() => {
        if (!(innerRef.current instanceof HTMLInputElement)) return;
        innerRef.current.value = StringUtil.isFalsyString(value) ? '' : value;
    }, [value, innerRef.current]);

    return (
        <input
            {...props}
            ref={innerRef}
            onChange={(event) => {
                onChange?.(StringUtil.isFalsyString(event?.target?.value) ? undefined : event.target.value, event);
            }}
        />
    );
});

const App: React.FC = () => {
    // const form = useForm();
    const [form, setForm] = useState<FormInstance>();
    const [validators, setValidators] = useState<Validator[]>([]);

    useEffect(() => {
        console.log('LENCONDA:4', form?.getValues?.());
    }, [form]);

    return (
        <div>
            <Form
                // form={form}
                // onChange={(values, changedFields) => {
                //     console.log('LENCONDA:4.1', values, changedFields);
                // }}
                onInstanceChange={setForm}
            >
                <FormItem
                    label="Test1"
                    name="test1"
                    required="必填项"
                    validators={[
                        {
                            validate: (value) => (StringUtil.isFalsyString(value) ? '请输入合法字符串' : undefined),
                        },
                        ...validators,
                    ]}
                >
                    {[Input, { placeholder: 'Input something...' }]}
                </FormItem>
                <FormItem
                    label="Test2"
                    name="test2"
                    defaultValue="DEFAULT"
                    registerCondition={(context) => {
                        const result = !StringUtil.isFalsyString(context?.values?.test1);
                        return result;
                    }}
                    onChange={(o, n, source) => {
                        if (source === 'item') {
                            console.log('LENCONDA:FUCK');
                            form.resetValues(['test3']);
                        }
                    }}
                >
                    {[Input, { placeholder: 'Input something...' }]}
                </FormItem>
                <FormItem
                    label="Test3"
                    name="test3"
                    defaultValue="DEFAULT3"
                    registerCondition={(context) => {
                        const result = !StringUtil.isFalsyString(context?.values?.test1);
                        return result;
                    }}
                    onChange={() => {
                        form.clearValues(['test4']);
                    }}
                >
                    {[Input, { placeholder: 'Input something...' }]}
                </FormItem>
                <FormItem
                    label="Test4"
                    name="test4"
                    registerCondition={(context) => {
                        const result = !StringUtil.isFalsyString(context?.values?.test1);
                        return result;
                    }}
                >
                    {[Input, { placeholder: 'Input something...' }]}
                </FormItem>
            </Form>
            <button
                onClick={() => {
                    form?.validate?.()?.then((values) => {
                        console.log('LENCONDA:DEMO:values', values);
                    });
                }}
            >
                Submit
            </button>
            <button
                onClick={() => {
                    form?.setValues?.({
                        test1: '123908',
                        test2: '123909',
                    });
                }}
            >
                Set Values
            </button>
            <button
                onClick={() => {
                    form?.resetValues?.();
                }}
            >
                Reset Values
            </button>
            <button
                onClick={() => {
                    form?.clearValues?.(['test1', 'test2']);
                }}
            >
                Clear Values
            </button>
            <button
                onClick={() => {
                    setValidators([
                        {
                            validate: (value) => (!(value?.length > 10) ? '不少于10个字符' : ''),
                        },
                    ]);
                }}
            >
                Add validator
            </button>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <ProviderFactory
        providers={(creator) => [
            creator(FormProvider),
            creator(FormItemProvider, {
                presetProps: () => {
                    return {
                        sx: {
                            wrapper: {
                                marginBottom: 8,
                            },
                        },
                    };
                },
            }),
        ]}
    >
        <App />
    </ProviderFactory>,
);
