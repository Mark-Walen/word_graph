import { useEffect, useMemo, useRef, useState } from 'react';
import { Input, ScrollView, Text, View } from '@tarojs/components';
import type { Placement } from '@floating-ui/core';
import type * as React from 'react';

import { useFloating } from '../popper';
import { flip, offset, shift } from '../popper/taroMiddleware';
import './index.scss';

export interface SelectOption {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
}

export interface SelectGroup {
  label: React.ReactNode;
  options: Array<SelectOption>;
}

export type SelectOptionNode = SelectOption | SelectGroup;
export type SelectMode = 'default' | 'search' | 'tag' | 'tags';

export interface SelectRenderContext {
  menuNode: React.ReactNode;
  searchValue: string;
  setSearchValue: (value: string) => void;
  selectedValues: Array<string>;
  close: () => void;
  open: boolean;
}

export interface SelectProps {
  options: Array<SelectOptionNode>;
  mode?: SelectMode;
  value?: string | Array<string>;
  defaultValue?: string | Array<string>;
  placeholder?: string;
  searchPlaceholder?: string;
  placement?: Placement;
  debug?: boolean;
  disabled?: boolean;
  loading?: boolean;
  maxMenuHeight?: number;
  open?: boolean;
  defaultOpen?: boolean;
  dropdownRender?: (context: SelectRenderContext) => React.ReactNode;
  onChange?: (value: string | Array<string>, selectedOptions: Array<SelectOption>) => void;
  onSearch?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function isGroup(node: SelectOptionNode): node is SelectGroup {
  return 'options' in node;
}

function flattenOptions(nodes: Array<SelectOptionNode>): Array<SelectOption> {
  return nodes.reduce<Array<SelectOption>>((acc, node) => {
    if (isGroup(node)) {
      acc.push(...node.options);
    } else {
      acc.push(node);
    }

    return acc;
  }, []);
}

function toArray(value: string | Array<string> | undefined): Array<string> {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }

  return [];
}

function toSingle(value: string | Array<string> | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function uniqueValues(values: Array<string>) {
  return Array.from(new Set(values));
}

function matchesSearch(option: SelectOption, searchValue: string) {
  if (!searchValue.trim()) {
    return true;
  }

  const normalized = searchValue.trim().toLowerCase();
  const label = String(option.label).toLowerCase();

  return label.includes(normalized) || option.value.toLowerCase().includes(normalized);
}

function resolveSelectedOptions(options: Array<SelectOption>, values: Array<string>) {
  return values.map(
    (value) =>
      options.find((option) => option.value === value) ?? {
        label: value,
        value,
      },
  );
}

function isCustomValue(value: string, options: Array<SelectOption>) {
  return !options.some((option) => option.value === value);
}

const TAG_INPUT_MIN_WIDTH_RPX = 8;
const TAG_INPUT_MAX_WIDTH_RPX = 108;
const TAG_INPUT_CHAR_WIDTH_RPX = 10;

export function Select({
  options,
  mode = 'default',
  value,
  defaultValue,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search options',
  placement = 'bottom-start',
  debug = false,
  disabled = false,
  loading = false,
  maxMenuHeight = 320,
  open: controlledOpen,
  defaultOpen = false,
  dropdownRender,
  onChange,
  onSearch,
  onOpenChange,
}: SelectProps) {
  const multiple = mode === 'tags';
  const tagMode = mode === 'tag' || mode === 'tags';
  const searchable = mode === 'search' || tagMode;
  const flatOptions = useMemo(() => flattenOptions(options), [options]);
  const isControlledValue = value !== undefined;
  const isControlledOpen = controlledOpen !== undefined;

  const [innerValue, setInnerValue] = useState<string | Array<string>>(
    multiple ? toArray(defaultValue) : toSingle(defaultValue),
  );
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const [searchValue, setSearchValue] = useState('');

  const mergedOpen = isControlledOpen ? !!controlledOpen : innerOpen;
  const currentValue = isControlledValue ? value : innerValue;
  const selectedValues = multiple
    ? uniqueValues(toArray(currentValue))
    : toArray(currentValue).slice(0, 1);

  const triggerIdRef = useRef(createId('select-trigger'));
  const menuIdRef = useRef(createId('select-menu'));

  const { floatingStyles, update, x, y } = useFloating({
    placement,
    debug,
    middleware: [offset(8), flip(), shift({padding: 8})],
    elements: {
      reference: triggerIdRef.current,
      floating: menuIdRef.current,
    },
  });

  const selectedOptions = useMemo(
    () => resolveSelectedOptions(flatOptions, selectedValues),
    [flatOptions, selectedValues],
  );

  const visibleNodes = useMemo(() => {
    if (!searchable) {
      return options;
    }

    return options
      .map((node) => {
        if (!isGroup(node)) {
          return matchesSearch(node, searchValue) ? node : null;
        }

        const filtered = node.options.filter((option) => matchesSearch(option, searchValue));
        return filtered.length > 0 ? {...node, options: filtered} : null;
      })
      .filter(Boolean) as Array<SelectOptionNode>;
  }, [options, searchable, searchValue]);

  const setOpen = (nextOpen: boolean) => {
    if (disabled || loading) {
      return;
    }
    if (!isControlledOpen) {
      setInnerOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const close = () => setOpen(false);
  const openMenu = () => setOpen(true);
  const toggleMenu = () => setOpen(!mergedOpen);

  const commitValue = (nextValue: string | Array<string>) => {
    if (!isControlledValue) {
      setInnerValue(nextValue);
    }
  };

  const emitChange = (nextValues: Array<string>) => {
    commitValue(multiple ? nextValues : (nextValues[0] ?? ''));
    onChange?.(
      multiple ? nextValues : (nextValues[0] ?? ''),
      resolveSelectedOptions(flatOptions, nextValues),
    );
  };

  const handleOptionSelect = (option: SelectOption) => {
    if (option.disabled) {
      return;
    }

    if (multiple) {
      const exists = selectedValues.includes(option.value);
      const nextValues = exists
        ? selectedValues.filter((item) => item !== option.value)
        : [...selectedValues, option.value];
      emitChange(uniqueValues(nextValues));
      setSearchValue('');
      return;
    }

    emitChange([option.value]);
    if (mode === 'search') {
      setSearchValue(String(option.label));
    } else {
      setSearchValue('');
    }
    close();
  };

  const handleConfirmSearch = () => {
    const text = searchValue.trim();
    if (!text) {
      return;
    }

    const existing = flatOptions.find(
      (option) => String(option.label) === text || option.value === text,
    );
    const nextValue = existing?.value ?? text;

    if (mode === 'default') {
      if (existing) {
        handleOptionSelect(existing);
      }
      return;
    }

    if (mode === 'search') {
      if (existing) {
        handleOptionSelect(existing);
      }
      return;
    }

    if (mode === 'tag') {
      emitChange([nextValue]);
      setSearchValue('');
      close();
      return;
    }

    const nextValues = uniqueValues([...selectedValues, nextValue]);
    emitChange(nextValues);
    setSearchValue('');
    openMenu();
  };

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
  }, [mergedOpen, searchValue, update]);

  const menuNode = (
    <ScrollView className='select__scroll' scrollY style={{maxHeight: `${maxMenuHeight}px`}}>
      {visibleNodes.length > 0 ? (
        visibleNodes.map((node) => {
          if (isGroup(node)) {
            return (
              <View key={String(node.label)} className='select__group'>
                <Text className='select__group-label'>{node.label}</Text>
                <View className='select__group-list'>
                  {node.options.map((option) => {
                    const selected = selectedValues.includes(option.value);

                    return (
                      <View
                        key={option.value}
                        className={`select__item${selected ? ' is-selected' : ''}${option.disabled ? ' is-disabled' : ''}`}
                        onClick={() => handleOptionSelect(option)}
                      >
                        <Text className='select__item-label'>{option.label}</Text>
                        {multiple ? <Text className='select__check'>{selected ? '✓' : ''}</Text> : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          }

          const selected = selectedValues.includes(node.value);

          return (
            <View
              key={node.value}
              className={`select__item${selected ? ' is-selected' : ''}${node.disabled ? ' is-disabled' : ''}`}
              onClick={() => handleOptionSelect(node)}
            >
              <Text className='select__item-label'>{node.label}</Text>
              {multiple ? <Text className='select__check'>{selected ? '✓' : ''}</Text> : null}
            </View>
          );
        })
      ) : (
        <View className='select__empty'>
          <Text className='select__empty-text'>No options</Text>
        </View>
      )}
    </ScrollView>
  );

  const dropdownNode = dropdownRender
    ? dropdownRender({
        menuNode,
        searchValue,
        setSearchValue,
        selectedValues,
        close,
        open: mergedOpen,
      })
    : (
      <>
        {menuNode}
      </>
    );

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

  const singleLabel = selectedOptions[0]?.label ?? '';
  const tagInlineInputWidth = useMemo(() => {
    const dynamicWidth = searchValue.length * TAG_INPUT_CHAR_WIDTH_RPX + TAG_INPUT_MIN_WIDTH_RPX;
    const clampedWidth = Math.min(
      TAG_INPUT_MAX_WIDTH_RPX,
      Math.max(TAG_INPUT_MIN_WIDTH_RPX, dynamicWidth),
    );

    return `${clampedWidth}rpx`;
  }, [searchValue]);

  const triggerContent =
    mode === 'default' || mode === 'search' ? (
      <View className='select__field'>
        {mode === 'search' ? (
          <Input
            className={`select__search-trigger${singleLabel ? '' : ' is-placeholder'}`}
            value={mergedOpen ? searchValue : (searchValue || String(singleLabel || ''))}
            placeholder={placeholder}
            disabled={disabled || loading}
            onClick={(event) => {
              event.stopPropagation?.();
              openMenu();
            }}
            onFocus={openMenu}
            onInput={(event) => {
              const nextValue = event.detail.value;
              setSearchValue(nextValue);
              onSearch?.(nextValue);
              openMenu();
            }}
            onConfirm={handleConfirmSearch}
          />
        ) : (
          <Text className={`select__value${singleLabel ? '' : ' is-placeholder'}`}>
            {loading ? 'Loading...' : (singleLabel || placeholder)}
          </Text>
        )}
        <Text className='select__caret'>{loading ? '…' : '▾'}</Text>
      </View>
    ) : (
      <View className='select__field select__field--tags'>
        <View className='select__chips'>
          {selectedOptions.length > 0 ? (
            selectedOptions.map((option) => {
              const removable = mode === 'tags';
              return (
                <View key={option.value} className='select__chip'>
                  <Text className='select__chip-label'>{option.label}</Text>
                  {removable ? (
                    <Text
                      className='select__chip-close'
                      onClick={(event) => {
                        event.stopPropagation?.();
                        const nextValues = selectedValues.filter((item) => item !== option.value);
                        emitChange(nextValues);
                      }}
                    >
                      ×
                    </Text>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text className='select__placeholder'>{placeholder}</Text>
          )}
          <Input
            className='select__inline-input'
            value={searchValue}
            style={{width: tagInlineInputWidth}}
            placeholder={selectedOptions.length > 0 ? '' : placeholder}
            onClick={(event) => {
              event.stopPropagation?.();
              openMenu();
            }}
            onFocus={openMenu}
            onInput={(event) => {
              const nextValue = event.detail.value;
              setSearchValue(nextValue);
              onSearch?.(nextValue);
              openMenu();
            }}
            onConfirm={handleConfirmSearch}
          />
        </View>
        <Text className='select__caret'>▾</Text>
      </View>
    );

  return (
    <View className={`select select--${mode}`}>
      <View
        id={triggerIdRef.current}
        className={`select__trigger${disabled ? ' is-disabled' : ''}`}
        onClick={toggleMenu}
      >
        {triggerContent}
      </View>

      {mergedOpen && !disabled && !loading ? <View className='select__backdrop' onClick={close} /> : null}

      <View id={menuIdRef.current} className='select__panel' style={menuStyle}>
        {dropdownNode}
      </View>
    </View>
  );
}
