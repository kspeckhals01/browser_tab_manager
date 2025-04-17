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
                                    <div className="flex gap-2 items-center">
                                        <input
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="text-sm border px-2 py-1 rounded"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            className="text-blue-600 text-xs"
                                            onClick={() => handleRenameGroup(group.name)}
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            className="text-gray-500 text-xs"
                                            onClick={() => {
                                                setEditingGroupId(null);
                                                setNewName('');
                                            }}
                                        >
                                            Cancel
                                        </button>
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
                                >
                                    <ExternalLink className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.name)}
                                    title="Toggle tabs"
                                >
                                    {expandedGroup === group.name ? (
                                        <ChevronUp className="w-4 h-4 text-gray-500" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteGroup(group.name)}
                                    title="Delete group"
                                >
                                    <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
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
                                            className="text-red-400 hover:text-red-600"
                                            title="Remove tab"
                                        >
                                            <X className="w-3 h-3" />
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
