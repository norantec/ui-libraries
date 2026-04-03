# Skill: Provider System

## Overview

The provider system consists of two core utilities that enable consistent theming, configuration, and styling across all UI components:

1. **ComponentProviderUtil**: Creates context-based component configuration with theme-aware defaults, preset props, and Emotion-based styling
2. **ProviderFactory**: Composes multiple component providers into a clean, nested hierarchy

**Key Features:**
- Theme-aware default props (color scheme, direction)
- Preset props for application-wide configuration
- Multi-layer prop merging with function/array preservation
- Emotion CSS object styling with Mustache template support
- Topological sorting for CSS class name dependencies
- Clean provider composition

---

## ComponentProviderUtil

Factory class that generates context providers, configuration hooks, and class name generators for components.

### create() Method

```typescript
const { Provider, useComponentConfig, useClassNames } = ComponentProviderUtil.create<Props>(options);
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `defaultProps` | `(context) => Partial<Props>` | Function returning default props based on theme context |
| `preInputMerger` | `(context) => Partial<Props>` | Props merged BEFORE user input props (allows overrides) |
| `postInputMerger` | `(context) => Partial<Props>` | Props merged AFTER user input props (enforces constraints) |

#### Context Object

```typescript
interface MergerContext<Props> {
  colorScheme: 'light' | 'dark';    // Current color scheme
  direction: 'ltr' | 'rtl';         // Current text direction
  defaultProps: Partial<Props>;     // Default props from defaultProps()
  inputProps: Partial<Props>;       // User-provided props
  presetProps: Partial<Props>;      // Props from presetProps()
  finalProps: Partial<Props>;       // Current merged props
}
```

### Prop Merging Order

Props are merged in this order (later layers override earlier ones):

```
1. defaultProps()          - Theme-aware defaults
2. presetProps()           - Application-wide config from Provider
3. preInputMerger()        - Pre-processing layer
4. inputProps              - User's component props
5. postInputMerger()       - Post-processing/constraints
```

**Important**: Functions and arrays are NOT deep-merged by default. The last value wins.

---

## Generated Objects

### Provider

React component that accepts `presetProps` and provides configuration context.

```typescript
interface ProviderProps<Props> {
  children: React.ReactNode;
  presetProps?: (context: ProviderPresetPropsGeneratorContext<Props>) => Partial<Props>;
}
```

### useComponentConfig

Hook that merges all prop layers and returns final props.

```typescript
const config = useComponentConfig(inputProps);
```

### useClassNames

Hook that converts Emotion CSS objects to class names with dependency resolution.

```typescript
const classNames = useClassNames(cssObjectMap);
```

---

## Usage Examples

### Basic Component Setup

```tsx
import { ComponentProviderUtil } from '@open-norantec/ui-libraries';
import { CSSObject } from '@emotion/react';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  sx?: {
    root?: CSSObject;
    label?: CSSObject;
  };
}

// Create the provider system
const {
  Provider: ButtonProvider,
  useComponentConfig: useButtonConfig,
  useClassNames: useButtonClassNames
} = ComponentProviderUtil.create<ButtonProps>({
  
  // Theme-aware defaults
  defaultProps: ({ colorScheme, direction }) => ({
    variant: 'primary',
    size: 'medium',
    disabled: false,
    sx: {
      root: {
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.2s',
        // Theme-aware colors
        backgroundColor: colorScheme === 'dark' ? '#3b82f6' : '#2563eb',
        color: '#ffffff'
      },
      label: {
        fontWeight: 500
      }
    }
  }),

  // Pre-input: Layout calculations based on size
  preInputMerger: ({ finalProps }) => {
    const sizeStyles = {
      small: { padding: '6px 12px', fontSize: 14 },
      medium: { padding: '10px 16px', fontSize: 16 },
      large: { padding: '14px 24px', fontSize: 18 }
    };

    return {
      sx: {
        root: {
          ...sizeStyles[finalProps.size || 'medium']
        }
      }
    };
  },

  // Post-input: Enforce constraints
  postInputMerger: ({ finalProps }) => ({
    sx: {
      root: {
        // Disabled state always overrides
        opacity: finalProps.disabled ? 0.5 : 1,
        cursor: finalProps.disabled ? 'not-allowed' : 'pointer',
        pointerEvents: finalProps.disabled ? 'none' : 'auto'
      }
    }
  })
});

export { ButtonProvider, useButtonConfig, useButtonClassNames };
```

### Component Implementation

```tsx
import { useButtonConfig, useButtonClassNames } from './button-config';
import { cx } from '@emotion/css';

const Button: React.FC<ButtonProps> = (inputProps) => {
  // Get merged configuration
  const { variant, size, disabled, sx, children, ...rest } = useButtonConfig(inputProps);
  
  // Generate class names from CSS objects
  const classNames = useButtonClassNames(sx);

  return (
    <button
      {...rest}
      disabled={disabled}
      className={cx(classNames.root, rest.className)}
    >
      <span className={classNames.label}>{children}</span>
    </button>
  );
};

export default Button;
```

### Application-Wide Configuration

```tsx
import { ProviderFactory } from '@open-norantec/ui-libraries';
import { ButtonProvider } from './components/button';
import { InputProvider } from './components/input';
import { CardProvider } from './components/card';

const App = () => (
  <ProviderFactory
    providers={(creator) => [
      // Configure Button defaults for this app
      creator(ButtonProvider, {
        presetProps: ({ defaultProps, colorScheme }) => ({
          variant: 'secondary',  // Different default
          sx: {
            root: {
              borderRadius: 12,  // More rounded
              fontFamily: 'Inter, sans-serif'  // Custom font
            }
          }
        })
      }),
      
      // Configure Input defaults
      creator(InputProvider, {
        presetProps: () => ({
          sx: {
            input: {
              borderColor: '#e5e7eb',
              '&:focus': {
                borderColor: '#3b82f6'
              }
            }
          }
        })
      }),
      
      // Card with no preset overrides
      creator(CardProvider)
    ]}
  >
    <YourApp />
  </ProviderFactory>
);
```

---

## Advanced Styling with SX

### CSS Object Structure

The `sx` prop accepts a map of CSS objects for different sub-elements:

```tsx
sx={{
  wrapper: { /* styles */ },
  header: { /* styles */ },
  content: { /* styles */ },
  footer: { /* styles */ }
}}
```

### Mustache Template Support

Class names can reference other class names using Mustache syntax:

```tsx
ComponentProviderUtil.create<Props>({
  defaultProps: () => ({
    sx: {
      wrapper: {
        padding: 16,
        backgroundColor: '#ffffff'
      },
      header: {
        // Reference wrapper's class name
        borderBottom: '1px solid {{wrapper}}'
      },
      content: {
        // Will be transformed to use actual class name
        '&.{{wrapper}}': {
          backgroundColor: '#f9fafb'
        }
      }
    }
  })
});
```

**How it works:**
1. Dependencies are extracted from Mustache templates
2. Topological sort determines generation order
3. Class names are generated and substituted into dependent templates

### Dynamic Styling Based on Props

```tsx
ComponentProviderUtil.create<CardProps>({
  defaultProps: () => ({ elevation: 1 }),
  
  preInputMerger: ({ finalProps }) => {
    // Shadow based on elevation
    const shadows = {
      0: 'none',
      1: '0 1px 3px rgba(0,0,0,0.1)',
      2: '0 4px 6px rgba(0,0,0,0.1)',
      3: '0 10px 15px rgba(0,0,0,0.1)'
    };

    return {
      sx: {
        root: {
          boxShadow: shadows[finalProps.elevation] || shadows[1],
          borderRadius: finalProps.elevation === 0 ? 0 : 8
        }
      }
    };
  }
});
```

### RTL Support

```tsx
ComponentProviderUtil.create<Props>({
  defaultProps: ({ direction }) => ({
    sx: {
      wrapper: {
        // Automatic RTL handling
        paddingLeft: direction === 'rtl' ? 0 : 16,
        paddingRight: direction === 'rtl' ? 16 : 0
      },
      icon: {
        // Flip icons in RTL
        transform: direction === 'rtl' ? 'scaleX(-1)' : 'none'
      }
    }
  })
});
```

---

## ProviderFactory

Utility for composing multiple providers without nesting hell.

### Basic Usage

```tsx
import { ProviderFactory } from '@open-norantec/ui-libraries';

// Without ProviderFactory (nesting hell)
<ThemeProvider>
  <FormProvider>
    <ScrollableProvider>
      <AutoHideProvider>
        <App />
      </AutoHideProvider>
    </ScrollableProvider>
  </FormProvider>
</ThemeProvider>

// With ProviderFactory (flat structure)
<ProviderFactory
  providers={(creator) => [
    creator(ThemeProvider),
    creator(FormProvider),
    creator(ScrollableProvider),
    creator(AutoHideProvider, { /* presetProps */ })
  ]}
>
  <App />
</ProviderFactory>
```

### creator Function

The `creator` function signature:

```typescript
type CreateFn = <T>(
  Provider: React.FC<T>, 
  props?: Omit<T, 'children'>
) => React.ReactElement;
```

### Conditional Providers

```tsx
<ProviderFactory
  providers={(creator) => [
    creator(ThemeProvider),
    ...(isFormEnabled ? [creator(FormProvider)] : []),
    creator(ScrollableProvider, {
      presetProps: () => ({
        autoHide: prefersReducedMotion ? false : true
      })
    })
  ]}
>
  <App />
</ProviderFactory>
```

### Dynamic Preset Props

```tsx
const App = () => {
  const [theme, setTheme] = useState('light');
  
  return (
    <ProviderFactory
      providers={(creator) => [
        creator(FormProvider, {
          presetProps: ({ colorScheme }) => ({
            sx: {
              wrapper: {
                // Dynamic based on current theme
                backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff'
              }
            }
          })
        })
      ]}
    >
      <YourApp />
    </ProviderFactory>
  );
};
```

---

## Complete Example: Building a Custom Component

```tsx
// tooltip-config.ts
import { ComponentProviderUtil } from '@open-norantec/ui-libraries';
import { CSSObject } from '@emotion/react';

interface TooltipProps {
  placement?: 'top' | 'bottom' | 'left' | 'right';
  title?: string;
  open?: boolean;
  sx?: {
    root?: CSSObject;
    arrow?: CSSObject;
    content?: CSSObject;
  };
}

const {
  Provider: TooltipProvider,
  useComponentConfig: useTooltipConfig,
  useClassNames: useTooltipClassNames
} = ComponentProviderUtil.create<TooltipProps>({
  
  defaultProps: ({ colorScheme, direction }) => {
    const isDark = colorScheme === 'dark';
    
    return {
      placement: 'top',
      sx: {
        root: {
          position: 'absolute',
          zIndex: 1500,
          pointerEvents: 'none'
        },
        content: {
          backgroundColor: isDark ? '#374151' : '#1f2937',
          color: '#ffffff',
          padding: '8px 12px',
          borderRadius: 6,
          fontSize: 14,
          maxWidth: 300,
          wordWrap: 'break-word'
        },
        arrow: {
          position: 'absolute',
          width: 8,
          height: 8,
          backgroundColor: isDark ? '#374151' : '#1f2937',
          transform: 'rotate(45deg)'
        }
      }
    };
  },

  preInputMerger: ({ finalProps, direction }) => {
    // Calculate positioning based on placement
    const placements = {
      top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 },
      bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 },
      left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 },
      right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 }
    };

    // RTL flip for left/right
    let placement = finalProps.placement;
    if (direction === 'rtl' && (placement === 'left' || placement === 'right')) {
      placement = placement === 'left' ? 'right' : 'left';
    }

    return {
      sx: {
        root: placements[placement]
      }
    };
  }
});

export { TooltipProvider, useTooltipConfig, useTooltipClassNames };
```

```tsx
// Tooltip.tsx
import { useTooltipConfig, useTooltipClassNames } from './tooltip-config';
import { cx } from '@emotion/css';

export const Tooltip: React.FC<TooltipProps> = (inputProps) => {
  const { title, open, sx, children, ...rest } = useTooltipConfig(inputProps);
  const classNames = useTooltipClassNames(sx);

  if (!open || !title) return <>{children}</>;

  return (
    <div className={cx(classNames.root)} {...rest}>
      <div className={cx(classNames.content)}>{title}</div>
      <div className={cx(classNames.arrow)} />
      {children}
    </div>
  );
};
```

```tsx
// App setup
import { TooltipProvider, ProviderFactory } from './components/tooltip';

const App = () => (
  <ProviderFactory
    providers={(creator) => [
      creator(TooltipProvider, {
        presetProps: () => ({
          placement: 'bottom'  // Default all tooltips to bottom
        })
      })
    ]}
  >
    <YourApp />
  </ProviderFactory>
);
```

---

## Best Practices

### 1. Layer Responsibilities

```typescript
// defaultProps: Theme-aware base styles
// - Color scheme colors
// - Direction-based layout
// - Sensible defaults

// presetProps: App-wide overrides (in Provider)
// - Brand colors
// - Custom spacing scale
// - Typography

// preInputMerger: Computed styles
// - Layout calculations
// - Derived values from props
// - Conditional styles

// inputProps: User overrides
// - Instance-specific props
// - One-off customizations

// postInputMerger: Constraints/Enforcements
// - Disabled states
// - Validation styling
// - Immutable rules
```

### 2. SX Structure

```typescript
// Group by element, not by property
sx: {
  wrapper: {    // Container element
    display: 'flex',
    padding: 16
  },
  header: {     // Header section
    display: 'flex',
    borderBottom: '1px solid #e5e7eb'
  },
  title: {      // Title text
    fontSize: 18,
    fontWeight: 600
  }
}
```

### 3. Avoid Deep Nesting in CSS Objects

```typescript
// ❌ Avoid deep nesting
sx: {
  wrapper: {
    '& .header': {
      '& .title': {
        fontSize: 16
      }
    }
  }
}

// ✅ Use separate keys
sx: {
  wrapper: { /* ... */ },
  header: { /* ... */ },
  title: { fontSize: 16 }
}
```

### 4. Use Mustache Templates for Dependencies

```typescript
// When element B's style depends on element A's class
sx: {
  container: {
    position: 'relative'
  },
  dropdown: {
    // Dropdown positions relative to container
    position: 'absolute',
    top: '100%',
    left: 0,
    // Reference container for scoped styles
    '&.{{container}}': {
      zIndex: 1000
    }
  }
}
```

### 5. Provider Composition Order

```typescript
// Order matters - outer to inner
<ProviderFactory
  providers={(creator) => [
    creator(ThemeProvider),      // 1. Theme context
    creator(I18nProvider),       // 2. Translations
    creator(FormProvider),       // 3. Form context
    creator(ScrollableProvider), // 4. Component providers...
    creator(AutoHideProvider),
    creator(TooltipProvider)
  ]}
>
```

### 6. Dynamic Preset Props

```typescript
// Access context in presetProps
creator(MyProvider, {
  presetProps: ({ colorScheme, direction, inputProps }) => ({
    sx: {
      root: {
        // Respond to theme changes
        backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
        // Respond to direction
        textAlign: direction === 'rtl' ? 'right' : 'left'
      }
    }
  })
})
```
