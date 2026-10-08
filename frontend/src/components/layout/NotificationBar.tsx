'use client';

import React from 'react';
import Flashbar from '@cloudscape-design/components/flashbar';
import { useApp } from '@/context/AppContext';

/** Renders the app's toast queue as console flash messages. */
export default function NotificationBar() {
  const { toasts, removeToast } = useApp();
  return (
    <Flashbar
      items={toasts.map((toast) => ({
        id: toast.id,
        type: toast.type,
        content: toast.message,
        dismissible: true,
        dismissLabel: 'Dismiss notification',
        onDismiss: () => removeToast(toast.id),
      }))}
    />
  );
}
