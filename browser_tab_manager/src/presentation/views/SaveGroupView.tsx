import { useEffect, useState } from 'react';
import { Tab } from '../../domain/Tab';
import { fetchAllTabs } from '../../infrastructure/chromeTabs';
import { toast } from 'sonner';
import { getStorageAdapter } from '../../infrastructure/storageAdapter';
import { StorageAdapter } from '../../types/storageTypes';
import { validateUserTier } from '../../utils/validateUserTier'


export default function SaveGroupView() {
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [groupName, setGroupName] = useState('');
    const [groupCount, setGroupCount] = useState(0);
    const [storage, setStorage] = useState<StorageAdapter | null>(null);
    const [loading, setLoading] = useState(true);
    const [tier, setTier] = useState<'free' | 'pro' | 'expired'>('free');


    useEffect(() => {
        const load = async () => {
            const adapter = await getStorageAdapter();
            setStorage(adapter);
            const allTabs = await fetchAllTabs();
            const groups = await adapter.getAllGroups();
            const validatedTier = await validateUserTier(); // real source of truth
            setTier(validatedTier);
            setTabs(allTabs);
            setGroupCount(groups.length);
            setLoading(false);
        };
        load();
    }, []);

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((tabId) => tabId !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (!storage) return;

        const selectedTabs = tabs.filter((t) => selectedIds.includes(t.id!));

        const tier = await validateUserTier();

        if (tier === 'free' && groupCount >= 2) {
            toast.error('Free tier users can only save up to 2 groups. Upgrade to unlock more.');
            return;
        }

        if (!groupName.trim()) {
            toast.error('Enter a group name');
            return;
        }

        if (selectedTabs.length === 0) {
            toast.error('Select at least one tab');
            return;
        }

        try {
            const adapter = await getStorageAdapter();
            const result = await adapter.saveGroup(groupName, selectedTabs);

            switch (result) {
                case 'cloud':
                    toast.success(`Group "${groupName}" saved to cloud!`);
                    break;
                case 'local':
                    toast.success(`Group "${groupName}" saved locally.`);
                    break;
                case 'duplicate':
                    toast.error(`A group named "${groupName}" already exists. Choose a different name.`);
                    return;
                case 'error':
                default:
                    toast.error('Failed to save group. Please try again.');
                    return;
            }

            setGroupName('');
            setSelectedIds([]);

            const updatedGroups = await storage.getAllGroups();
            setGroupCount(updatedGroups.length);
        } catch (err) {
            console.error('Save error:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to save group.');
        }
    };


    if (loading || !storage) {
        return (
            <div className="p-4 text-center flex items-center justify-center flex-col gap-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading Tabvana Storage...</p>
            </div>
        );
    }

    return (

        <div className="space-y-4">
            <div>
                {groupCount > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {tier === 'free'
                            ? `You have ${groupCount} of 2 groups.`
                            : `You have ${groupCount} saved ${groupCount === 1 ? 'group' : 'groups'}.`}
                    </p>
                )}

                <input
                    type="text"
                    placeholder="Group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 dark:text-white"
                />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
                {tabs.map((tab) => (
                    <label
                        key={tab.id}
                        className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(tab.id!)}
                            onChange={() => toggleSelect(tab.id!)}
                        />
                        {tab.favIconUrl && (
                            <img src={tab.favIconUrl} alt="favicon" className="w-4 h-4" />
                        )}
                        <span className="text-sm truncate">{tab.title || tab.url}</span>
                    </label>
                ))}
            </div>

            <button
                onClick={handleSave}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Save Group
            </button>
        </div>
    );
}
