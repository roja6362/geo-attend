// Central Realtime Multi-Device Synchronization Engine
// Syncs live lecture sessions, rollcall streams, and student registrations
// across all devices (Mobile <-> Laptop) and browser tabs 24/7!

const SYNC_TOPIC = 'geoattend_sync_live_v1';
const SYNC_URL = `https://ntfy.sh/${SYNC_TOPIC}`;

// Unique device ID for current tab/window to prevent self-echoing
const DEVICE_ID = (() => {
  try {
    let id = sessionStorage.getItem('geoattend_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      sessionStorage.setItem('geoattend_device_id', id);
    }
    return id;
  } catch {
    return 'dev_' + Date.now();
  }
})();

// Native BroadcastChannel for 0ms instant tab communication on the same browser
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('geoattend_bus') : null;

// Registry of callbacks listening for sync events in the current window
const listeners = new Set();

export const onSyncEvent = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const dispatchLocal = (event) => {
  listeners.forEach((cb) => {
    try {
      cb(event);
    } catch (e) {
      console.warn('RealtimeSync callback error:', e);
    }
  });
};

// Broadcast event to both local tabs (BroadcastChannel) and physical devices (Cloud SSE)
export const broadcastEvent = async (action, payload = {}) => {
  const event = {
    action,
    payload,
    senderId: DEVICE_ID,
    timestamp: Date.now()
  };

  // 1. Dispatch to current window
  dispatchLocal(event);

  // 2. Dispatch to other tabs on same device/browser
  if (bc) {
    try {
      bc.postMessage(event);
    } catch (e) {}
  }

  // 3. Publish to cloud SSE channel for cross-device mobile/laptop sync
  try {
    fetch(SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Title': action
      },
      body: JSON.stringify(event)
    }).catch(() => {});
  } catch (e) {}
};

// Process an incoming event from another tab or mobile device
function handleIncomingEvent(event) {
  if (!event || !event.action) return;
  const { action, payload } = event;

  if (action === 'START_SESSION' && payload?.session) {
    try {
      localStorage.setItem('geoattend_active_session', JSON.stringify(payload.session));
      localStorage.setItem('geoattend_active_rollcall', JSON.stringify([]));
    } catch (e) {}
  } else if (action === 'END_SESSION') {
    try {
      localStorage.removeItem('geoattend_active_session');
    } catch (e) {}
  } else if (action === 'STUDENT_CHECKIN' && payload?.record) {
    try {
      const rollcall = JSON.parse(localStorage.getItem('geoattend_active_rollcall') || '[]');
      const filtered = rollcall.filter(r => 
        r.student_id !== payload.record.student_id && 
        r.roll_no !== payload.record.roll_no
      );
      filtered.unshift(payload.record);
      localStorage.setItem('geoattend_active_rollcall', JSON.stringify(filtered));
    } catch (e) {}

    // ALSO save to mock history so Teacher & Admin tables immediately show the punch!
    try {
      const history = JSON.parse(localStorage.getItem('geoattend_mock_history') || '[]');
      const filteredHist = history.filter(h => 
        h.id !== payload.record.id && 
        !(h.student_id === payload.record.student_id && h.subject_code === payload.record.subject_code && h.date === payload.record.date)
      );
      filteredHist.unshift(payload.record);
      localStorage.setItem('geoattend_mock_history', JSON.stringify(filteredHist));
    } catch (e) {}

    // Update active session counts
    try {
      const sess = JSON.parse(localStorage.getItem('geoattend_active_session') || 'null');
      if (sess) {
        sess.total_marked = (sess.total_marked || 0) + 1;
        if (payload.record.status === 'PRESENT' || payload.record.final_status === 'PRESENT') {
          sess.present_count = (sess.present_count || 0) + 1;
        }
        localStorage.setItem('geoattend_active_session', JSON.stringify(sess));
      }
    } catch (e) {}
  } else if (action === 'REGISTER_USER' && payload?.user) {
    try {
      const users = JSON.parse(localStorage.getItem('geoattend_custom_users') || '[]');
      const idx = users.findIndex(u => (u.email && payload.user.email && u.email.toLowerCase() === payload.user.email.toLowerCase()) || (u.id && u.id === payload.user.id));
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...payload.user };
      } else {
        users.push(payload.user);
      }
      localStorage.setItem('geoattend_custom_users', JSON.stringify(users));

      // Cache face portrait if present
      if (payload.user.face_image) {
        if (payload.user.id) localStorage.setItem(`geoattend_face_${payload.user.id}`, payload.user.face_image);
        if (payload.user.email) localStorage.setItem(`geoattend_face_${payload.user.email.toLowerCase().trim()}`, payload.user.face_image);
        if (payload.user.usn) localStorage.setItem(`geoattend_face_${payload.user.usn.toLowerCase().trim()}`, payload.user.face_image);
      }
    } catch (e) {}
  } else if (action === 'REQUEST_SYNC') {
    // If we have an active session, share it so the newly opened device syncs immediately!
    try {
      const active = JSON.parse(localStorage.getItem('geoattend_active_session') || 'null');
      if (active && (active.is_active || active.status === 'ACTIVE')) {
        const rollcall = JSON.parse(localStorage.getItem('geoattend_active_rollcall') || '[]');
        broadcastEvent('START_SESSION', { session: active, rollcall });
      }
    } catch (e) {}
  }

  // Notify listeners in current component
  dispatchLocal(event);
}

let isInitialized = false;
let eventSource = null;

export const initRealtimeSync = () => {
  if (isInitialized) return;
  isInitialized = true;

  // 0. Replay past events from cloud ntfy so freshly opened device (mobile/laptop) loads all records!
  const loadHistoricalSync = async () => {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch(`${SYNC_URL}/json?poll=1`, { cache: 'no-store' });
      if (!res.ok) return;
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          let event = null;
          if (item.message) {
            try { event = JSON.parse(item.message); } catch { event = item; }
          } else {
            event = item;
          }
          if (event && event.action && event.senderId !== DEVICE_ID) {
            handleIncomingEvent(event);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Initial cloud historical sync warning:', e);
    }
  };

  loadHistoricalSync();

  // 1. Listen for BroadcastChannel events from other tabs
  if (bc) {
    bc.onmessage = (msgEvent) => {
      const event = msgEvent.data;
      if (event && event.senderId !== DEVICE_ID) {
        handleIncomingEvent(event);
      }
    };
  }

  // 2. Listen for Storage events (fallback for storage changes across tabs)
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === 'geoattend_active_session') {
        const session = e.newValue ? JSON.parse(e.newValue) : null;
        dispatchLocal({ 
          action: session ? 'START_SESSION' : 'END_SESSION', 
          payload: { session }, 
          senderId: 'storage' 
        });
      } else if (e.key === 'geoattend_active_rollcall') {
        const rollcall = e.newValue ? JSON.parse(e.newValue) : [];
        dispatchLocal({ 
          action: 'ROLLCALL_UPDATED', 
          payload: { rollcall }, 
          senderId: 'storage' 
        });
      }
    });
  }

  // 3. Connect to global SSE for physical devices (Mobile phone <-> Laptop)
  const connectSSE = () => {
    if (typeof EventSource === 'undefined') return;
    try {
      if (eventSource) {
        eventSource.close();
      }
      eventSource = new EventSource(`${SYNC_URL}/sse`);
      eventSource.onmessage = (msg) => {
        try {
          const raw = JSON.parse(msg.data);
          let event = null;
          if (raw.message) {
            try {
              event = JSON.parse(raw.message);
            } catch {
              event = raw;
            }
          } else {
            event = raw;
          }
          if (event && event.action && event.senderId !== DEVICE_ID) {
            handleIncomingEvent(event);
          }
        } catch (e) {}
      };
      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        setTimeout(connectSSE, 5000);
      };
    } catch (e) {}
  };

  connectSSE();

  // 4. Send initial sync request to discover any active session
  setTimeout(() => {
    broadcastEvent('REQUEST_SYNC', {});
  }, 1000);
};

export default {
  initRealtimeSync,
  onSyncEvent,
  broadcastEvent
};

