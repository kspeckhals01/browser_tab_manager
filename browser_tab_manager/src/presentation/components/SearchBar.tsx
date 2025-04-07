type Props = {
    value: string;
    onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: Props) {
    return (
        <input
            type="text"
            placeholder="Search tabs..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 shadow-sm"
        />
    );
}