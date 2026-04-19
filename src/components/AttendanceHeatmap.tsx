import React from "react";

export default function AttendanceHeatmap() {
  const hourlyData = [
    { hour: "6am", level: 80 },
    { hour: "8am", level: 95 },
    { hour: "10am", level: 40 },
    { hour: "12pm", level: 20 },
    { hour: "2pm", level: 15 },
    { hour: "4pm", level: 50 },
    { hour: "6pm", level: 100 },
    { hour: "8pm", level: 85 },
    { hour: "10pm", level: 30 },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 mt-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Peak Hours (Average)</h3>
      <div className="flex items-end justify-between h-32 gap-2">
        {hourlyData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-purple-100 rounded-t-lg relative group transition-all hover:bg-purple-600"
              style={{ height: `${d.level}%` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {d.level}%
              </div>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">{d.hour}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
