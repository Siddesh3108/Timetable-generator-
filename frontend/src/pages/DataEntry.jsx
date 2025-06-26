import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import TeacherForm from '../components/forms/TeacherForm';
import RoomForm from '../components/forms/RoomForm';
import SubjectForm from '../components/forms/SubjectForm';
import DataTable from '../components/DataTable';
import apiClient from '../api';

export default function DataEntry() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'Teachers');
    const [data, setData] = useState({ Teachers: [], Rooms: [], Subjects: [] });
    const [editingItem, setEditingItem] = useState(null); // State to hold the item being edited
    const tabs = ['Teachers', 'Rooms', 'Subjects'];

    const fetchData = useCallback(async () => {
        try {
            const [teachersRes, roomsRes, subjectsRes] = await Promise.all([
                apiClient.get('/api/teachers'),
                apiClient.get('/api/rooms'),
                apiClient.get('/api/subjects')
            ]);
            setData({ Teachers: teachersRes.data, Rooms: roomsRes.data, Subjects: subjectsRes.data });
        } catch (error) { console.error("Failed to fetch data", error); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleEdit = (item) => {
        setEditingItem(item);
        // Optional: scroll to the form
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
    };

    const handleSaveSuccess = () => {
        setEditingItem(null); // Clear editing mode on success
        fetchData(); // Refresh the data table
    };

    const tabClass = (tabName) => `px-6 py-3 font-semibold rounded-t-lg transition-colors ${activeTab === tabName ? 'bg-white text-blue-600 border-x border-t' : 'bg-transparent text-gray-500 hover:text-gray-700'}`;
    const ActiveForm = { Teachers: TeacherForm, Rooms: RoomForm, Subjects: SubjectForm }[activeTab];

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Management</h1>
            <p className="text-gray-600 mb-8">Add, view, or manage your institution's core data. When ready, go to the 'Generate' page.</p>
            <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-4">{tabs.map(tab => (<button key={tab} onClick={() => { setActiveTab(tab); setEditingItem(null); }} className={tabClass(tab)}>{tab}</button>))}</nav></div>
            <div className="bg-white p-8 rounded-b-lg shadow-md max-w-7xl mx-auto">
                <DataTable title={activeTab} items={data[activeTab]} onEdit={handleEdit} onSaveSuccess={fetchData} />
                <div className="border-t pt-6 mt-8">
                     <h2 className="text-xl font-bold mb-4">{editingItem ? `Editing ${activeTab.slice(0, -1)}` : `Add New ${activeTab.slice(0, -1)}`}</h2>
                    {ActiveForm && <ActiveForm onSaveSuccess={handleSaveSuccess} editingItem={editingItem} onCancelEdit={handleCancelEdit} />}
                </div>
            </div>
        </div>
    );
}
