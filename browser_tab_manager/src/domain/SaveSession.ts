import { Tab } from './Tab';

export type SavedSession = {
    name: string;
    createdAt: string;
    tabs: Tab[];
};