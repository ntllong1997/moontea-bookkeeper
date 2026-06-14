'use client';
import { useMode } from './ModeProvider';

export default function ModeToggle() {
    const { mode, setMode } = useMode();

    return (
        <div className="flex items-center rounded-xl border bg-white p-0.5 text-sm">
            {['business', 'all'].map((opt) => (
                <button
                    key={opt}
                    onClick={() => setMode(opt)}
                    className={`rounded-lg px-3 py-1.5 font-medium capitalize transition-colors ${
                        mode === opt
                            ? 'bg-black text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    {opt === 'business' ? 'Business' : 'All'}
                </button>
            ))}
        </div>
    );
}
