chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        await chrome.storage.local.set({ tier: 'free' });
        console.log('Tabvana installed: tier set to free');
    }
});

chrome.runtime.onStartup.addListener(async () => {
    const { tier } = await chrome.storage.local.get('tier');
    if (!tier) {
        await chrome.storage.local.set({ tier: 'free' });
        console.log('Startup fallback: tier set to free');
    }
});