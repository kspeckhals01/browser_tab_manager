// src/infrastructure/chromeTabs.ts
import { Tab } from '../domain/Tab';

export async function fetchAllTabs(): Promise<Tab[]> {
    return new Promise((resolve) => {
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
