// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import type { AnswerRegionProps } from '../../contracts';
import styles from './AnswerRegion.module.css';
export function AnswerRegion({ mode, ariaLabel, children }: AnswerRegionProps) { return <div role="group" aria-label={ariaLabel} data-mode={mode} className={styles.region}>{children}</div>; }
