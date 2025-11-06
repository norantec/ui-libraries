import * as React from 'react';
import { ComponentProviderUtil } from '../../utilities/component-provider-util.class';
import { CSSObject } from '@emotion/react';
import { cx } from '@emotion/css';
import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';

const edgeToAxisMap: Record<'top' | 'right' | 'bottom' | 'left', 'x' | 'y'> = {
  top: 'y',
  bottom: 'y',
  left: 'x',
  right: 'x',
};

const edgeReverseMap: Partial<Record<Edge, 'top' | 'right' | 'bottom' | 'left'>> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

type Edge = 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type State = 'hidden' | 'previewing' | 'actived';

interface MutableProps {
  activeDelay?: number;
  closeEvents?: {
    clickOutside?: boolean;
    mouseleave?: boolean;
    windowBlur?: boolean;
  };
  hideDelay?: number;
  previewDelay?: number;
}

export interface AutoHideRef {
  element: HTMLDivElement | null;
  active: (mutableProps?: MutableProps) => void;
  deactive: (callback: (resetMutableProps: () => void) => void) => void;
}

export interface AutoHideProps extends React.ComponentProps<'div'>, MutableProps {
  defaultState?: Exclude<State, 'actived'>;
  previewSize?: number;
  stickTo?: Edge | null;
  sx?: {
    wrapper?: CSSObject;
  };
}

const {
  Provider: AutoHideProvider,
  useComponentConfig: useAutoHideComponentConfig,
  useClassNames: useAutoHideClassNames,
} = ComponentProviderUtil.create<AutoHideProps>({
  defaultProps: () => ({
    defaultState: 'hidden',
    previewDelay: 100,
    activeDelay: 1000,
    hideDelay: 500,
    previewSize: 32,
    stickTo: 'right',
  }),
  preInputMerger: () => ({
    sx: {
      wrapper: {},
    },
  }),
});

export { AutoHideProvider };

export const AutoHide = React.forwardRef<AutoHideRef, AutoHideProps>((inputProps, inputRef) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const {
    previewSize: inputPreviewSize,
    defaultState: inputDefaultState,
    previewDelay,
    hideDelay,
    activeDelay,
    stickTo,
    sx,
    closeEvents,
    ...props
  } = useAutoHideComponentConfig(inputProps);
  const classNames = useAutoHideClassNames(sx);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = React.useState<{ width: number; height: number }>({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const defaultState = React.useMemo(() => {
    switch (inputDefaultState) {
      case 'hidden':
      case 'previewing':
        return inputDefaultState;
      default:
        return 'hidden';
    }
  }, [inputDefaultState]);
  const [state, setState] = React.useState<State>(defaultState);
  const [tempMutableProps, setTempMutableProps] = React.useState<Partial<MutableProps>>({});
  const [debouncedState, setDebouncedState] = React.useState<State>(defaultState);
  const previewSize = React.useMemo(() => Math.max(0, inputPreviewSize), [inputPreviewSize]);
  const delayTimeoutIdRef = React.useRef<number | null>(null);
  const boundaryRect = React.useMemo(() => {
    if (state === 'actived' || StringUtil.isFalsyString(stickTo) || !(rect instanceof DOMRect)) return rect;

    const result = new DOMRect(rect.x, rect.y, rect.width, rect.height);

    stickTo.split('-').forEach((direction) => {
      switch (direction as 'top' | 'right' | 'bottom' | 'left') {
        case 'top':
          result.y += previewSize;
          break;
        case 'bottom':
          result.y -= previewSize;
          break;
        case 'left':
          result.x += previewSize;
          break;
        case 'right':
          result.x -= previewSize;
          break;
        default:
          break;
      }
    });

    return result;
  }, [state, previewSize, rect, stickTo]);
  const styleMap = React.useMemo<Partial<Record<State, React.CSSProperties>>>(() => {
    if (StringUtil.isFalsyString(stickTo) || !(rect instanceof DOMRect)) return {};

    const hiddenOffsetMap: { x: number; y: number } = {
      x: windowSize.width,
      y: windowSize.height,
    };
    const previewingOffsetMap: { x: number; y: number } = {
      x: windowSize.width - previewSize,
      y: windowSize.height - previewSize,
    };
    const activedOffsetMap: { x: number; y: number } = {
      x: windowSize.width - rect.width,
      y: windowSize.height - rect.height,
    };

    return stickTo.split('-').reduce(
      (result, rawKey) => {
        const styleKey = edgeReverseMap[rawKey];

        result.actived[styleKey] = activedOffsetMap[edgeToAxisMap[styleKey]];
        result.hidden[styleKey] = hiddenOffsetMap[edgeToAxisMap[styleKey]];
        result.previewing[styleKey] = previewingOffsetMap[edgeToAxisMap[styleKey]];

        return result;
      },
      { actived: {}, hidden: {}, previewing: {} } as Record<State, React.CSSProperties>,
    );
  }, [windowSize, rect, previewSize, stickTo]);
  const mutableProps = React.useMemo(() => {
    return {
      closeEvents,
      previewDelay,
      hideDelay,
      activeDelay,
      ...tempMutableProps,
    };
  }, [closeEvents, tempMutableProps, previewDelay, hideDelay, activeDelay]);
  const gracefullySetState = React.useCallback(
    (newState: State) => {
      if (state === newState) return;
      setState(newState);
    },
    [state],
  );

  React.useImperativeHandle(inputRef, () => {
    return {
      element: ref.current,
      active: (mutableProps) => {
        setTempMutableProps(mutableProps || {});
        setState('actived');
      },
      deactive: (callback) => {
        if (typeof callback === 'function') {
          callback(() => {
            setTempMutableProps({});
          });
        }
        setState('hidden');
      },
    };
  });

  React.useEffect(() => {
    clearTimeout(delayTimeoutIdRef.current);

    delayTimeoutIdRef.current = setTimeout(
      () => {
        if (debouncedState !== state) setDebouncedState(state);
      },
      (() => {
        switch (state) {
          case 'actived':
            return mutableProps?.activeDelay;
          case 'hidden':
            return mutableProps?.hideDelay;
          case 'previewing':
            return mutableProps?.previewDelay;
          default:
            return 0;
        }
      })(),
    ) as unknown as number;

    return () => {
      clearTimeout(delayTimeoutIdRef.current);
    };
  }, [state, debouncedState, mutableProps?.previewDelay, mutableProps?.activeDelay, mutableProps?.hideDelay]);

  React.useEffect(() => {
    let requestAnimationFrameId: number;
    const start = () => {
      requestAnimationFrameId = requestAnimationFrame(() => {
        const currentRect = ref.current?.getBoundingClientRect?.();

        if (
          currentRect instanceof DOMRect &&
          (currentRect.width !== rect?.width ||
            currentRect.height !== rect?.height ||
            currentRect.top !== rect?.top ||
            currentRect.left !== rect?.left)
        ) {
          setRect(currentRect);
        }

        start();
      });
    };
    const stop = () => {
      cancelAnimationFrame(requestAnimationFrameId);
    };
    const handleWindowSizeChange = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    start();
    window.addEventListener('resize', handleWindowSizeChange, { capture: true });

    return () => {
      stop();
      window.removeEventListener('resize', handleWindowSizeChange);
    };
  }, [rect]);

  React.useEffect(() => {
    if (debouncedState === 'previewing') setState('actived');
  }, [debouncedState]);

  React.useEffect(() => {
    const handleBlur = () => {
      if (mutableProps?.closeEvents?.windowBlur === false) return;
      setState('hidden');
    };
    const handleClick = (event: MouseEvent) => {
      if (mutableProps?.closeEvents?.clickOutside === false) return;
      if (event.composedPath?.()?.includes?.(ref.current)) return;
      setState('hidden');
    };

    window.addEventListener('blur', handleBlur, { capture: true });
    window.addEventListener('click', handleClick, { capture: true });

    return () => {
      window.removeEventListener('blur', handleBlur, { capture: true });
      window.removeEventListener('click', handleClick, { capture: true });
    };
  }, [mutableProps]);

  React.useEffect(() => {
    if (!(boundaryRect instanceof DOMRect)) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (mutableProps?.closeEvents?.mouseleave === false) return;

      if (
        (event.clientX >= boundaryRect.left &&
          event.clientX <= boundaryRect.right &&
          event.clientY >= boundaryRect.top &&
          event.clientY <= boundaryRect.bottom) ||
        event?.composedPath?.()?.includes?.(ref.current)
      ) {
        switch (debouncedState) {
          case 'hidden':
            gracefullySetState('previewing');
            break;
          case 'previewing': {
            gracefullySetState('actived');
            break;
          }
          default:
            break;
        }
      } else {
        switch (debouncedState) {
          case 'previewing': {
            if (defaultState !== 'previewing') gracefullySetState(defaultState);
            break;
          }
          case 'actived': {
            gracefullySetState(defaultState);
            break;
          }
          default:
            break;
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { capture: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
    };
  }, [boundaryRect, debouncedState, defaultState, mutableProps, gracefullySetState]);

  return (
    <div
      ref={ref}
      {...props}
      className={cx(classNames.wrapper, props.className)}
      style={{ transition: 'all 0.3s ease-in-out', ...props?.style, position: 'fixed', ...styleMap[debouncedState] }}
    />
  );
});
