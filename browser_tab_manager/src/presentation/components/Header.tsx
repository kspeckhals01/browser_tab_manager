import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { Save, Folder, Brain, ArrowLeft, UserIcon } from 'lucide-react';
import useSaveSession from '../../app/useCases/useSaveSession';
import { toast } from 'sonner';
import useDarkMode from '../../app/hooks/useDarkMode';
import { supabase } from '../../lib/supabase';
import { getAllLocalSessions } from '../../infrastructure/localTabStorage';
import { getAllSessionsFromSupabase } from '../../infrastructure/supabaseTabStorage';
import { validateUserTier } from '../../utils/validateUserTier';
import { getUserTier } from '../../infrastructure/storageAdapter';




type HeaderProps = {
    onNavigate: (view: 'main' | 'groups' | 'sessions' | 'saveGroup' | 'account' | 'upgrade' | 'smartGrouping') => void;
    currentView: 'main' | 'groups' | 'sessions' | 'saveGroup' | 'account' | 'upgrade' | 'smartGrouping';
};

export default function Header({ onNavigate, currentView }: HeaderProps) {
    const [tier, setTier] = useState<'free' | 'pro' | 'expired'>('free');
    const { enabled: darkMode, toggle: toggleDarkMode } = useDarkMode();
    const saveSession = useSaveSession();
    const [ isloggedIn, setIsLoggedIn ] = useState<boolean>(false);


    const getIconForTier = (tier: string) => {
        switch (tier) {
            case 'pro':
                return chrome.runtime.getURL('icons/tabvana-pro-128.png');
            case 'expired':
            case 'free':
            default:
                return chrome.runtime.getURL('icons/tabvana-free-128.png');
        }
    };

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setIsLoggedIn(!!data?.user);
        });
        const fetchTier = async () => {
            const t = await getUserTier();
            setTier(t);
        };

        fetchTier();
    }, []);

    useEffect(() => {
        const interval = setInterval(async () => {
            const { tier: storedTier } = await chrome.storage.local.get('tier');
            if (storedTier && storedTier !== tier) {
                
                setTier(storedTier);
            }
        }, 1000); // every 0.5s

        return () => clearInterval(interval);
    }, [tier]);

    const handleSaveSession = async () => {
        const name = prompt('Name your session:');
        if (!name) return;

        try {
            const tier = await validateUserTier();

            let totalSessions = 0;

            if (tier === 'free') {
                const local = await getAllLocalSessions();
                totalSessions = local.length;

                if (totalSessions >= 5) {
                    toast.error('Free users can only save up to 5 sessions. Upgrade to Pro to unlock unlimited saves.');
                    return;
                }
            }

            if (tier === 'expired') {
                const [local, cloud] = await Promise.all([
                    getAllLocalSessions(),
                    getAllSessionsFromSupabase(),
                ]);
                totalSessions = local.length + cloud.length;

                if (totalSessions >= 5) {
                    toast.error('You’ve reached your 5-session limit. Delete an old session or upgrade to Pro.');
                    return;
                }
            }

            const result = await saveSession(name);

            switch (result) {
                case 'cloud':
                    toast.success(`Session "${name}" saved to the cloud!`);
                    break;
                case 'local':
                    toast.success(`Session "${name}" saved locally.`);
                    break;
                case 'duplicate':
                    toast.error(`A session named "${name}" already exists.`);
                    break;
                case 'limit':
                    toast.error('You’ve reached the session limit.');
                    break;
                case 'error':
                default:
                    toast.error('Failed to save session. Please try again.');
            }

        } catch (error) {
            console.error('[handleSaveSession] Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save session.');
        }
    };

    const handleViewSavedSessions = () => {
        onNavigate('sessions');
    };

    const handleSmartGroup = () => {
        toast('Enable Smart Grouping?', {
            description: 'Tab titles and URLs may be analyzed by AI (never content or private data).',
            action: {
                label: 'Enable',
                onClick: () => {
                    onNavigate('smartGrouping');
                }
            }
        });
    };

    const handleSaveGroupView = () => {
        onNavigate('saveGroup');
    }


    return (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50">
            {/* Left: Back button + Title */}
            <div className="flex items-center gap-2">
            <img
                    src={getIconForTier(tier)}
                    alt={`${tier} icon`}
                    className="w-6 h-6 rounded-sm"
                />
                {currentView !== 'main' && (
                    <button
                        onClick={() => onNavigate('main')}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        title="Go Back"
                    >
                        <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                )}

                <h1 className="text-base font-semibold text-gray-800 dark:text-white">
                    {tier === 'pro' ? 'Tabvana Pro' : 'Tabvana Free'}
                </h1>
            </div> 

            {/* Right: Dropdown Menu */}
            <div className="flex items-center gap-1">
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="text-gray-900 dark:text-gray-100 hover:text-black dark:hover:text-white transition"
                        aria-label="Menu">
                        <HamburgerMenuIcon className="w-5 h-5" />
                    </button>
                </DropdownMenu.Trigger>
                
                <DropdownMenu.Content className="z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md p-2 text-sm min-w-[180px]">
                    <DropdownMenu.Item
                        onSelect={() => onNavigate('groups')}
                        className="flex items-center gap-2 px-2 py-1 rounded text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                        <Folder className="w-4 h-4 text-yellow-500" />
                        View Saved Groups
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                        onSelect={handleViewSavedSessions}
                        className="flex items-center gap-2 px-2 py-1 rounded text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                        <Save className="w-4 h-4 text-blue-500" />
                        View Saved Sessions
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        onSelect={handleSaveGroupView}
                        className="flex items-center gap-2 px-2 py-1 rounded text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                        <Save className="w-4 h-4 text-blue-500" />
                        Save Groups
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        onSelect={handleSmartGroup}
                        className="flex items-center gap-2 px-2 py-1 rounded text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                        <Brain className="w-4 h-4 text-pink-500" />
                        AI Smart Grouping
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator className="my-1 border-t border-gray-300 dark:border-gray-600" />

                    <DropdownMenu.Item
                        onSelect={handleSaveSession}
                        className="flex items-center gap-2 px-2 py-1 rounded text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                        <Save className="w-4 h-4 text-blue-500" />
                        Save Current Tabs
                    </DropdownMenu.Item>

                    
                    <DropdownMenu.Separator className="my-1 border-t border-gray-300 dark:border-gray-600" />

                    <DropdownMenu.Item
                        onSelect={toggleDarkMode}
                        className="flex items-center gap-2 px-2 py-1 rounded text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                        <span className="w-4 h-4 text-purple-500">
                            {darkMode ? '🌙' : '☀️'}
                        </span>
                        {darkMode ? 'Disable Dark Mode' : 'Enable Dark Mode'}
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
                <button
                    onClick={() => onNavigate('account')}
                    className="text-gray-900 dark:text-gray-100 hover:text-black dark:hover:text-white transition"
                    title="View account & subscription"
                >
                    <UserIcon className="w-5 h-5 text-green-500" />
                </button>
            </div>

        </div>
    );
}
