import React from 'react';
import { SwipeActionsRow } from './SwipeActionsRow';

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  enabled?: boolean;
};

/** Обратная совместимость: только удаление (без «Изм.»). */
export function SwipeDeleteRow({ children, onDelete, enabled = true }: Props) {
  return (
    <SwipeActionsRow enabled={enabled} onDelete={onDelete}>
      {children}
    </SwipeActionsRow>
  );
}
