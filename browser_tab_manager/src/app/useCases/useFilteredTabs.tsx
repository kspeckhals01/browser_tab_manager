import { useEffect, useState } from 'react';
import { Tab } from '../../domain/Tab';
import { fetchAllTabs } from '../../infrastructure/chromeTabs';

export function useFilteredTabs(search: string) {
    const [tabs, setTabs] = useState<Tab[]>([]);

    const loadTabs = () => {
        fetchAllTabs().then(setTabs);
    };

    useEffect(() => {
        loadTabs(); // Initial load

        const handleChange = () => loadTabs();

        chrome.tabs.onRemoved.addListener(handleChange);
        chrome.tabs.onUpdated.addListener(handleChange);
        chrome.tabs.onCreated.addListener(handleChange);
        chrome.tabs.onActivated.addListener(handleChange);

        return () => {
            chrome.tabs.onRemoved.removeListener(handleChange);
            chrome.tabs.onUpdated.removeListener(handleChange);
            chrome.tabs.onCreated.removeListener(handleChange);
            chrome.tabs.onActivated.removeListener(handleChange);
        };
    }, []);

    return tabs.filter(tab =>
        tab.title.toLowerCase().includes(search.toLowerCase())
    );
}