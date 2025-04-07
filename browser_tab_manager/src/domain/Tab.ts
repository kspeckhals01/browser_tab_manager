// src/domain/Tab.ts
export interface Tab {
    id: number;
    title: string;
    url: string;
    pinned: boolean;
    favIconUrl?: string;
}