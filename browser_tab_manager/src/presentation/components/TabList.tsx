import { Tab } from '../../domain/Tab';

type Props = {
    tabs: Tab[];
};

export default function TabList({ tabs }: Props) {
    return (
        <div className="mt-4 space-y-2">
            {tabs.map(tab => (
                <div key={tab.id} className="p-2 rounded-md border shadow-sm">
                    <div className="text-sm font-medium">{tab.title}</div>
                    <div className="text-xs text-gray-500">{tab.url}</div>
                </div>
            ))}
        </div>
    );
}