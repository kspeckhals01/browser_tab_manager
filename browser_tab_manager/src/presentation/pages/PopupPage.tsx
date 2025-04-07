import { useState } from 'react';
import SearchBar from '../components/SearchBar';
import TabList from '../components/TabList';
import { useFilteredTabs } from '../../app/useCases/usefilteredTabs';

export default function PopupPage() {
  const [search, setSearch] = useState('');
  const filteredTabs = useFilteredTabs(search);

  return (
    <div className="p-4 max-w-sm">
      <SearchBar value={search} onChange={setSearch} />
      <TabList tabs={filteredTabs} />
    </div>
  );
}
