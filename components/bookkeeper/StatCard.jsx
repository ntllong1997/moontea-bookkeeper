export default function StatCard({ label, value, sub, color = 'gray', icon }) {
    const colorMap = {
        gray: 'bg-white border-gray-200 text-gray-800',
        green: 'bg-green-50 border-green-200 text-green-800',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        red: 'bg-red-50 border-red-200 text-red-800',
        blue: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    return (
        <div
            className={`rounded-2xl border p-5 shadow-sm ${colorMap[color] || colorMap.gray}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-medium opacity-70">{label}</p>
                    <p className="mt-1 text-2xl font-bold">{value}</p>
                    {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
                </div>
                {icon && <span className="text-2xl">{icon}</span>}
            </div>
        </div>
    );
}
