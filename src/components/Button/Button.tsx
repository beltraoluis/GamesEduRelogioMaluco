// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'soft' | 'go' | 'icon' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly icon?: ReactNode;
  readonly children?: ReactNode;
}

export function Button({
  variant = 'soft',
  size = 'md',
  type = 'button',
  className,
  icon,
  children,
  ...rest
}: ButtonProps): ReactElement {
  const variantClass = styles[variant];
  const sizeClass = styles[size];
  const mergedClassName = [styles.button, variantClass, sizeClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={mergedClassName}
      data-variant={variant}
      data-size={size}
      data-motion="spring"
      {...rest}
    >
      {icon !== undefined && icon !== null ? <span className={styles.iconWrap}>{icon}</span> : null}
      {children}
    </button>
  );
}

export default Button;
