<script>
  import { onMount } from 'svelte'
  import Header from './components/Header.svelte'
  import Notifications from './components/Notifications.svelte'
  import Home from './routes/Home.svelte'
  import Settings from './routes/Settings.svelte'
  import { settings, isConfigured } from './services/settings.service.js'

  /** @type {'loading' | 'home' | 'settings'} */
  let view = $state('loading')

  onMount(async () => {
    await settings.init()
    view = $isConfigured ? 'home' : 'settings'
  })
</script>

<main>
  <Header
    {view}
    canGoBack={$isConfigured}
    onHome={() => (view = 'home')}
    onSettings={() => (view = 'settings')}
  />

  {#if view === 'home'}
    <Home onOpenSettings={() => (view = 'settings')} />
  {:else if view === 'settings'}
    <Settings onDone={() => (view = 'home')} />
  {:else}
    <div class="flex justify-center p-8">
      <span class="loading loading-spinner loading-md"></span>
    </div>
  {/if}

  <Notifications />
</main>
