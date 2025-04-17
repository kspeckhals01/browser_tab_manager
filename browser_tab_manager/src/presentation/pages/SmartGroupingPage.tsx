import { useEffect, useState } from 'react';
import { Tab } from '../../domain/Tab';
import { fetchAllTabs } from '../../infrastructure/chromeTabs';
import { smartGroupTabs } from '../../infrastructure/smartGroupingService';
import { getStorageAdapter, getUserTier } from '../../infrastructure/storageAdapter';
import { toast } from 'sonner';

type SmartGroup = {
    group_name: string;
    tabs: Tab[];
};

export default function SmartGroupingPage() {
    const [loading, setLoading] = useState(true);
    const [groupedTabs, setGroupedTabs] = useState<SmartGroup[]>([]);
    const [saving, setSaving] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);

    useEffect(() => {
        const runSmartGrouping = async () => {
            const tier = await getUserTier();
            if (tier !== 'pro') {
                setAccessDenied(true);
                setLoading(false);
                return;
            }

            try {
                const tabs = await fetchAllTabs();
                const result = await smartGroupTabs(tabs);
                setGroupedTabs(result);
            } catch (err) {
                toast.error('Failed to group tabs using AI.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        runSmartGrouping();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const storage = await getStorageAdapter();
            for (const group of groupedTabs) {
                await storage.saveGroup(group.group_name, group.tabs);
            }
            toast.success('Smart groups saved successfully!');
        } catch (err) {
            toast.error('Failed to save smart groups.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const updateGroupName = (index: number, newName: string) => {
        setGroupedTabs(prev =>
            prev.map((group, i) =>
                i === index ? { ...group, group_name: newName } : group
            )
        );
    };

    if (loading) {
        return (
            <div className="p-4 text-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-2 text-gray-600 dark:text-gray-300">Grouping your tabs with AI...</p>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="p-4 text-center text-red-600 dark:text-red-400">
                <p className="font-semibold">Smart Grouping is only available for Pro users.</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Upgrade to Tabvana Pro to use AI-powered features.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Smart Grouped Tabs</h2>

            {groupedTabs.map((group, idx) => (
                <div
                    key={idx}
                    className="border p-3 rounded shadow-sm bg-white dark:bg-gray-800"
                >
                    <div className="flex items-center justify-between mb-2">
                        {editingGroupIndex === idx ? (
                            <input
                                className="w-full p-1 text-sm rounded border dark:bg-gray-700 dark:text-white"
                                value={group.group_name}
                                onChange={(e) => updateGroupName(idx, e.target.value)}
                                onBlur={() => setEditingGroupIndex(null)}
                                autoFocus
                            />
                        ) : (
                            <strong
                                className="text-sm text-gray-800 dark:text-white cursor-pointer"
                                onClick={() => setEditingGroupIndex(idx)}
                                title="Click to rename"
                            >
                                {group.group_name}
                            </strong>
                        )}
                    </div>

                    <ul className="space-y-1">
                        {group.tabs.map((tab, i) => (
                            <li
                                key={i}
                                className="text-xs text-gray-600 dark:text-gray-300 truncate"
                            >
                                {tab.title || tab.url}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}

            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                {saving ? 'Saving...' : 'Save Groups'}
            </button>
        </div>
    );
}
