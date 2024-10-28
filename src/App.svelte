<script>
  import Router from 'svelte-spa-router'
  import Header from './components/Header.svelte'
  import Alert from './components/Alert.svelte'
  import Home from './routes/Home.svelte'
  import Settings from './routes/Settings.svelte'
  import { settings } from './services/settings.service.js'
  import { onMount } from 'svelte'

  const routes = {
    '/': Home,
    '/settings': Settings
  }

  let isInitialized = false;

  onMount(async () => {
    await settings.init();
    isInitialized = true;
  });
</script>

<main class="w-[350px] relative">
  <Alert />
  <Header />
  {#if isInitialized}
    <Router {routes} />
  {:else}
    <div class="flex justify-center items-center p-8">
      <span class="loading loading-spinner loading-md"></span>
    </div>
  {/if}
</main>
