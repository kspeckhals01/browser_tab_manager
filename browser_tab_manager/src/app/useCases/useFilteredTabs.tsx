import { useEffect, useState } from 'react';
import { Tab } from '../../domain/Tab';
import { fetchAllTabs } from '../../infrastructure/chromeTabs';

export function useFilteredTabs(search: string) {
    const [tabs, setTabs] = useState<Tab[]>([]);

    useEffect(() => {
        fetchAllTabs().then(setTabs);
    }, []);

    return tabs.filter(tab =>
        tab.title.toLowerCase().includes(search.toLowerCase())
    );
}