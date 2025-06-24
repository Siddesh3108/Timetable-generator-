import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import TeacherForm from '../components/forms/TeacherForm';
import RoomForm from '../components/forms/RoomForm';
import SubjectForm from '../components/forms/SubjectForm';
export default function DataEntry() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'Teachers');
    const tabs = ['Teachers', 'Rooms', 'Subjects'];
    const tabClass = (tabName) => `px-6 py-3 font-semibold rounded-t-lg transition-colors ${activeTab === tabName ? 'bg-white text-blue-600 border-x border-t' : 'bg-transparent text-gray-500 hover:text-gray-700'}`;
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manual Data Entry</h1>
            <p className="text-gray-600 mb-8">Add or manage your institution's core data here. When you are ready, proceed to the 'Generate' page.</p>
            <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-4">{tabs.map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={tabClass(tab)}>{tab}</button>))}</nav></div>
            <div className="bg-white p-8 rounded-b-lg shadow-md max-w-4xl">
                {activeTab === 'Teachers' && <TeacherForm />}
                {activeTab === 'Rooms' && <RoomForm />}
                {activeTab === 'Subjects' && <SubjectForm />}
            </div>
        </div>
    );
}
