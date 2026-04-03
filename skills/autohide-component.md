# Skill: AutoHide Component

## Overview

The AutoHide component creates panels that can slide in/out from screen edges with preview, active, and hidden states. Perfect for sidebars, tool panels, floating widgets, and edge-docking UI elements that should minimize when not in use.

**Key Features:**
- Three states: `hidden`, `previewing`, `actived`
- Slides in from any edge or corner (`top`, `right`, `bottom`, `left`, `top-left`, etc.)
- Mouse proximity detection for automatic activation
- Imperative API for programmatic control
- Configurable delays and close events
- Smooth CSS transitions

---

## Component

### AutoHide

A floating panel that can be docked to screen edges with auto-hide behavior.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultState` | `'hidden' \| 'previewing'` | `'hidden'` | Initial state when component mounts |
| `previewSize` | `number` | `32` | Visible size in pixels when in previewing state |
| `stickTo` | `Edge \| null` | `'right'` | Which edge(s) to dock to |
| `previewDelay` | `number` | `100` | Milliseconds to wait before showing preview |
| `activeDelay` | `number` | `1000` | Milliseconds to wait before fully activating |
| `hideDelay` | `number` | `500` | Milliseconds to wait before hiding |
| `disabled` | `boolean` | `false` | Disable auto-hide behavior |
| `closeEvents` | `CloseEvents` | - | Configuration for what triggers hiding |
| `sx` | `{ wrapper?: CSSObject }` | - | Emotion CSS for styling |

#### Type Definitions

```typescript
type Edge = 'top' | 'right' | 'bottom' | 'left' | 
            'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface CloseEvents {
  clickOutside?: boolean;   // Close when clicking outside panel
  mouseleave?: boolean;     // Close when mouse leaves boundary
  windowBlur?: boolean;     // Close when window loses focus
}

interface AutoHideRef {
  element: HTMLDivElement | null;  // DOM reference
  active: (mutableProps?: MutableProps) => void;   // Programmatically activate
  deactive: (options?: DeactiveOptions) => void;   // Programmatically deactivate
}

interface MutableProps {
  activeDelay?: number;
  closeEvents?: CloseEvents;
  disabled?: boolean;
  hideDelay?: number;
  previewDelay?: number;
}
```

#### State Machine

The component has three states with automatic transitions:

```
hidden → (mouse enters preview area) → previewing → (mouse stays) → actived
   ↑                                     ↓
   └──────────────── (mouse leaves) ─────┘
```

**hidden**: Panel is completely hidden off-screen
**previewing**: Small portion visible (`previewSize`) to indicate presence
**actived**: Fully visible panel

#### Edge Positioning

The `stickTo` prop controls which screen edge the panel docks to:

```typescript
// Single edge - slides in from that edge
<AutoHide stickTo="right">    // Slides from right edge
<AutoHide stickTo="left">     // Slides from left edge
<AutoHide stickTo="top">      // Slides from top edge
<AutoHide stickTo="bottom">   // Slides from bottom edge

// Corner - slides from corner between two edges
<AutoHide stickTo="top-right">     // Top-right corner
<AutoHide stickTo="bottom-left">   // Bottom-left corner
```

---

## Usage Examples

### Basic Side Panel

```tsx
import { AutoHide, AutoHideRef } from '@open-norantec/ui-libraries';
import { useRef } from 'react';

const SidePanel = () => {
  const autoHideRef = useRef<AutoHideRef>(null);

  return (
    <AutoHide
      ref={autoHideRef}
      stickTo="right"
      previewSize={32}
      defaultState="hidden"
    >
      <div style={{ 
        width: 360, 
        height: '100vh',
        backgroundColor: '#f8fafc',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
        padding: 24
      }}>
        <h2>Side Panel</h2>
        <p>Hover near the right edge to preview,</p>
        <p>stay to activate fully.</p>
      </div>
    </AutoHide>
  );
};
```

### Floating Action Panel (Bottom-Right)

```tsx
import { css } from '@emotion/css';

const FloatingPanel = () => {
  const autoHideRef = useRef<AutoHideRef>(null);
  const [active, setActive] = useState(false);

  return (
    <>
      <button 
        onClick={() => autoHideRef.current?.active()}
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100 }}
      >
        Open Panel
      </button>

      <AutoHide
        ref={autoHideRef}
        stickTo="bottom-right"
        previewSize={48}
        defaultState="hidden"
        closeEvents={{
          clickOutside: true,
          mouseleave: false,  // Keep open on mouse leave
          windowBlur: true
        }}
      >
        <div className={css({
          width: 320,
          height: 400,
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: 20,
          margin: 16
        })}>
          <h3>Quick Actions</h3>
          <button>Action 1</button>
          <button>Action 2</button>
          <button>Action 3</button>
        </div>
      </AutoHide>
    </>
  );
};
```

### Toolbar with Preview

```tsx
const ToolbarExample = () => (
  <AutoHide
    stickTo="top"
    previewSize={24}
    defaultState="previewing"  // Always show a peek
    previewDelay={0}
    activeDelay={200}
    hideDelay={300}
    sx={{
      wrapper: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(8px)',
        padding: '8px 16px',
        borderRadius: '0 0 8px 8px',
        left: '50%',
        transform: 'translateX(-50%)'
      }
    }}
  >
    <div style={{ display: 'flex', gap: 8 }}>
      <button>🔧 Settings</button>
      <button>💾 Save</button>
      <button>📤 Share</button>
    </div>
  </AutoHide>
);
```

### Left Sidebar Navigation

```tsx
import { css, cx } from '@emotion/css';

const NavigationSidebar = () => {
  const autoHideRef = useRef<AutoHideRef>(null);

  const sidebarClass = css({
    width: 280,
    height: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    padding: '24px 16px'
  });

  const previewTabClass = css({
    position: 'absolute',
    right: -40,
    top: '50%',
    width: 40,
    height: 80,
    backgroundColor: '#0f172a',
    borderRadius: '0 8px 8px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  });

  return (
    <AutoHide
      ref={autoHideRef}
      stickTo="left"
      previewSize={8}
      activeDelay={300}
      hideDelay={400}
      closeEvents={{
        clickOutside: true,
        mouseleave: true,
        windowBlur: false
      }}
      sx={{
        wrapper: {
          position: 'fixed',
          zIndex: 1000
        }
      }}
    >
      <div className={sidebarClass}>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>🏠 Home</li>
            <li>📊 Dashboard</li>
            <li>📁 Projects</li>
            <li>⚙️ Settings</li>
          </ul>
        </nav>
      </div>
    </AutoHide>
  );
};
```

### Chat Widget (Bottom-Left)

```tsx
const ChatWidget = () => {
  const autoHideRef = useRef<AutoHideRef>(null);
  const [unreadCount, setUnreadCount] = useState(3);

  // Programmatically open when new message arrives
  useEffect(() => {
    if (unreadCount > 0) {
      autoHideRef.current?.active({
        closeEvents: { clickOutside: false, mouseleave: true }
      });
    }
  }, [unreadCount]);

  return (
    <AutoHide
      ref={autoHideRef}
      stickTo="bottom-left"
      previewSize={56}
      defaultState="hidden"
      activeDelay={0}
      closeEvents={{
        clickOutside: false,  // Don't close when interacting with page
        mouseleave: true,
        windowBlur: false
      }}
    >
      <div style={{
        width: 360,
        height: 500,
        backgroundColor: 'white',
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        margin: 16
      }}>
        <div style={{
          padding: 16,
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>💬 Chat Support</span>
          <button onClick={() => autoHideRef.current?.deactive()}>✕</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* Chat messages */}
        </div>
        <div style={{ padding: 16, borderTop: '1px solid #e5e7eb' }}>
          <input placeholder="Type a message..." />
        </div>
      </div>
    </AutoHide>
  );
};
```

---

## Imperative API

### Active Method

Programmatically show the panel with optional temporary props:

```tsx
// Basic activation
autoHideRef.current?.active();

// Activation with custom close behavior
autoHideRef.current?.active({
  closeEvents: {
    clickOutside: false,
    mouseleave: false,
    windowBlur: false
  }
});

// Temporary delay overrides
autoHideRef.current?.active({
  activeDelay: 0,
  hideDelay: 2000  // Auto-close after 2 seconds
});

// Disable auto-hide temporarily
autoHideRef.current?.active({
  disabled: true  // Panel stays open
});
```

### Deactive Method

Programmatically hide the panel:

```tsx
// Basic deactivation
autoHideRef.current?.deactive();

// Deactivate and clear temporary props
autoHideRef.current?.deactive({ resetTempMutableProps: true });

// Deactivate but keep temporary props for next activation
autoHideRef.current?.deactive({ resetTempMutableProps: false });
```

---

## Complete Examples

### Development Tool Panel

```tsx
import { AutoHide, AutoHideRef, AutoHideProvider } from '@open-norantec/ui-libraries';
import { useRef, useState } from 'react';
import { css } from '@emotion/css';

const DevTools = () => {
  const autoHideRef = useRef<AutoHideRef>(null);
  const [logs, setLogs] = useState([]);

  return (
    <AutoHide
      ref={autoHideRef}
      stickTo="right"
      previewSize={40}
      defaultState="hidden"
      activeDelay={0}
      closeEvents={{
        clickOutside: false,  // Keep open when debugging
        mouseleave: true,
        windowBlur: false
      }}
      sx={{
        wrapper: css({
          top: 64,
          height: 'calc(100vh - 64px)'
        })
      }}
    >
      <div className={css({
        width: 400,
        height: '100%',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        fontFamily: 'monospace',
        fontSize: 12,
        display: 'flex',
        flexDirection: 'column'
      })}
      >
        <div className={css({
          padding: '8px 12px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        })}
        >
          <span>🔧 DevTools</span>
          <button 
            onClick={() => autoHideRef.current?.deactive()}
            className={css({
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer'
            })}
          >
            ✕
          </button>
        </div>

        <div className={css({
          display: 'flex',
          gap: 8,
          padding: 8,
          borderBottom: '1px solid #333'
        })}
        >
          {['Console', 'Network', 'State', 'Props'].map(tab => (
            <button
              key={tab}
              className={css({
                backgroundColor: '#333',
                border: 'none',
                color: '#fff',
                padding: '4px 12px',
                cursor: 'pointer',
                borderRadius: 4
              })}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={css({
          flex: 1,
          overflow: 'auto',
          padding: 8
        })}
        >
          {logs.map((log, i) => (
            <div key={i} className={css({ 
              padding: '4px 0',
              borderBottom: '1px solid #333',
              color: log.type === 'error' ? '#f87171' : '#d4d4d4'
            })}>
              {log.message}
            </div>
          ))}
        </div>
      </div>
    </AutoHide>
  );
};
```

### Notification Center

```tsx
const NotificationCenter = () => {
  const autoHideRef = useRef<AutoHideRef>(null);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New message', time: '2m ago', read: false },
    { id: 2, title: 'Build complete', time: '1h ago', read: false },
    { id: 3, title: 'Deployment failed', time: '2h ago', read: true }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Notification Bell */}
      <button
        onClick={() => autoHideRef.current?.active()}
        style={{ position: 'fixed', top: 20, right: 20, zIndex: 1001 }}
      >
        🔔
        {unreadCount > 0 && (
          <span className={css({
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: 18,
            height: 18,
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          })}
          >
            {unreadCount}
          </span>
        )}
      </button>

      <AutoHide
        ref={autoHideRef}
        stickTo="top-right"
        previewSize={0}  // No preview, only bell activates
        defaultState="hidden"
        activeDelay={0}
        closeEvents={{
          clickOutside: true,
          mouseleave: false,
          windowBlur: false
        }}
      >
        <div className={css({
          width: 360,
          maxHeight: 480,
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 20px 48px rgba(0,0,0,0.15)',
          margin: '60px 20px 20px',
          overflow: 'hidden'
        })}
        >
          <div className={css({
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between'
          })}
          >
            <span style={{ fontWeight: 600 }}>Notifications</span>
            <button 
              onClick={() => setNotifications(n => n.map(x => ({ ...x, read: true })))}
              style={{ fontSize: 12, color: '#3b82f6' }}
            >
              Mark all read
            </button>
          </div>

          <div style={{ overflow: 'auto', maxHeight: 400 }}>
            {notifications.map(n => (
              <div
                key={n.id}
                className={css({
                  padding: '12px 20px',
                  borderBottom: '1px solid #f3f4f6',
                  backgroundColor: n.read ? 'white' : '#eff6ff',
                  cursor: 'pointer'
                })}
                onClick={() => {
                  setNotifications(prev => 
                    prev.map(x => x.id === n.id ? { ...x, read: true } : x)
                  );
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: n.read ? 400 : 500 }}>{n.title}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{n.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AutoHide>
    </>
  );
};
```

---

## Provider Configuration

Use `AutoHideProvider` to set defaults for all AutoHide components:

```tsx
import { AutoHideProvider, ProviderFactory } from '@open-norantec/ui-libraries';

const App = () => (
  <ProviderFactory
    providers={(creator) => [
      creator(AutoHideProvider, {
        presetProps: () => ({
          previewDelay: 150,
          activeDelay: 500,
          hideDelay: 400,
          closeEvents: {
            clickOutside: true,
            mouseleave: true,
            windowBlur: true
          }
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

### 1. Settings Panel
Side panel that slides in from the right when hovering near the edge.

### 2. Navigation Sidebar
Collapsible sidebar that shows a sliver preview when collapsed.

### 3. Floating Chat Widget
Chat widget that can be minimized to a small bubble.

### 4. Tool Panels
IDE-style tool panels (console, inspector, etc.) that auto-hide.

### 5. Quick Actions
FAB (Floating Action Button) that expands into a panel.

### 6. Notifications
Slide-in notification center from top or side.

### 7. Help/Hints
Contextual help panels that appear on hover.

---

## Best Practices

1. **Choose appropriate `previewSize`**:
   - Too small: Users won't discover the panel
   - Too large: Becomes distracting
   - Recommended: 8-48px depending on context

2. **Set appropriate delays**:
   - `previewDelay`: 0-200ms for responsive feel
   - `activeDelay`: 200-1000ms to prevent accidental activation
   - `hideDelay`: 300-800ms to allow safe mouse movement

3. **Handle `closeEvents` carefully**:
   ```tsx
   // For persistent tools (dev panel)
   closeEvents: { clickOutside: false, mouseleave: false }

   // For temporary UI (dropdowns)
   closeEvents: { clickOutside: true, mouseleave: true }
   ```

4. **Use `defaultState="previewing"`** for discoverability on first visit

5. **Position with CSS** when using corners:
   ```tsx
   <AutoHide
     stickTo="top-right"
     sx={{
       wrapper: {
         top: 64,  // Below header
         right: 0
       }
     }}
   >
   ```

6. **Programmatic control** for user-initiated actions:
   ```tsx
   // Button to open panel
   <button onClick={() => autoHideRef.current?.active()}>
     Open Panel
   </button>
   ```

7. **Reset temporary props** when needed:
   ```tsx
   // One-time activation with special settings
   autoHideRef.current?.active({ disabled: true });
   
   // Later: close and reset to defaults
   autoHideRef.current?.deactive({ resetTempMutableProps: true });
   ```

8. **Combine with backdrop blur** for modern aesthetics:
   ```tsx
   sx={{
     wrapper: {
       backgroundColor: 'rgba(255, 255, 255, 0.9)',
       backdropFilter: 'blur(8px)'
     }
   }}
   ```
