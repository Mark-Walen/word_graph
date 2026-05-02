import type { Placement } from '@floating-ui/core';

import { Select, type SelectOption } from '../select';

export interface TagSelectProps {
  options: Array<SelectOption>;
  value?: Array<string>;
  defaultValue?: Array<string>;
  placeholder?: string;
  placement?: Placement;
  debug?: boolean;
  onChange?: (value: Array<string>, selectedOptions: Array<SelectOption>) => void;
}

export function TagSelect(props: TagSelectProps) {
  return <Select mode='tags' {...props} />;
}
