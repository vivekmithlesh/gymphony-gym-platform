import React from "react";

export default function RetentionWidget() {
  const riskyMembers = [
    { id: 1, name: "Vikram Singh", drop: "5 days/wk → 1 day/wk" },
    { id: 2, name: "Sanya Malhotra", drop: "4 days/wk → 0 days/wk" },
    { id: 3, name: "Kabir Das", drop: "3 days/wk → 1 day/wk" },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          🧠 AI Retention Engine
        </h2>
        <span className="text-xs font-semibold bg-red-100 text-red-600 px-3 py-1 rounded-full">
          High Churn Risk
        </span>
      </div>

      <div className="space-y-4">
        {riskyMembers.map((member) => (
          <div
            key={member.id}
            className="flex justify-between items-center p-4 bg-purple-50/50 rounded-2xl border border-purple-50"
          >
            <div>
              <h3 className="font-semibold text-gray-900">{member.name}</h3>
              <p className="text-sm text-red-500 font-medium mt-1">
                ⚠️ Attendance dropped: {member.drop}
              </p>
            </div>

            <button
              onClick={() => alert(`WhatsApp template opened for ${member.name}`)}
              className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              Check-in
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
