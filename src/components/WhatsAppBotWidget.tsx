import React from "react";

export default function WhatsAppBotWidget() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          🤖 AI WhatsApp Receptionist
        </h2>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-semibold text-green-600">Online</span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 font-sans text-sm">
        <p className="text-xs text-gray-400 mb-3 uppercase font-bold tracking-wider">
          Live Chat Feed
        </p>

        {/* Chat Message 1 */}
        <div className="mb-4">
          <p className="text-gray-800 font-semibold mb-1">Member (Kabir):</p>
          <div className="bg-white p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-gray-200 inline-block shadow-sm">
            Hey, are you guys open this Sunday evening?
          </div>
        </div>

        {/* Bot Reply 1 */}
        <div className="mb-4 text-right">
          <p className="text-purple-600 font-semibold mb-1">Gymphony AI:</p>
          <div className="bg-purple-600 text-white p-3 rounded-tl-xl rounded-bl-xl rounded-br-xl inline-block shadow-sm text-left">
            Hi Kabir! Yes, Iron Paradise is open this Sunday from 5:00 PM to 10:00 PM. See you then!
            🏋️‍♂️
          </div>
        </div>
      </div>
    </div>
  );
}
