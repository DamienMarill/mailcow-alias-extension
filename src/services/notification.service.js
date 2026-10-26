import { writable } from 'svelte/store';

// The popup is small: older messages give way to the newest ones.
const MAX_VISIBLE = 2;

function createNotificationStore() {
    const { subscribe, update } = writable([]);
    let nextId = 0;

    const remove = (id) => {
        update(notifications => notifications.filter(n => n.id !== id));
    };

    const add = (message, type = 'info', timeout = 4000) => {
        const id = nextId++;
        update(notifications => [...notifications, { id, message, type }].slice(-MAX_VISIBLE));
        if (timeout) setTimeout(() => remove(id), timeout);
    };

    return {
        subscribe,
        add,
        remove,
        success: (message) => add(message, 'success', 3000),
        error: (message) => add(message, 'error', 6000),
    };
}

export const notifications = createNotificationStore();
