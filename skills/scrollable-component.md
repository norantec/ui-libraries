# Skill: Scrollable Component

## Overview

The Scrollable component provides a fully customizable, high-performance custom scrollbar solution for React applications. It replaces native browser scrollbars with customizable fixed-position track and thumb elements while maintaining native scroll behavior.

**Key Features:**
- Custom-styled vertical and horizontal scrollbars
- Fixed-position scrollbar tracks (rendered outside the scroll container)
- Auto-hide behavior on hover/scroll
- RTL (Right-to-Left) layout support
- Configurable tracker offsets and sizes
- Smooth drag-to-scroll interaction
- High-performance RAF (RequestAnimationFrame) synchronization

---

## Component

### Scrollable

A container component that wraps content and provides custom scrollbars.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `autoHide` | `boolean` | `true` | Whether to hide scrollbars when not hovering/scrolling |
| `thumbClassName` | `string` | Base styles | CSS class for scrollbar thumbs |
| `thumbSizeRatio` | `number` | `0.5` | Size ratio of thumb relative to track (0-1) |
| `trackerClassName` | `string` | - | CSS class for scrollbar tracks |
| `trackerOffset` | `[number, number, number, number]` | `[0, 0, 0, 0]` | Offset for tracks: [top, right, bottom, left] |
| `trackerSize` | `number` | `12` | Width of scrollbar tracks in pixels |
| `position` | `'absolute' \| 'fixed' \| 'relative'` | `'relative'` | CSS position of the scrollable container |

#### Tracker Offset Array

The `trackerOffset` prop accepts a 4-element tuple representing padding around the scrollbar tracks:

```typescript
[topOffset, rightOffset, bottomOffset, leftOffset]
```

Each value specifies the distance in pixels from that edge where the track should be positioned.

**Example:**
```tsx
// Create space at top and left for fixed headers/sidebars
<Scrollable trackerOffset={[48, 0, 0, 48]}>
  {content}
</Scrollable>
```

#### Imperative Handle

Access the underlying scrollable container element via ref:

```tsx
const MyComponent = () => {
  const scrollableRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = 0;
    }
  };

  return (
    <>
      <button onClick={scrollToTop}>Scroll to Top</button>
      <Scrollable ref={scrollableRef}>
        {longContent}
      </Scrollable>
    </>
  );
};
```

---

## Usage Examples

### Basic Usage

```tsx
import { Scrollable } from '@open-norantec/ui-libraries';

const BasicExample = () => (
  <Scrollable
    style={{
      maxHeight: '400px',
      maxWidth: '600px',
      border: '1px solid #ccc'
    }}
  >
    <div style={{ height: '1000px', padding: '20px' }}>
      {/* Long content that requires scrolling */}
      {Array.from({ length: 50 }, (_, i) => (
        <p key={i}>Line {i + 1}: Lorem ipsum dolor sit amet... </p>
      ))}
    </div>
  </Scrollable>
);
```

### Custom Styling

```tsx
import { css } from '@emotion/css';

const CustomScrollable = () => {
  const thumbClass = css({
    backgroundColor: '#6366f1',
    borderRadius: '8px',
    opacity: 0.8,
    '&:hover': {
      opacity: 1,
      backgroundColor: '#4f46e5'
    }
  });

  const trackClass = css({
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '8px'
  });

  return (
    <Scrollable
      thumbClassName={thumbClass}
      trackerClassName={trackClass}
      trackerSize={8}
      thumbSizeRatio={0.6}
      autoHide={false}
      style={{
        maxHeight: '500px',
        padding: '16px'
      }}
    >
      {content}
    </Scrollable>
  );
};
```

### With Fixed Headers/Sidebars (Tracker Offset)

**Use case:** When you have fixed UI elements that should not be overlapped by scrollbars.

```tsx
const LayoutWithFixedElements = () => (
  <div style={{ display: 'flex', height: '100vh' }}>
    {/* Fixed sidebar - 200px wide */}
    <aside style={{ 
      position: 'fixed', 
      left: 0, 
      top: 0, 
      width: '200px', 
      height: '100vh',
      zIndex: 100 
    }}>
      Sidebar Content
    </aside>

    {/* Fixed header - 60px tall */}
    <header style={{ 
      position: 'fixed', 
      left: '200px',
      top: 0, 
      right: 0, 
      height: '60px',
      zIndex: 100 
    }}>
      Header Content
    </header>

    {/* Scrollable content area - offset for sidebar and header */}
    <main style={{ 
      marginLeft: '200px', 
      marginTop: '60px',
      flex: 1 
    }}>
      <Scrollable
        trackerOffset={[60, 0, 0, 200]}  // [top, right, bottom, left]
        style={{ height: 'calc(100vh - 60px)' }}
      >
        {pageContent}
      </Scrollable>
    </main>
  </div>
);
```

### RTL (Right-to-Left) Support

The Scrollable component automatically detects RTL direction from the container's `dir` attribute or the Direction context.

```tsx
import { Direction } from '@open-norantec/ui-libraries';

const RTLSupportExample = () => (
  <div dir="rtl">
    <Scrollable
      style={{
        maxHeight: '400px',
        maxWidth: '600px'
      }}
    >
      <div style={{ width: '1000px', direction: 'rtl' }}>
        محتوى عربي طويل يتطلب التمرير...
      </div>
    </Scrollable>
  </div>
);
```

### Always Visible Scrollbars

```tsx
<Scrollable
  autoHide={false}
  thumbClassName={css({
    backgroundColor: '#cbd5e1',
    borderRadius: '4px'
  })}
  style={{
    maxHeight: '400px',
    border: '1px solid #e2e8f0'
  }}
>
  {content}
</Scrollable>
```

### Horizontal Scrolling

```tsx
<Scrollable
  style={{
    maxWidth: '600px',
    overflowX: 'auto'
  }}
>
  <div style={{ 
    display: 'flex', 
    gap: '16px',
    width: 'max-content'  // Ensure content is wider than container
  }}>
    {items.map(item => (
      <div key={item.id} style={{ width: '200px', flexShrink: 0 }}>
        {item.content}
      </div>
    ))}
  </div>
</Scrollable>
```

---

## Provider Configuration

Use `ScrollableProvider` to set default props for all Scrollable components:

```tsx
import { ScrollableProvider, ProviderFactory } from '@open-norantec/ui-libraries';
import { css } from '@emotion/css';

const App = () => (
  <ProviderFactory
    providers={(creator) => [
      creator(ScrollableProvider, {
        presetProps: () => ({
          trackerSize: 8,
          thumbSizeRatio: 0.5,
          autoHide: true,
          thumbClassName: css({
            backgroundColor: '#94a3b8',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: '#64748b'
            }
          })
        })
      })
    ]}
  >
    <YourApp />
  </ProviderFactory>
);
```

---

## Common Use Cases

### Data Table with Custom Scrollbars

```tsx
const DataTable = ({ columns, data }) => (
  <Scrollable
    autoHide={false}
    trackerOffset={[40, 0, 0, 0]}  // Space for fixed header
    style={{
      maxHeight: '500px',
      border: '1px solid #e5e7eb'
    }}
  >
    <table style={{ width: '100%', minWidth: '800px' }}>
      <thead style={{ position: 'sticky', top: 0, background: '#f9fafb' }}>
        <tr>
          {columns.map(col => (
            <th key={col.key}>{col.title}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id}>
            {columns.map(col => (
              <td key={col.key}>{row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </Scrollable>
);
```

### Chat/Message List

```tsx
const ChatContainer = () => {
  const scrollableRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Scrollable
      ref={scrollableRef}
      trackerSize={6}
      autoHide={true}
      style={{
        maxHeight: '600px',
        padding: '16px'
      }}
    >
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={messagesEndRef} />
    </Scrollable>
  );
};
```

### Code Block with Syntax Highlighting

```tsx
const CodeBlock = ({ code, language }) => (
  <Scrollable
    autoHide={false}
    thumbClassName={css({
      backgroundColor: '#4b5563',
      borderRadius: '2px'
    })}
    trackerClassName={css({
      backgroundColor: '#1f2937'
    })}
    style={{
      maxHeight: '400px',
      backgroundColor: '#1f2937',
      borderRadius: '8px'
    }}
  >
    <pre style={{ margin: 0, padding: '16px' }}>
      <code className={`language-${language}`}>
        {code}
      </code>
    </pre>
  </Scrollable>
);
```

---

## Implementation Details

### How It Works

1. **RAF Loop**: The component uses `requestAnimationFrame` to continuously synchronize scrollbar positions with the scrollable container's scroll position.

2. **Fixed Position Tracks**: Scrollbar tracks are rendered as fixed-position elements positioned based on the container's bounding rectangle, allowing them to appear outside the scrollable area.

3. **Native Scroll Behavior**: The scrollable container uses native CSS scrolling (`overflow: auto`) with webkit scrollbar hiding for maximum performance and accessibility.

4. **Drag Interaction**: Clicking and dragging on scrollbar thumbs translates mouse movement to scroll position changes based on content-to-viewport ratios.

### Performance Considerations

- The RAF loop runs continuously while the component is mounted
- Position calculations use `getBoundingClientRect()` which triggers layout
- For very large lists, consider virtualizing the content alongside Scrollable

### Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Requires support for:
- CSS `computedStyleMap()`
- `ResizeObserver` (via RAF polling)
- CSS `position: fixed`

---

## Best Practices

1. **Always set a constrained dimension**: Scrollable needs either `maxHeight`, `height`, or `maxWidth` to enable scrolling:
   ```tsx
   <Scrollable style={{ maxHeight: '400px' }}>  // ✅ Good
   <Scrollable>  // ❌ Won't scroll without constraints
   ```

2. **Use `trackerOffset` for fixed UI elements**: When you have fixed headers, sidebars, or other elements that should not be overlapped by scrollbars.

3. **Consider `autoHide: false` for data-heavy UIs**: Users need to know there's more content to scroll to.

4. **Test with both LTR and RTL**: If your app supports multiple languages, ensure scrollbars work correctly in both directions.

5. **Combine with virtualization for large lists**: For lists with thousands of items, use a virtual list library alongside Scrollable.

6. **Style thumbs for visibility**: Ensure scrollbar thumbs have sufficient contrast against both the track and the content.

7. **Use refs for programmatic scrolling**: Access the underlying element via ref for methods like `scrollTo()`, `scrollIntoView()`, etc.
