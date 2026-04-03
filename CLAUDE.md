# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run demo          # Start webpack dev server on port 9000 for interactive development

# Building
npm run build         # Build everything: CJS, ESM, and demo
npm run build:cjs     # Build CommonJS version to lib-cjs/
npm run build:esm     # Build ESM version to lib-esm/
npm run build:demo    # Build demo to demo/ for production

# Linting
npx eslint src/       # Run ESLint on source files
```

## Architecture

### Project Structure

This is a React UI component library (`@open-norantec/ui-libraries`) publishing headless components with dual module output (CommonJS + ESM).

```
src/
├── components/           # React components
│   ├── form/            # Form system with EventEmitter-based state management
│   ├── scrollable/      # Custom scrollbar component with fixed-position tracks
│   ├── auto-hide/       # Auto-hiding panel component
│   └── provider-factory/# Utility for composing React providers
├── hooks/               # Custom React hooks (color scheme, direction, media queries)
├── utilities/           # Component provider system and i18n utilities
├── demo.tsx            # Interactive demo/playground
└── index.tsx           # Library entry point
```

### Component Provider Pattern

All components use `ComponentProviderUtil.create()` for configuration, theming, and styling:

```typescript
const { Provider, useComponentConfig, useClassNames } = ComponentProviderUtil.create<Props>({
  defaultProps: ({ colorScheme, direction }) => ({ ... }),
  preInputMerger: ({ finalProps }) => ({ sx: { ... } }),
  postInputMerger: ({ finalProps }) => ({ sx: { ... } }),
});
```

Components receive an `sx` prop accepting Emotion CSS objects for styling sub-elements:

```typescript
<FormItem sx={{ wrapper: { display: 'flex' }, headerLabel: { color: 'red' } }} />
```

### Provider Composition

Use `ProviderFactory` to compose multiple component providers in `demo.tsx`:

```typescript
<ProviderFactory providers={(creator) => [
  creator(AutoHideProvider),
  creator(ScrollableProvider),
  creator(FormProvider),
  creator(FormItemProvider, { presetProps: () => ({ ... }) }),
]}>
  <App />
</ProviderFactory>
```

### Form System Architecture

The Form component uses EventEmitter for cross-component communication:

- Form creates an EventEmitter stored in `EmitterContext`
- FormItems subscribe to events: `VALUE_CHANGE`, `REGISTRATION_STATUS_CHANGE`, `REQUEST_VALIDATION_ERRORS`
- Form methods (setValue, validate, etc.) emit events that FormItems respond to
- Validation is async and supports per-field validators with `validateOnChange`/`validateOnValidation` options

FormItem children use a tuple pattern: `[Component, props]`:

```typescript
<FormItem name="field">{[Input, { placeholder: '...' }]}</FormItem>
```

### Scrollable Component

Custom scrollbar using fixed-position elements outside the React render tree:

- Uses `requestAnimationFrame` loop to sync scrollbar positions with scrollable content
- Tracks are `position: fixed` with z-index 9999, positioned via `getBoundingClientRect()`
- Supports RTL layouts and configurable tracker offsets
- Hides native scrollbars via CSS (`::-webkit-scrollbar: { display: none }`)

### Key Dependencies

- `@emotion/css` / `@emotion/react` - CSS-in-JS styling
- `eventemitter3` - Event emitter for form communication
- `ahooks` - Utility hooks (`useUpdate`)
- `lodash` - Deep merging and utilities
- `@open-norantec/utilities` - External utility library

### TypeScript Configuration

- Base config outputs ES5/CommonJS for broad compatibility
- `tsconfig.cjs.json` - CommonJS build to `lib-cjs/`
- `tsconfig.esm.json` - ESM build to `lib-esm/` (ES2019 + DOM lib)
- `tsconfig.eslint.json` - Includes JS files for ESLint parsing

### Styling Conventions

- Components use Emotion's `css` and `cx` for className composition
- CSS objects defined in `sx` prop mergers support Mustache template syntax for referencing other class names (processed via `transformKeys` and topological sorting)
- `useColorScheme()` and `useDirection()` hooks provide theme context
