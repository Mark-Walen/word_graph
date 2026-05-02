import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from '@tarojs/components';
import type { Placement } from '@floating-ui/core';

import { useFloating } from '../popper';
import { flip, offset, shift } from '../popper/taroMiddleware';
import './index.scss';

export interface DropdownMenuItem {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: Array<DropdownMenuItem>;
  placement?: Placement;
  debug?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  closeOnSelect?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (item: DropdownMenuItem, index: number) => void;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function DropdownMenu({
  trigger,
  items,
  placement = 'bottom-start',
  debug = false,
  defaultOpen = false,
  open,
  closeOnSelect = true,
  onOpenChange,
  onSelect,
}: DropdownMenuProps) {
  const isControlled = open !== undefined;
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const mergedOpen = isControlled ? !!open : innerOpen;

  const idsRef = useRef({
    trigger: createId('dropdown-trigger'),
    menu: createId('dropdown-menu'),
  });

  const { floatingStyles, update, x, y } = useFloating({
    placement,
    debug,
    middleware: [offset(8), flip(), shift({padding: 8})],
    elements: {
      reference: idsRef.current.trigger,
      floating: idsRef.current.menu,
    },
  });

  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInnerOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const toggle = () => {
    setOpen(!mergedOpen);
  };

  const close = () => setOpen(false);

  useEffect(() => {
    if (!mergedOpen) {
      return;
    }

    const timer = setTimeout(() => {
      update();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [mergedOpen, update]);

  const menuStyle = useMemo(
    () => ({
      ...floatingStyles,
      position: 'fixed' as const,
      opacity: mergedOpen ? 1 : 0,
      pointerEvents: mergedOpen ? ('auto' as const) : ('none' as const),
      zIndex: 9999,
    }),
    [floatingStyles, mergedOpen],
  );

  return (
    <View className='dropdown-menu'>
      <View id={idsRef.current.trigger} className='dropdown-menu__trigger' onClick={toggle}>
        {trigger}
      </View>

      {mergedOpen ? <View className='dropdown-menu__backdrop' onClick={close} /> : null}

      <View id={idsRef.current.menu} className='dropdown-menu__panel' style={menuStyle}>
        {items.map((item, index) => {
          const handleSelect = () => {
            if (item.disabled) {
              return;
            }

            onSelect?.(item, index);
            if (closeOnSelect) {
              close();
            }
          };

          return (
            <View
              key={item.value}
              className={`dropdown-menu__item${item.disabled ? ' is-disabled' : ''}`}
              onClick={handleSelect}
            >
              <Text className='dropdown-menu__item-label'>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
