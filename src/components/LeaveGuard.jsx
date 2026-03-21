// LeaveGuard.jsx

import { useEffect } from 'react';
import * as RR from 'react-router-dom';

/**
 * LeaveGuard
 * - Blocks in-app navigation with react-router's blocker (called unconditionally).
 * - Warns on tab close/refresh via beforeunload.
 */
export default function LeaveGuard({
  when,
  message = 'Your timer is running or paused. If you leave now, your current time may be lost. Leave anyway?'
}) {
  // Pick stable or unstable blocker once; call it on every render.
  const useBlockerImpl = RR.useBlocker ?? RR.unstable_useBlocker;
  const blocker = typeof useBlockerImpl === 'function' ? useBlockerImpl(when) : null;

  // Intercept in-app route changes
  useEffect(() => {
    if (!blocker || blocker.state !== 'blocked') return;
    const ok = window.confirm(message);
    if (ok) blocker.proceed();
    else blocker.reset();
  }, [blocker, message]);

  // Intercept tab close / refresh
  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);

  return null;
}
