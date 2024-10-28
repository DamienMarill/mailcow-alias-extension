<script>
    import { notifications } from '../services/notification.service.js';
</script>

<div class="hidden alert alert-error alert-info alert-success alert-warning"></div>

{#if $notifications.length > 0}
    <div class="fixed top-0 right-0 p-4 space-y-2 max-w-full w-full z-50">
        {#each $notifications as notification (notification.id)}
            <div class="alert alert-{notification.type} flex justify-between items-center shadow-lg" role="alert" transition:fly="{{ y: -20, duration: 300 }}">
                <div class="flex items-center gap-2">
                    {#if notification.type === 'success'}
                        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    {:else if notification.type === 'error'}
                        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    {/if}
                    <span>{notification.message}</span>
                </div>
                <div>
                    <button
                            class="btn btn-square btn-ghost btn-xs"
                            on:click={() => notifications.remove(notification.id)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        {/each}
    </div>
{/if}
