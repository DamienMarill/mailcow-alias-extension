<script>
    import { onMount } from 'svelte';
    import { domains, mailboxes, mailcowService } from '../services/mailcow.service.js';
    import { notifications } from '../services/notification.service.js';

    let aliasName = '';
    let selectedDomain = '';
    let selectedMailbox = '';
    let isLoading = false;

    function cleanDomainName(url) {
        try {
            const hostname = new URL(url).hostname;

            // Enlève le www. s'il existe
            let cleanedDomain = hostname.replace(/^www\./, '');

            // Enlève le TLD (dernière partie)
            const parts = cleanedDomain.split('.');
            parts.pop(); // Enlève le TLD

            // Rejoins les parties restantes avec des points
            cleanedDomain = parts.join('.');

            // Nettoie les caractères spéciaux sauf les points
            return cleanedDomain
                .replace(/[^a-z0-9.]/gi, '') // Garde les lettres, chiffres et points
                .toLowerCase(); // Force en minuscules
        } catch (error) {
            console.error('Error parsing URL:', error);
            return '';
        }
    }

    async function getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                lastFocusedWindow: true
            });

            if (tab?.url) {
                aliasName = cleanDomainName(tab.url);
                // Optionnel : ajouter un suffixe aléatoire pour plus d'unicité
                // aliasName += Math.floor(Math.random() * 1000);
            }
        } catch (error) {
            console.error('Error getting current tab:', error);
            notifications.add('Impossible de récupérer l\'URL du site', 'error');
        }
    }

    async function loadData() {
        isLoading = true;
        try {
            await Promise.all([
                mailcowService.loadDomains(),
                mailcowService.loadMailboxes(),
                getCurrentTab()
            ]);

            // Sélectionne le premier domaine par défaut
            if ($domains.length > 0 && !selectedDomain) {
                selectedDomain = $domains[0];
            }

            // Optionnel : Sélectionne la première boîte mail par défaut
            if ($mailboxes.length > 0 && !selectedMailbox) {
                selectedMailbox = $mailboxes[0];
            }
        } catch (error) {
            notifications.add('Erreur lors du chargement des données', 'error');
        } finally {
            isLoading = false;
        }
    }

    async function handleSubmit() {
        if (!aliasName || !selectedDomain || !selectedMailbox) {
            notifications.add('Veuillez remplir tous les champs', 'error');
            return;
        }

        try {
            await mailcowService.createAlias(aliasName, selectedDomain, selectedMailbox);
            // Optionnel : reset seulement le nom de l'alias après création
            aliasName = '';
            // Recharge la liste des alias si tu en as une
        } catch (error) {
            console.error('Error creating alias:', error);
        }
    }

    onMount(loadData);
</script>

<div class="p-4">
    {#if isLoading}
        <div class="flex justify-center p-4">
            <span class="loading loading-spinner loading-md"></span>
        </div>
    {:else}
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
            <div class="flex items-center gap-2">
                <div class="form-control flex-1">
                    <input
                            type="text"
                            bind:value={aliasName}
                            placeholder="alias"
                            class="input input-bordered w-full"
                            required
                    />
                </div>
                <span class="text-lg">@</span>
                <div class="form-control flex-1">
                    <select
                            bind:value={selectedDomain}
                            class="select select-bordered w-full"
                            required
                    >
                        <option value="">Domaine</option>
                        {#each $domains as domain}
                            <option value={domain}>{domain}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="form-control">
                <select
                        bind:value={selectedMailbox}
                        class="select select-bordered w-full"
                        required
                >
                    <option value="">Boîte mail</option>
                    {#each $mailboxes as mailbox}
                        <option value={mailbox}>{mailbox}</option>
                    {/each}
                </select>
            </div>

            <button
                    type="submit"
                    class="btn btn-primary w-full"
                    disabled={!aliasName || !selectedDomain || !selectedMailbox}
            >
                Créer l'alias
            </button>
        </form>
    {/if}
</div>
