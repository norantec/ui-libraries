# Skill: Hooks and Utilities

## Overview

This library provides a collection of custom React hooks and utility classes for common UI patterns including color scheme detection, direction handling, promise tracking, and internationalization.

---

## Hooks

### useColorScheme

Detects and tracks the system's preferred color scheme (light/dark mode).

```typescript
import { useColorScheme } from '@open-norantec/ui-libraries';

const colorScheme = useColorScheme(setting?: 'light' | 'dark' | 'preference');
// Returns: 'light' | 'dark' | null
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `setting` | `'light' \| 'dark' \| 'preference'` | `'preference'` | Color scheme preference |

#### Usage

```tsx
const MyComponent = () => {
  // Auto-detect system preference
  const colorScheme = useColorScheme();

  // Force light mode
  const lightMode = useColorScheme('light');

  // Force dark mode
  const darkMode = useColorScheme('dark');

  return (
    <div style={{
      backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
      color: colorScheme === 'dark' ? '#ffffff' : '#1f2937'
    }}>
      Content
    </div>
  );
};
```

#### Use Cases

- Theme-aware styling
- Conditional icon rendering (sun/moon)
- Dynamic color palettes

---

### useDirection

Tracks the document's text direction (LTR/RTL) and updates when it changes.

```typescript
import { useDirection } from '@open-norantec/ui-libraries';

const direction = useDirection();
// Returns: 'ltr' | 'rtl'
```

#### Usage

```tsx
const MyComponent = () => {
  const direction = useDirection();

  return (
    <div style={{
      textAlign: direction === 'rtl' ? 'right' : 'left',
      paddingLeft: direction === 'rtl' ? 0 : 16,
      paddingRight: direction === 'rtl' ? 16 : 0
    }}>
      Content
    </div>
  );
};
```

#### Automatic Updates

The hook uses `MutationObserver` to watch for changes to the `dir` attribute on `<html>`:

```tsx
// Somewhere in your app
const toggleDirection = () => {
  const currentDir = document.documentElement.getAttribute('dir');
  const newDir = currentDir === 'rtl' ? 'ltr' : 'rtl';
  document.documentElement.setAttribute('dir', newDir);
  // All components using useDirection() will automatically re-render
};
```

---

### useMatchMedia

Reactive wrapper for `window.matchMedia()` that tracks media query changes.

```typescript
import { useMatchMedia } from '@open-norantec/ui-libraries';

const matches = useMatchMedia(query: string);
// Returns: boolean
```

#### Usage

```tsx
const ResponsiveComponent = () => {
  const isMobile = useMatchMedia('(max-width: 768px)');
  const isDarkMode = useMatchMedia('(prefers-color-scheme: dark)');
  const isReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');
  const isLandscape = useMatchMedia('(orientation: landscape)');

  return (
    <div style={{
      flexDirection: isMobile ? 'column' : 'row',
      animation: isReducedMotion ? 'none' : 'fadeIn 0.3s'
    }}>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
};
```

---

### usePreviousValueEffect

Effect hook that provides access to the previous value of dependencies.

```typescript
import { usePreviousValueEffect } from '@open-norantec/ui-libraries';

usePreviousValueEffect(
  effect: (previousValue?: T) => void | (() => void),
  dependencies: DependencyList,
  comparator?: (previousValue: T) => T | undefined
);
```

#### Usage

```tsx
const MyComponent = ({ userId }) => {
  usePreviousValueEffect(
    (prevUserId) => {
      console.log(`User changed from ${prevUserId} to ${userId}`);

      return () => {
        console.log('Cleanup for user:', userId);
      };
    },
    [userId]
  );

  // With custom comparator
  usePreviousValueEffect(
    (prevData) => {
      if (prevData) {
        console.log('Data changed:', prevData, '->', data);
      }
    },
    [data],
    (prev) => {
      // Only trigger if specific field changed
      return prev?.id !== data?.id ? data : undefined;
    }
  );
};
```

---

### usePromise

Hook for tracking async promise state with loading/error/result management.

```typescript
import { usePromise } from '@open-norantec/ui-libraries';

const { run, pendingParams, error, result } = usePromise(promiseFn);
```

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `run` | `(...params) => Promise` | Function to execute the promise |
| `pendingParams` | `string[] \| null` | Which parameters are currently loading |
| `error` | `Error \| undefined` | Error if promise rejected |
| `result` | `any \| undefined` | Result if promise resolved |

#### Usage

```tsx
const UserProfile = ({ userId }) => {
  const { run, pendingParams, error, result: user } = usePromise(
    async (id: string) => {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  );

  // Load user when ID changes
  useEffect(() => {
    run(userId);
  }, [userId]);

  if (pendingParams) return <Loading />;
  if (error) return <Error message={error.message} />;
  if (!user) return null;

  return <UserCard user={user} />;
};
```

#### Tracking Specific Parameter Changes

```tsx
const SearchComponent = () => {
  const { run, pendingParams, result } = usePromise(
    async (query: string, filters: object) => {
      return searchAPI(query, filters);
    }
  );

  // pendingParams shows which specific parameters are loading
  // e.g., ['query'] or ['filters'] or ['query', 'filters']

  const isQueryLoading = pendingParams?.includes('query');
  const isFiltersLoading = pendingParams?.includes('filters');

  return (
    <div>
      <SearchInput
        onChange={(q) => run(q, filters)}
        loading={isQueryLoading}
      />
      <FilterPanel
        onChange={(f) => run(query, f)}
        loading={isFiltersLoading}
      />
    </div>
  );
};
```

---

### useText

Placeholder hook (currently returns empty function).

```typescript
import { useText } from '@open-norantec/ui-libraries';

const useText = () => {};
```

**Note:** For actual i18n functionality, use `I18nUtil.useText()` from the I18nUtil class.

---

## Utility Classes

### I18nUtil

Internationalization utility with Handlebars template support.

```typescript
import { I18nUtil } from '@open-norantec/ui-libraries';

const { Provider, useText } = I18nUtil;
```

#### Provider Props

| Prop | Type | Description |
|------|------|-------------|
| `code` | `string` | Language code (e.g., 'en', 'zh') |
| `getLanguageTextMap` | `(code: string) => Promise<LanguageTextMap> \| LanguageTextMap` | Function to load translations |
| `onCodeChange` | `(code?: string) => void` | Callback when language changes |

#### Usage

```tsx
// App setup
import { I18nUtil } from '@open-norantec/ui-libraries';

const App = () => {
  const loadTranslations = async (code: string) => {
    const response = await fetch(`/i18n/${code}.json`);
    return response.json();
  };

  return (
    <I18nUtil.Provider
      code="zh"
      getLanguageTextMap={loadTranslations}
      onCodeChange={(code) => console.log('Language changed to:', code)}
    >
      <YourApp />
    </I18nUtil.Provider>
  );
};
```

```tsx
// Component usage
const MyComponent = () => {
  const t = I18nUtil.useText();

  return (
    <div>
      {/* Simple translation */}
      <h1>{t('welcome_message')}</h1>

      {/* With interpolation */}
      <p>{t('hello_user', { name: 'John', count: 5 })}</p>
      {/* Renders: "Hello John, you have 5 messages" */}

      {/* Fallback to key if translation missing */}
      <span>{t('missing_key')}</span>
      {/* Renders: "missing_key" */}
    </div>
  );
};
```

#### Translation File Format

```json
// zh.json
{
  "welcome_message": "欢迎",
  "hello_user": "你好 {{name}}，你有 {{count}} 条消息"
}
```

```json
// en.json
{
  "welcome_message": "Welcome",
  "hello_user": "Hello {{name}}, you have {{count}} messages"
}
```

---

### FormItemFormatter

Utility component for transforming form field values between internal and external representations.

```typescript
import { FormItemFormatter } from '@open-norantec/ui-libraries';

<FormItemFormatter
  value={internalValue}
  incoming={(value) => transformedValue}  // Transform for child component
  outgoing={(value) => internalValue}     // Transform back for onChange
  onChange={(value) => {}}
>
  {childComponent}
</FormItemFormatter>
```

#### Use Cases

**Date String to Date Object:**
```tsx
<FormItem name="birthdate" label="Birth Date">
  {[FormItemFormatter, {
    incoming: (dateString) => dateString ? new Date(dateString) : null,
    outgoing: (dateObj) => dateObj?.toISOString(),
    children: <DatePicker />
  }]}
</FormItem>
```

**Number to String (for text inputs):**
```tsx
<FormItem name="age" label="Age">
  {[FormItemFormatter, {
    incoming: (num) => num?.toString() ?? '',
    outgoing: (str) => str ? parseInt(str, 10) : null,
    children: <Input type="text" />
  }]}
</FormItem>
```

**File to Base64:**
```tsx
<FormItem name="avatar" label="Profile Picture">
  {[FormItemFormatter, {
    incoming: (base64) => base64 ? { url: base64 } : null,
    outgoing: (fileObj) => fileObj?.base64,
    children: <ImageUploader />
  }]}
</FormItem>
```

---

## Complete Examples

### Theme-Aware Component

```tsx
import { useColorScheme, useDirection } from '@open-norantec/ui-libraries';
import { css } from '@emotion/css';

const ThemeAwareCard = ({ children }) => {
  const colorScheme = useColorScheme();
  const direction = useDirection();

  const isDark = colorScheme === 'dark';
  const isRTL = direction === 'rtl';

  const cardClass = css({
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    color: isDark ? '#f9fafb' : '#111827',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    borderRadius: 12,
    padding: 24,
    textAlign: isRTL ? 'right' : 'left',
    direction: direction
  });

  return <div className={cardClass}>{children}</div>;
};
```

### Responsive Layout

```tsx
import { useMatchMedia, useColorScheme } from '@open-norantec/ui-libraries';

const ResponsiveDashboard = () => {
  const isMobile = useMatchMedia('(max-width: 768px)');
  const isTablet = useMatchMedia('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMatchMedia('(min-width: 1025px)');
  const colorScheme = useColorScheme();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' :
                          isTablet ? 'repeat(2, 1fr)' :
                          'repeat(4, 1fr)',
      gap: 16,
      backgroundColor: colorScheme === 'dark' ? '#111827' : '#f3f4f6',
      padding: 16
    }}>
      <Widget /><Widget /><Widget /><Widget />
    </div>
  );
};
```

### Internationalized Form

```tsx
import { Form, FormItem, I18nUtil } from '@open-norantec/ui-libraries';
import { useState } from 'react';

const I18nForm = () => {
  const t = I18nUtil.useText();
  const [lang, setLang] = useState('en');

  const translations = {
    en: {
      name_label: 'Full Name',
      email_label: 'Email Address',
      submit_button: 'Submit',
      name_required: 'Please enter your name'
    },
    zh: {
      name_label: '姓名',
      email_label: '电子邮箱',
      submit_button: '提交',
      name_required: '请输入您的姓名'
    }
  };

  return (
    <I18nUtil.Provider
      code={lang}
      getLanguageTextMap={(code) => translations[code]}
    >
      <div>
        <button onClick={() => setLang('en')}>English</button>
        <button onClick={() => setLang('zh')}>中文</button>

        <Form>
          <FormItem
            name="name"
            label={t('name_label')}
            required={t('name_required')}
          >
            {[Input, {}]}
          </FormItem>

          <FormItem
            name="email"
            label={t('email_label')}
          >
            {[Input, { type: 'email' }]}
          </FormItem>

          <button type="submit">{t('submit_button')}</button>
        </Form>
      </div>
    </I18nUtil.Provider>
  );
};
```

### Async Data with Loading States

```tsx
import { usePromise, usePreviousValueEffect } from '@open-norantec/ui-libraries';

const UserSearch = () => {
  const [query, setQuery] = useState('');

  const { run, pendingParams, error, result: users } = usePromise(
    async (searchQuery: string) => {
      if (!searchQuery) return [];
      const response = await fetch(`/api/users?q=${encodeURIComponent(searchQuery)}`);
      return response.json();
    }
  );

  // Debounced search
  usePreviousValueEffect(
    () => {
      const timeoutId = setTimeout(() => run(query), 300);
      return () => clearTimeout(timeoutId);
    },
    [query]
  );

  const isSearching = pendingParams?.includes('searchQuery');

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
      />

      {isSearching && <Spinner />}

      {error && <ErrorAlert message={error.message} />}

      {users && (
        <ul>
          {users.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## Best Practices

1. **Color Scheme:**
   - Always handle `null` return (initial detection)
   - Use CSS custom properties for easier theming
   - Consider `prefers-color-scheme` media query

2. **Direction:**
   - Use logical CSS properties (`inline-start`, `block-start`)
   - Flip icons and asymmetric layouts
   - Test with real RTL content

3. **Match Media:**
   - Avoid too many hooks (combines queries when possible)
   - Use for breakpoints, not layout logic
   - Handle SSR (returns `false` on server)

4. **Promises:**
   - Always handle error states
   - Use for user-triggered actions
   - Consider caching for repeated calls

5. **I18n:**
   - Load translations asynchronously
   - Use keys consistently
   - Handle pluralization externally
