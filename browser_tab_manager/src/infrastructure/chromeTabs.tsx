import { Tab } from '../domain/Tab';

export async function fetchAllTabs(): Promise<Tab[]> {
    return new Promise((resolve) => {
        if (!chrome?.tabs?.query) {
            console.error('chrome.tabs.query is not available');
            return resolve([]);
        }

        chrome.tabs.query({}, (tabs) => {
            resolve(
                tabs.map((t) => ({
                    id: t.id!,
                    title: t.title || '',
                    url: t.url || '',
                    pinned: t.pinned,
                    favIconUrl: t.favIconUrl,
                }))
            );
        });
    });
}