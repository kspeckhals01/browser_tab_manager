import { Tab } from './Tab';

export type TabGroup = {
    id?: string;
    name: string;
    createdAt: string;
    tabs: Tab[];
};