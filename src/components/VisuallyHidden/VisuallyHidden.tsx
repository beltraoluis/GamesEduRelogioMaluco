// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

import styles from './VisuallyHidden.module.css';

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  readonly as?: 'span' | 'div';
  readonly children: ReactNode;
}

export function VisuallyHidden({
  as: Component = 'span',
  className,
  children,
  ...rest
}: VisuallyHiddenProps): ReactElement {
  const mergedClassName = [styles.visuallyHidden, className].filter(Boolean).join(' ');
  return (
    <Component className={mergedClassName} {...rest}>
      {children}
    </Component>
  );
}

export default VisuallyHidden;
