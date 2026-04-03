# AI Skills for @open-norantec/ui-libraries

This document serves as the central index for AI skills related to the `@open-norantec/ui-libraries` React component library.

## Overview

This is a headless React UI component library providing:

- **Form System**: Event-driven form management with async validation, conditional fields, and programmatic control
- **Scrollable**: High-performance custom scrollbar with RTL support
- **AutoHide**: Edge-docking panels with preview/active states
- **Provider System**: Theme-aware configuration and styling architecture
- **Hooks & Utilities**: Color scheme, direction detection, i18n, and promise tracking

## Skill References

### Core Components

| Skill | Description | Key Topics |
|-------|-------------|------------|
| [Form Component](./skills/form-component.md) | Event-driven form management system | `registerCondition`, `hideCondition`, `validators`, `FormInstance`, `onChange` |
| [Scrollable Component](./skills/scrollable-component.md) | Custom scrollbar with fixed-position tracks | `trackerOffset`, `autoHide`, RTL support, drag interaction |
| [AutoHide Component](./skills/autohide-component.md) | Edge-docking panels with auto-hide behavior | `stickTo`, `previewSize`, imperative API, `closeEvents` |

### Architecture & Utilities

| Skill | Description | Key Topics |
|-------|-------------|------------|
| [Provider System](./skills/provider-system.md) | Component configuration and theming architecture | `ComponentProviderUtil`, `ProviderFactory`, `sx` prop, prop merging |
| [Hooks and Utilities](./skills/hooks-and-utilities.md) | Custom hooks and utility classes | `useColorScheme`, `useDirection`, `usePromise`, `I18nUtil` |

## Quick Reference

### Form Component

```tsx
import { Form, FormItem, FormInstance } from '@open-norantec/ui-libraries';

// Basic form with validation
<Form onInstanceChange={setForm}>
  <FormItem
    name="email"
    label="Email"
    required="Email is required"
    validators={[{
      validate: (value) => !value?.includes('@') ? 'Invalid email' : undefined
    }]}
  >
    {[Input, { type: 'email' }]}
  </FormItem>
</Form>
```

### Scrollable

```tsx
import { Scrollable } from '@open-norantec/ui-libraries';

<Scrollable
  autoHide={true}
  trackerOffset={[48, 0, 0, 0]}
  style={{ maxHeight: '400px' }}
>
  {content}
</Scrollable>
```

### AutoHide

```tsx
import { AutoHide, AutoHideRef } from '@open-norantec/ui-libraries';

const ref = useRef<AutoHideRef>(null);

<AutoHide
  ref={ref}
  stickTo="right"
  previewSize={32}
>
  <PanelContent />
</AutoHide>

// Programmatic control
ref.current?.active();
ref.current?.deactive();
```

### Provider Setup

```tsx
import { ProviderFactory } from '@open-norantec/ui-libraries';

<ProviderFactory
  providers={(creator) => [
    creator(FormProvider),
    creator(ScrollableProvider),
    creator(AutoHideProvider)
  ]}
>
  <App />
</ProviderFactory>
```

## Component Patterns

### Children Tuple Pattern

FormItem and similar components use a `[Component, props]` tuple:

```tsx
<FormItem name="username">
  {[Input, { placeholder: 'Enter username' }]}
</FormItem>
```

### SX Styling Pattern

All components support Emotion CSS objects via the `sx` prop:

```tsx
<FormItem
  sx={{
    wrapper: { marginBottom: 16 },
    headerLabel: { fontWeight: 600 }
  }}
>
  {[Input, {}]}
</FormItem>
```

### Imperative API Pattern

Components exposing imperative methods use `useRef`:

```tsx
const formRef = useRef<FormInstance>();

<Form ref={formRef}>
  {/* fields */}
</Form>

// Later
formRef.current?.validate();
formRef.current?.setValues({ field: 'value' });
```

## Key Concepts

### Event-Driven Architecture (Form)

The Form component uses EventEmitter for internal communication:
- Form and FormItems communicate via events
- This enables conditional registration and dynamic behavior
- Events: `VALUE_CHANGE`, `REGISTRATION_STATUS_CHANGE`, `REQUEST_VALIDATION_ERRORS`

### Prop Merging Layers

ComponentProviderUtil merges props in order:
1. `defaultProps()` - Theme-aware defaults
2. `presetProps()` - App-wide configuration
3. `preInputMerger()` - Computed styles
4. `inputProps` - User's props
5. `postInputMerger()` - Constraints

### State Management (AutoHide)

Three states with automatic transitions:
- `hidden` → `previewing` (mouse enters boundary)
- `previewing` → `actived` (stays in boundary)
- `actived` → `hidden` (mouse leaves or close event)

## Dependencies

Key dependencies to be aware of:

- `@emotion/css` / `@emotion/react` - CSS-in-JS styling
- `eventemitter3` - Event emitter for Form
- `ahooks` - Utility hooks (`useUpdate`)
- `lodash` - Deep merging and utilities
- `mustache` - Template processing for CSS class names
- `handlebars` - I18n templating
- `@open-norantec/utilities` - External utility library

## File Organization

```
src/
├── components/
│   ├── form/index.tsx           # Form and FormItem
│   ├── scrollable/index.tsx     # Scrollable component
│   ├── auto-hide/index.tsx      # AutoHide component
│   ├── provider-factory/        # Provider composition
│   └── form-item-formatter/     # Value transformation
├── hooks/
│   ├── use-color-scheme/        # Dark/light mode detection
│   ├── use-direction/           # LTR/RTL detection
│   ├── use-match-media/         # Media query hook
│   ├── use-previous-value-effect/ # Previous value access
│   ├── use-promise/             # Async promise tracking
│   └── use-text/                # Placeholder hook
├── utilities/
│   ├── component-provider-util.class.tsx  # Provider factory
│   └── i18n-util.class.tsx      # Internationalization
└── demo.tsx                     # Interactive playground
```

## Common Tasks

### Adding a New Field Type to Form

1. Create the input component
2. Wrap in FormItem with proper `name`
3. Handle `value` and `onChange` props
4. Add validators if needed

### Customizing Component Theme

1. Use `Provider` with `presetProps`
2. Define `sx` object with element keys
3. Use theme context (`colorScheme`, `direction`)

### Creating a New Component

1. Define props interface
2. Use `ComponentProviderUtil.create()`
3. Implement component using `useComponentConfig` and `useClassNames`
4. Export `Provider` for app-level configuration

---

For detailed API documentation and examples, refer to individual skill files linked above.
