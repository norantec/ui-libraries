import React from 'react';
import ReactDOM from 'react-dom/client';
import { Form, FormItem } from './components/form';

Form.registerTemplate('demo', () => {
    return [
        {
            label: 'test1',
            name: 'test1',
            children: () => {
                return <input placeholder="Input something..." />;
            },
        },
    ];
});

const App: React.FC = () => {
    return (
        <div>
            <Form>
                {({ getPartialTemplate }) => getPartialTemplate('demo')?.map?.((props) => <FormItem {...props} />)}
            </Form>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
