import { Tab } from '../../domain/Tab';
import { X, Pin, PinOff } from 'lucide-react';

type Props = {
    tabs: Tab[];
    selectedTabIds?: number[];
    onSelectTab?: (tabId: number) => void;
};

function groupTabsByDomain(tabs: Tab[]) {
    const grouped: Record<string, Tab[]> = {};
    for (const tab of tabs) {
        try {
            const domain = new URL(tab.url || '').hostname;
            if (!grouped[domain]) grouped[domain] = [];
            grouped[domain].push(tab);
        } catch {
            if (!grouped['unknown']) grouped['unknown'] = [];
            grouped['unknown'].push(tab);
        }
    }
    return grouped;
}

export default function TabList({ tabs, selectedTabIds, onSelectTab }: Props) {
    const handleCloseTab = (tabId: number) => {
        chrome.tabs.remove(tabId);
    };

    const handleTabClick = (tabId: number) => {
        chrome.tabs.update(tabId, { active: true });
    }

    const handleTogglePin = (tabId: number, pinned: boolean) => {
        chrome.tabs.update(tabId, { pinned: !pinned });
    };

    const groupedTabs = groupTabsByDomain(tabs);

    return (
        <div className="mt-4 space-y-6">
            {Object.entries(groupedTabs).map(([domain, domainTabs]) => (
                <div key={domain}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 pl-1">
                        {domain}
                    </p>
                    <div className="space-y-2">
                        {domainTabs.map((tab) => (

                            <div
                                key={tab.id}
                                className="relative flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                onClick={() => handleTabClick(tab.id)}
                            >
                                {onSelectTab && selectedTabIds && (
                                    <input
                                        type="checkbox"
                                        checked={selectedTabIds.includes(tab.id!)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            onSelectTab(tab.id!);
                                        }}
                                        className="form-checkbox text-blue-600 dark:text-blue-400"
                                    />
                                )}
                                {/* Favicon */}
                                {tab.favIconUrl ? (
                                    <img
                                        src={tab.favIconUrl}
                                        alt=""
                                        className="w-5 h-5 rounded-sm"
                                    />
                                ) : (
                                    <div className="w-5 h-5 bg-gray-300 rounded-sm" />
                                )}

                                {/* Tab content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                        {tab.title || 'Untitled Tab'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {tab.url}
                                    </p>
                                </div>

                                {/* Pin toggle */}
                                <button
                                    onClick={() => handleTogglePin(tab.id!, tab.pinned)}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-indigo-600"
                                    title={tab.pinned ? 'Unpin' : 'Pin'}
                                >
                                    {tab.pinned ? (
                                        <PinOff className="w-4 h-4" />
                                    ) : (
                                        <Pin className="w-4 h-4" />
                                    )}
                                </button>

                                {/* Close */}
                                <button
                                    onClick={() => handleCloseTab(tab.id!)}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-red-600"
                                    title="Close tab"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
