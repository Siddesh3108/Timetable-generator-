// frontend/src/pages/SettingsPage.jsx (Corrected)

import React, { useState } from 'react';
import AccountSettings from '../components/settings/AccountSettings';
import TimetableSettings from '../components/settings/TimeSlotSettings'; // <-- THE FIX IS HERE

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('Timetable');
    const tabs = ['Timetable', 'Account'];

    const tabClass = (tabName) =>
        `px-4 py-2 font-semibold rounded-md transition-colors ${
            activeTab === tabName
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`;

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Application Settings</h1>

            {/* Tab Navigation */}
            <div className="flex space-x-4 mb-8">
                {tabs.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={tabClass(tab)}>
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content for the active tab */}
            <div>
                {activeTab === 'Timetable' && <TimetableSettings />}
                {activeTab === 'Account' && <AccountSettings />}
            </div>
        </div>
    );
}