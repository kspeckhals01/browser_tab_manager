import { useState } from 'react';
import { Tab } from '../../domain/Tab';
import { getStorageAdapter } from '../../infrastructure/storageAdapter';
import { toast } from 'sonner';

type Props = {
    selectedTabs: Tab[];
    onClearSelection: () => void;
};

export default function SaveGroupForm({ selectedTabs, onClearSelection }: Props) {
    const [groupName, setGroupName] = useState('');

    const handleSave = async () => {
        if (!groupName.trim()) {
            toast.error('Please enter a group name.');
            return;
        }

        try {
            const adapter = await getStorageAdapter();
            await adapter.saveGroup(groupName.trim(), selectedTabs);
            toast.success(`Group "${groupName}" saved!`);
            setGroupName('');
            onClearSelection();
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error(err.message);
            } else {
                toast.error('Failed to save group.');
            }
        }
    };

    return (
        <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 shadow-sm space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-200">
                <strong>{selectedTabs.length}</strong> tab{selectedTabs.length !== 1 && 's'} selected
            </p>

            <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
                onClick={handleSave}
                className="w-full px-3 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
            >
                Save Group
            </button>
        </div>
    );
}
