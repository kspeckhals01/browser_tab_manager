import { useEffect, useState } from 'react';
import { getStorageAdapter } from '../../infrastructure/storageAdapter';
import { Tab } from '../../domain/Tab';
import { ChevronDown, ChevronUp, Trash2, ExternalLink, X } from 'lucide-react';
import { TabGroup } from '../../domain/TabGroup';

export default function GroupsView() {
    const [groups, setGroups] = useState<TabGroup[]>([]);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        refreshGroups();
    }, []);

    const refreshGroups = async () => {
        const adapter = await getStorageAdapter();
        const data = await adapter.getAllGroups();
        setGroups(data);
    };

    const handleOpenGroup = (tabs: Tab[]) => {
        for (const tab of tabs) {
            chrome.tabs.create({ url: tab.url });
        }
    };

    const handleDeleteGroup = async (name: string) => {
        const adapter = await getStorageAdapter();
        await adapter.deleteGroup(name);
        refreshGroups();
    };

    const handleRemoveTab = async (groupName: string, tabId: number) => {
        const adapter = await getStorageAdapter();
        if ('removeTabFromGroup' in adapter) {
            try {
                await adapter.removeTabFromGroup(groupName, tabId);
                refreshGroups();
            } catch (err) {
                console.error('Failed to remove tab:', err);
            }
        } else {
            console.warn('Storage adapter does not support tab removal.');
        }
    };

    const handleRenameGroup = async (oldName: string) => {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === oldName) {
            setEditingGroupId(null);
            return;
        }

        const adapter = await getStorageAdapter();
        if ('renameGroup' in adapter) {
            try {
                await adapter.renameGroup(oldName, trimmed);
            } catch (err) {
                console.error('Rename failed:', err);
            }
        } else {
            console.warn('Storage adapter does not support renaming.');
        }

        setEditingGroupId(null);
        setNewName('');
        refreshGroups();
    };

    const toggleGroup = (name: string) => {
        setExpandedGroup(prev => (prev === name ? null : name));
    };

    return (
        <div className="text-sm text-gray-700 dark:text-gray-200 space-y-4">
            {groups.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                    <p className="mb-2">You don't have any groups yet.</p>
                    <p>Create and manage tab groups here.</p>
                </div>
            ) : (
                groups.map(group => (
                    <div
                        key={group.name}
                        className="border border-gray-200 dark:border-gray-700 rounded p-3 shadow-sm bg-white dark:bg-gray-800"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                {editingGroupId === group.name ? (
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <input
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="flex-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter group name"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition"
                                                onClick={() => handleRenameGroup(group.name)}
                                            >
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 text-xs font-medium rounded bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500 transition"
                                                onClick={() => {
                                                    setEditingGroupId(null);
                                                    setNewName('');
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <h2
                                        className="font-semibold cursor-pointer"
                                        onDoubleClick={() => {
                                            setEditingGroupId(group.name);
                                            setNewName(group.name);
                                        }}
                                        title="Double-click to rename"
                                    >
                                        {group.name}
                                    </h2>
                                )}
                                <p className="text-xs text-gray-500">
                                    {group.tabs.length} tab{group.tabs.length !== 1 && 's'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleOpenGroup(group.tabs)}
                                    title="Open all"
                                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                >
                                    <ExternalLink className="w-4 h-4 text-blue-500" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.name)}
                                    title="Toggle tabs"
                                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                >
                                    {expandedGroup === group.name ? (
                                        <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteGroup(group.name)}
                                    title="Delete group"
                                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                            </div>
                        </div>

                        {expandedGroup === group.name && (
                            <ul className="mt-2 space-y-1">
                                {group.tabs.map((tab) => (
                                    <li
                                        key={tab.url}
                                        className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"
                                    >
                                        {tab.favIconUrl && (
                                            <img src={tab.favIconUrl} alt="icon" className="w-4 h-4" />
                                        )}
                                        <span className="truncate flex-1">{tab.title || tab.url}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTab(group.name, tab.id!)}
                                            title="Remove tab"
                                            className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                        >
                                            <X className="w-3 h-3 text-red-500" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
