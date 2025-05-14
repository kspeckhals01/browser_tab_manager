import { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import TabList from '../components/TabList';
import { useFilteredTabs } from '../../app/useCases/useFilteredTabs';
import Header from '../components/Header';
import GroupsView from '../views/GroupsView';
import SavedSessionsView from '../views/SavedSessionsView';
import SaveGroupView from '../views/SaveGroupView';
import AccountPage from '../pages/AccountPage';
//import UpgradePage from '../presentation/pages/UpgradePage';
import SmartGroupingPage from '../pages/SmartGroupingPage';

export default function PopupPage() {
  const [search, setSearch] = useState('');
    const filteredTabs = useFilteredTabs(search);
    const [view, setView] = useState<'main' | 'groups' | 'sessions' | 'saveGroup' | 'account' | 'upgrade' | 'smartGrouping'>('main');
    const [currentView, setCurrentView] = useState<'account' | 'login'>('login');

    useEffect(() => {
        const interval = setInterval(async () => {
            const { currentView } = await chrome.storage.local.get('currentView');
            if (currentView) setCurrentView(currentView);
        }, 1000);

        return () => clearInterval(interval);
    }, []);
 

    return (
        <div className="w-[360px] h-[600px] flex flex-col overflow-hidden bg-white dark:bg-gray-900">
            <Header onNavigate={setView} currentView={view} />

            <div className="flex-1 px-4 py-2 overflow-y-auto">
                {view === 'main' && (
                    <>
                        <SearchBar value={search} onChange={setSearch} />
                        <div className="mt-4">
                            <TabList tabs={filteredTabs} />
                        </div>
                    </>
                )}
                {view === 'groups' && (
                    <div className="mt-4">
                        <GroupsView />
                    </div>
                )}
                {view === 'sessions' && (
                    <div className="mt-4">
                        <SavedSessionsView />
                    </div>
                )}
                {view === 'saveGroup' && (
                    <div className="mt-4">
                        <SaveGroupView />
                    </div>
                )}
                {view === 'account' && (
                    <AccountPage
                        //onBack={() => setView('main')}
                        onUpgrade={() => setView('upgrade')}
                    />
                )}
                {view === 'smartGrouping' && (
                    <div className="mt-4">
                        <SmartGroupingPage />
                    </div>
                )

                }
            </div>
        </div>
    );
}
