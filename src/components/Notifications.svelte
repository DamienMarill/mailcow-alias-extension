<script>
    import { fly } from 'svelte/transition';
    import { notifications } from '../services/notification.service.js';

    // Full class names so Tailwind keeps them in the build.
    const ALERT_CLASSES = {
        success: 'alert-success',
        error: 'alert-error',
        warning: 'alert-warning',
        info: 'alert-info',
    };
</script>

<div class="fixed inset-x-0 bottom-0 z-50 space-y-2 p-3" aria-live="polite">
    {#each $notifications as notification (notification.id)}
        <div
            class="alert {ALERT_CLASSES[notification.type]} flex items-center justify-between gap-2 py-2 text-left text-sm shadow-lg"
            role={notification.type === 'error' ? 'alert' : 'status'}
            transition:fly={{ y: 20, duration: 200 }}
        >
            <span>{notification.message}</span>
            <button
                class="btn btn-square btn-ghost btn-xs"
                onclick={() => notifications.remove(notification.id)}
                aria-label="Fermer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    {/each}
</div>
