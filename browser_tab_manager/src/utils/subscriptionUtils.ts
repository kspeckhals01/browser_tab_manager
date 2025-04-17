export function getDaysRemaining(endDate: string | null): number | null {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}