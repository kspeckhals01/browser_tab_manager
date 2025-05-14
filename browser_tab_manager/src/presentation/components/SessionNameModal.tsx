// components/SessionNameModal.tsx
import { useState } from 'react';

type Props = {
    open: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
};

export default function SessionNameModal({ open, onClose, onSave }: Props) {
    const [name, setName] = useState('');

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-lg w-80">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Name your session</h2>
                <input
                    type="text"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1 rounded bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border dark:border-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onSave(name.trim());
                            setName('');
                        }}
                        disabled={!name.trim()}
                        className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
