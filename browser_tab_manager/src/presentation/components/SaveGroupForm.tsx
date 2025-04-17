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
        <div className="mt-4 p-3 border rounded bg-white dark:bg-gray-800 shadow-sm space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-200">
                <strong>{selectedTabs.length}</strong> tab{selectedTabs.length !== 1 && 's'} selected
            </p>
            <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="w-full px-2 py-1 border rounded text-sm bg-gray-50 dark:bg-gray-700 dark:text-white"
            />
            <button
                onClick={handleSave}
                className="w-full px-3 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
                Save Group
            </button>
        </div>
    );
}
