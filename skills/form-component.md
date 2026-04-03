# Skill: Form Component

## Overview

The Form component system provides a powerful, headless form management solution for React applications. It uses an EventEmitter-based architecture for cross-component communication and supports complex validation, conditional field registration, dynamic field visibility, and programmatic form control via imperative handles.

**Key Features:**
- Event-driven state management (EventEmitter pattern)
- Async validation with support for multiple validators per field
- Conditional field registration (`registerCondition`)
- Dynamic field visibility (`hideCondition`)
- Imperative API for form control (`setValue`, `getValues`, `validate`, `resetValues`, `clearValues`)
- Support for custom empty values
- Required field validation with custom messages

---

## Components

### Form

The main container component that manages form state and provides the form instance API.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `action` | `string` | - | Form action URL |
| `method` | `'get' \| 'post'` | - | HTTP method for form submission |
| `disabled` | `boolean` | `false` | Disables all form items |
| `readOnly` | `boolean` | `false` | Makes all form items read-only |
| `dense` | `number` | `4` | Spacing density multiplier for layout |
| `dangerColor` | `string` | `'#FF0000'` | Color for error states and required indicators |
| `emptyValues` | `any[]` | `['', null, undefined]` | Values considered "empty" for validation |
| `sx` | `{ wrapper?: CSSObject }` | - | Emotion CSS object for styling |
| `onInstanceChange` | `(instance: FormInstance) => void` | - | Callback when form instance is ready |

#### Usage Example

```tsx
import { Form, FormItem, FormInstance } from '@open-norantec/ui-libraries';
import { useState } from 'react';

const MyForm = () => {
  const [form, setForm] = useState<FormInstance>();

  const handleSubmit = async () => {
    const result = await form?.validate();
    if (result?.errors) {
      console.log('Validation errors:', result.errors);
    } else {
      console.log('Form values:', result?.value);
    }
  };

  return (
    <>
      <Form onInstanceChange={setForm} dense={8} dangerColor="#ff4d4f">
        <FormItem name="username" label="Username" required="Username is required">
          {[Input, { placeholder: 'Enter username' }]}
        </FormItem>
        <FormItem name="email" label="Email" required>
          {[Input, { type: 'email' }]}
        </FormItem>
      </Form>
      <button onClick={handleSubmit}>Submit</button>
    </>
  );
};
```

#### Use Cases

- **Standard forms**: User registration, login, profile editing
- **Dynamic forms**: Forms where fields appear/disappear based on other field values
- **Multi-step forms**: Use `validate()` to validate current step before proceeding
- **Search forms**: Use `getValues()` to get current form state for API calls

---

### FormItem

Individual form field wrapper that handles value management, validation, and rendering.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | **Required** | Unique field identifier |
| `children` | `[React.FC<T>, T]` | - | Tuple of [Component, props] |
| `label` | `React.ReactNode \| ((context) => React.ReactNode)` | - | Field label, supports function for dynamic content |
| `defaultValue` | `any` | - | Initial value for the field |
| `required` | `boolean \| string \| ((value, formValues) => string)` | `false` | Required validation. `true` uses default message, string for custom message, function for dynamic validation |
| `validators` | `Validator[]` | `[]` | Array of custom validators |
| `disabled` | `boolean` | `false` | Disables this specific field |
| `readOnly` | `boolean` | `false` | Makes this field read-only |
| `emptyValues` | `any[]` | Inherits from Form | Values considered empty for this field |
| `registerCondition` | `(context: FormItemContext) => boolean` | - | Function to determine if field should be registered |
| `hideCondition` | `(context: FormItemContext) => boolean` | - | Function to determine if field should be hidden |
| `onChange` | `(oldValue, newValue, source, oldFormValues) => void` | - | Callback when field value changes |
| `extra` | `React.ReactNode \| ((context) => React.ReactNode)` | - | Extra content below the field |
| `errorWrapperProps` | `HTMLAttributes \| false` | - | Props for error container, `false` to hide errors |
| `errorMessageProps` | `HTMLAttributes` | - | Props for individual error messages |
| `sx` | See below | - | Emotion CSS objects for styling |

#### SX Styling Object

```typescript
{
  wrapper?: CSSObject;        // Outer container
  headerWrapper?: CSSObject;  // Label + controls row
  headerLabel?: CSSObject;    // Label element
  headerControls?: CSSObject; // Controls area (right side)
  elementWrapper?: CSSObject; // Input wrapper
  errorWrapper?: CSSObject;   // Errors container
  errorMessage?: CSSObject;   // Individual error row
  errorMessageContent?: CSSObject; // Error text
  errorMessageIcon?: CSSObject;    // Error icon
}
```

#### Children Tuple Pattern

FormItem uses a tuple pattern for maximum flexibility:

```tsx
// Basic usage
<FormItem name="username">
  {[Input, { placeholder: 'Enter username' }]}
</FormItem>

// With type parameters
<FormItem<string, InputProps> name="search">
  {[SearchInput, { allowClear: true, onSearch: handleSearch }]}
</FormItem>

// Dynamic props based on form state
<FormItem name="country">
  {[Select, { 
    options: countries,
    showSearch: true 
  }]}
</FormItem>
```

#### Usage Example

```tsx
<FormItem
  name="password"
  label="Password"
  required="Password is required"
  validators={[
    {
      validateOnChange: true,
      validate: (value) => {
        if (value?.length < 8) return 'Password must be at least 8 characters';
      }
    },
    {
      validateOnValidation: true,
      validate: async (value) => {
        // Async validation (e.g., check password strength API)
        const strength = await checkPasswordStrength(value);
        if (strength === 'weak') return 'Password is too weak';
      }
    }
  ]}
>
  {[PasswordInput, { type: 'password' }]}
</FormItem>
```

---

## Advanced Features

### registerCondition

Controls whether a field is "registered" (active) in the form. Unregistered fields:
- Don't appear in `getValues()` results
- Don't participate in validation
- Don't trigger `onChange` callbacks
- Are removed from the DOM

**When to use:** Show/hide fields based on other field values, conditional form sections.

```tsx
// Show "companyName" only when userType is "business"
<FormItem
  name="userType"
  defaultValue="personal"
>
  {[RadioGroup, { options: [
    { label: 'Personal', value: 'personal' },
    { label: 'Business', value: 'business' }
  ]}]}
</FormItem>

<FormItem
  name="companyName"
  label="Company Name"
  required="Company name is required for business accounts"
  registerCondition={({ values }) => values.userType === 'business'}
>
  {[Input, {}]}
</FormItem>

// When userType changes to "personal", companyName is automatically unregistered
```

**Context object:**
```typescript
{
  defaultValue: any,    // Field's default value
  value: any,           // Current field value
  values: FormValues    // All form values
}
```

### hideCondition

Controls field visibility without unregistering it. Hidden fields:
- Remain registered and participate in validation
- Maintain their values
- Are hidden with `display: none`

**When to use:** Progressive disclosure, multi-step forms where hidden fields should still be validated.

```tsx
// Multi-step form - Step 2 fields are hidden but validated
<FormItem
  name="step1Field"
  hideCondition={({ values }) => values.currentStep === 2}
>
  {[Input, {}]}
</FormItem>

<FormItem
  name="step2Field"
  hideCondition={({ values }) => values.currentStep === 1}
>
  {[Input, {}]}
</FormItem>

// Validate all steps before submission
const handleSubmit = async () => {
  const result = await form.validate(); // Validates both steps
  if (!result.errors) {
    console.log('All steps valid:', result.value);
  }
};
```

### Validators

Validators support both sync and async validation with fine-grained control.

```typescript
interface Validator {
  validateOnChange?: boolean;      // Run on value change (default: true)
  validateOnValidation?: boolean;  // Run on form.validate() (default: true)
  validate: (value: any, formValues: FormValues) => Promise<string> | string;
}
```

**Sync Validation:**
```tsx
<FormItem
  name="age"
  label="Age"
  validators={[
    {
      validate: (value) => {
        if (value < 18) return 'Must be 18 or older';
        if (value > 120) return 'Invalid age';
      }
    }
  ]}
>
  {[NumberInput, {}]}
</FormItem>
```

**Async Validation:**
```tsx
<FormItem
  name="username"
  label="Username"
  validators={[
    {
      validateOnChange: false,  // Don't check on every keystroke
      validateOnValidation: true,  // Only check on submit
      validate: async (value) => {
        const exists = await checkUsernameExists(value);
        if (exists) return 'Username already taken';
      }
    }
  ]}
>
  {[Input, {}]}
</FormItem>
```

**Cross-field Validation:**
```tsx
// Password confirmation
<FormItem
  name="password"
  label="Password"
>
  {[Input, { type: 'password' }]}
</FormItem>

<FormItem
  name="confirmPassword"
  label="Confirm Password"
  validators={[
    {
      validate: (value, formValues) => {
        if (value !== formValues.password) {
          return 'Passwords do not match';
        }
      }
    }
  ]}
>
  {[Input, { type: 'password' }]}
</FormItem>
```

### Required Validation

Three forms of required validation:

```tsx
// 1. Boolean - uses default message "It is a required field"
<FormItem name="email" required>
  {[Input, {}]}
</FormItem>

// 2. String - custom message
<FormItem name="email" required="Please enter your email address">
  {[Input, {}]}
</FormItem>

// 3. Function - dynamic validation with access to form values
<FormItem 
  name="businessLicense"
  required={(value, formValues) => {
    if (formValues.accountType === 'business' && !value) {
      return 'Business license is required for business accounts';
    }
  }}
>
  {[FileUpload, {}]}
</FormItem>
```

### onChange Callback

Triggered when field value changes with detailed context:

```typescript
onChange?: (
  oldValue: any,
  newValue: any,
  source: 'clear' | 'item' | 'register' | 'reset' | 'set',
  oldFormValues: FormValues
) => void;
```

**Source meanings:**
- `'item'`: User input/changed by the input component
- `'set'`: Changed via `form.setValue()` or `form.setValues()`
- `'clear'`: Cleared via `form.clearValues()`
- `'reset'`: Reset via `form.resetValues()`
- `'register'`: Set when field is first registered with default value

```tsx
<FormItem
  name="country"
  onChange={(oldValue, newValue, source, oldFormValues) => {
    console.log(`Country changed from ${oldValue} to ${newValue}`);
    console.log('Change source:', source);
    
    // Reset city when country changes
    if (source === 'item' && oldValue !== newValue) {
      form.clearValues(['city']);
    }
  }}
>
  {[Select, { options: countries }]}
</FormItem>
```

---

## FormInstance API

Accessed via `onInstanceChange` or imperative handles.

### Methods

#### getValue(name: string): any
Get a single field value.

```tsx
const username = form.getValue('username');
```

#### getValues(): FormValues
Get all registered field values.

```tsx
const values = form.getValues();
// { username: 'john', email: 'john@example.com' }
```

#### setValue(name: string, value: any): void
Set a single field value (async, executes next tick).

```tsx
form.setValue('username', 'john_doe');
```

#### setValues(values: FormValues): void
Set multiple field values at once.

```tsx
form.setValues({
  username: 'john_doe',
  email: 'john@example.com',
  country: 'US'
});
```

#### clearValues(names?: string[], clearValidationErrors?: boolean): void
Clear field values to `undefined`. If `clearValidationErrors` is true (default), also clears validation errors.

```tsx
// Clear specific fields
form.clearValues(['password', 'confirmPassword']);

// Clear all fields
form.clearValues();

// Clear without removing validation errors
form.clearValues(['field'], false);
```

#### resetValues(names?: string[], clearValidationErrors?: boolean): void
Reset fields to their `defaultValue`. If `clearValidationErrors` is true (default), clears validation errors.

```tsx
// Reset specific fields
form.resetValues(['username', 'email']);

// Reset all fields
form.resetValues();
```

#### validate(names?: string[]): Promise<FormValidateResult>
Validate fields and return results.

```tsx
// Validate all fields
const result = await form.validate();

// Validate specific fields
const result = await form.validate(['email', 'password']);

// Result structure
{
  errors: {
    email: ['Invalid email format'],
    password: ['Password is required']
  },
  value: null  // null if there are errors
}

// Success case
{
  errors: null,
  value: {
    email: 'user@example.com',
    password: 'secret123'
  }
}
```

---

## Complete Examples

### User Registration Form

```tsx
import { Form, FormItem, FormInstance } from '@open-norantec/ui-libraries';
import { useState } from 'react';

const RegistrationForm = () => {
  const [form, setForm] = useState<FormInstance>();
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');

  const handleSubmit = async () => {
    const result = await form?.validate();
    if (!result?.errors) {
      await api.register(result.value);
    }
  };

  return (
    <>
      <Form onInstanceChange={setForm}>
        <FormItem name="accountType" defaultValue="personal">
          {[RadioGroup, { 
            options: [
              { label: 'Personal', value: 'personal' },
              { label: 'Business', value: 'business' }
            ],
            onChange: setAccountType
          }]}
        </FormItem>

        <FormItem name="fullName" label="Full Name" required>
          {[Input, {}]}
        </FormItem>

        <FormItem 
          name="email" 
          label="Email" 
          required="Email is required"
          validators={[
            {
              validate: (value) => {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                  return 'Invalid email format';
                }
              }
            }
          ]}
        >
          {[Input, { type: 'email' }]}
        </FormItem>

        <FormItem
          name="companyName"
          label="Company Name"
          required={(value, values) => 
            values.accountType === 'business' && !value 
              ? 'Company name is required for business accounts' 
              : undefined
          }
          registerCondition={({ values }) => values.accountType === 'business'}
        >
          {[Input, {}]}
        </FormItem>

        <FormItem
          name="taxId"
          label="Tax ID"
          registerCondition={({ values }) => values.accountType === 'business'}
          validators={[
            {
              validateOnValidation: true,
              validate: async (value, values) => {
                if (values.accountType !== 'business') return;
                const valid = await validateTaxId(value);
                if (!valid) return 'Invalid Tax ID';
              }
            }
          ]}
        >
          {[Input, {}]}
        </FormItem>

        <FormItem
          name="password"
          label="Password"
          required
          validators={[
            {
              validate: (value) => {
                if (value?.length < 8) return 'At least 8 characters';
                if (!/[A-Z]/.test(value)) return 'At least one uppercase letter';
                if (!/[0-9]/.test(value)) return 'At least one number';
              }
            }
          ]}
        >
          {[Input, { type: 'password' }]}
        </FormItem>

        <FormItem
          name="confirmPassword"
          label="Confirm Password"
          required
          validators={[
            {
              validate: (value, values) => {
                if (value !== values.password) return 'Passwords do not match';
              }
            }
          ]}
        >
          {[Input, { type: 'password' }]}
        </FormItem>
      </Form>

      <button onClick={handleSubmit}>Register</button>
      <button onClick={() => form?.resetValues()}>Reset</button>
    </>
  );
};
```

### Multi-step Form

```tsx
const MultiStepForm = () => {
  const [form, setForm] = useState<FormInstance>();
  const [step, setStep] = useState(1);

  const nextStep = async () => {
    const fields = step === 1 
      ? ['firstName', 'lastName', 'email']
      : ['address', 'city', 'country'];
    
    const result = await form?.validate(fields);
    if (!result?.errors) {
      setStep(step + 1);
    }
  };

  return (
    <Form onInstanceChange={setForm}>
      {/* Step 1: Personal Info */}
      <div style={{ display: step === 1 ? 'block' : 'none' }}>
        <FormItem name="firstName" label="First Name" required>
          {[Input, {}]}
        </FormItem>
        <FormItem name="lastName" label="Last Name" required>
          {[Input, {}]}
        </FormItem>
        <FormItem name="email" label="Email" required>
          {[Input, { type: 'email' }]}
        </FormItem>
      </div>

      {/* Step 2: Address */}
      <div style={{ display: step === 2 ? 'block' : 'none' }}>
        <FormItem name="address" label="Address" required>
          {[Input, {}]}
        </FormItem>
        <FormItem name="city" label="City" required>
          {[Input, {}]}
        </FormItem>
        <FormItem name="country" label="Country" required>
          {[Select, { options: countries }]}
        </FormItem>
      </div>

      {/* Step 3: Review (read-only) */}
      <div style={{ display: step === 3 ? 'block' : 'none' }}>
        <ReviewStep form={form} />
      </div>
    </Form>
  );
};
```

### Dynamic Array Fields

```tsx
const DynamicArrayForm = () => {
  const [form, setForm] = useState<FormInstance>();
  const [items, setItems] = useState([{ id: 1 }]);

  const addItem = () => {
    setItems([...items, { id: Date.now() }]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
    form?.clearValues([`item_${id}_name`, `item_${id}_quantity`]);
  };

  return (
    <Form onInstanceChange={setForm}>
      {items.map((item, index) => (
        <div key={item.id}>
          <FormItem 
            name={`item_${item.id}_name`} 
            label={`Item ${index + 1} Name`}
            required
          >
            {[Input, {}]}
          </FormItem>
          <FormItem 
            name={`item_${item.id}_quantity`} 
            label="Quantity"
            required
            validators={[
              {
                validate: (value) => {
                  if (value < 1) return 'Quantity must be at least 1';
                }
              }
            ]}
          >
            {[NumberInput, { min: 1 }]}
          </FormItem>
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}
      <button onClick={addItem}>Add Item</button>
    </Form>
  );
};
```

---

## Best Practices

1. **Always use `registerCondition` for conditional fields** that should be excluded from validation and form values, rather than just hiding them.

2. **Use `hideCondition`** when you need fields to remain registered but hidden (e.g., multi-step forms where all steps should be validated together).

3. **Set `validateOnChange: false`** for expensive validations (like API calls) to avoid triggering them on every keystroke.

4. **Use `onChange` with source checking** when you need to respond to specific types of value changes:
   ```tsx
   onChange={(oldVal, newVal, source) => {
     if (source === 'item') {
       // Only respond to user input, not programmatic changes
     }
   }}
   ```

5. **Provide `defaultValue`** for all fields to ensure proper reset behavior.

6. **Use Form Provider preset props** for consistent styling across all forms in your app:
   ```tsx
   <FormItemProvider presetProps={() => ({
     sx: {
       wrapper: { marginBottom: 16 },
       headerLabel: { fontWeight: 500 }
     }
   })}>
   ```
