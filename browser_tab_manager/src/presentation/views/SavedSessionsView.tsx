import { useEffect, useState } from 'react';
import { getStorageAdapter, getUserTier } from '../../infrastructure/storageAdapter';
import { Tab } from '../../domain/Tab';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

type SessionSummary = {
    name: string;
    savedAt?: string;
    createAt?: string;
    tabs: Tab[];
};

const SESSION_LIMIT_FREE = 5;

export default function SavedSessionsView() {
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [tier, setTier] = useState<'free' | 'pro' | 'expired'>('free');

    const refreshSessions = async () => {
        const adapter = await getStorageAdapter();
        const allSessions = await adapter.getAllSessions();
        const userTier = await getUserTier();

        setSessions(allSessions);
        setTier(userTier);
    };

    useEffect(() => {
        refreshSessions();
    }, []);

    const handleDelete = async (name: string) => {
        const adapter = await getStorageAdapter();
        await adapter.deleteSession(name);
        toast.success(`Session "${name}" deleted.`);
        refreshSessions();
    };

    const toggleExpand = (name: string) => {
        setExpandedSession((prev) => (prev === name ? null : name));
    };

    const renderHeader = () => {
        if (tier === 'free') {
            return (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    You have {sessions.length} of {SESSION_LIMIT_FREE} sessions.
                </p>
            );
        } else if (tier === 'expired') {
            return (
                <>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        You have {sessions.length} of {SESSION_LIMIT_FREE} sessions (Free Limit).
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                        Your Pro subscription has ended. Delete sessions to add more.
                    </p>
                </>
            );
        } else {
            return (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    You have {sessions.length} saved {sessions.length === 1 ? 'session' : 'sessions'}.
                </p>
            );
        }
    };

    return (
        <div className="flex flex-col gap-2 mt-4">
            {sessions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    No sessions saved yet.
                </p>
            ) : (
                    <>
                        <div className="mb-2">
                            {renderHeader()}
                    </div>
                        <div className="space-y-3">
                    {sessions.map((session) => (
                        <div
                            key={session.name}
                            className="p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition relative"
                        >
                            <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => toggleExpand(session.name)}
                            >
                                <div>
                                    <strong className="text-gray-800 dark:text-white">{session.name}</strong>
                                    <p className="text-xs text-gray-500">
                                        {session.tabs.length} {session.tabs.length === 1 ? 'tab' : 'tabs'}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(session.name);
                                    }}
                                    className="p-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                    title="Delete session"
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                            </div>

                            {expandedSession === session.name && (
                                <div className="mt-2 space-y-2">
                                    {session.tabs.map((tab) => (
                                        <div
                                            key={tab.id}
                                            onClick={() => chrome.tabs.create({ url: tab.url })}
                                            className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                        >
                                            <p className="font-medium text-gray-800 dark:text-white truncate">
                                                {tab.title || 'Untitled'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{tab.url}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                    ))}
                        </div>
                </>
            )}
        </div>
    );
}
