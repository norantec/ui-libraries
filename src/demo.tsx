import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Form, FormItem, FormProvider, useForm } from './components/form';
import { ProviderFactory } from './components/provider-factory';
import { useEffect } from 'react';

const App: React.FC = () => {
    const form = useForm();

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
                <FormItem label="Test1" name="test1" required="必填项">
                    <input placeholder="Input something..." />
                </FormItem>
                <FormItem
                    label="Test2"
                    name="test2"
                    defaultValue="DEFAULT"
                    required="必填项"
                    validators={[
                        (value) => {
                            console.log('LENCONDA:FUCK:0', value);
                            if (value?.length > 10) return 'LENGTH <= 10';
                            return;
                        },
                    ]}
                >
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
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <ProviderFactory providers={(creator) => [creator(FormProvider)]}>
        <App />
    </ProviderFactory>,
);
