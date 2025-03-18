import * as React from 'react';
import { useEffect } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Form, useForm, registerTemplate, FormProvider } from './components/form';
import { ProviderFactory } from './components/provider-factory';

registerTemplate('demo', () => {
    return [
        {
            label: 'test1',
            name: 'test1',
            required: '必填项',
            children: () => {
                return <input placeholder="Input something..." />;
            },
        },
        {
            label: 'test2',
            name: 'test2',
            required: true,
            children: () => {
                return <input placeholder="Input something..." />;
            },
        },
    ];
});

const App: React.FC = () => {
    const formInstance = useForm();

    useEffect(() => {
        console.log('LENCONDA:formInstance:', formInstance?.getValues?.());
    }, [formInstance]);

    return (
        <div>
            <Form
                instance={formInstance}
                defaultValues={{
                    test2: 'asd',
                }}
            >
                {({ getPartialTemplate, render }) => render(getPartialTemplate('demo'))}
            </Form>
            <button
                onClick={() => {
                    formInstance?.submit?.()?.then((values) => {
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
    <ProviderFactory
        providers={(creator) => [
            creator(FormProvider, {
                presetProps: () => ({
                    sx: {
                        wrapper: {
                            fontSize: 15,
                        },
                    },
                }),
            }),
        ]}
    >
        <App />
    </ProviderFactory>,
    // <FormProvider>
    // </FormProvider>,
);
