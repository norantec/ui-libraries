import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Form, FormItem, FormProvider, useForm, Validator } from './components/form';
import { ProviderFactory } from './components/provider-factory';
import { useEffect, useState } from 'react';
import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';

const App: React.FC = () => {
    const form = useForm();
    const [validators, setValidators] = useState<Validator[]>([]);

    useEffect(() => {
        console.log('LENCONDA:4', form?.getValues?.());
    }, [form]);

    return (
        <div>
            <Form
                form={form}
                onChange={(values, changedFields) => {
                    console.log('LENCONDA:4.1', values, changedFields);
                }}
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
                    <input placeholder="Input something..." />
                </FormItem>
                <FormItem label="Test2" name="test2" defaultValue="DEFAULT">
                    <input placeholder="Input something..." />
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
    <ProviderFactory providers={(creator) => [creator(FormProvider)]}>
        <App />
    </ProviderFactory>,
);
