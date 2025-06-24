import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { useNavigate } from 'react-router-dom';
const StatCard = ({ title, value, icon, color }) => ( <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between"> <div> <p className="text-sm font-medium text-gray-500">{title}</p> <p className="text-3xl font-bold text-gray-900">{value}</p> </div> <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}> {icon} </div> </div> );
const ActionCard = ({ title, description, onClick }) => ( <button onClick={onClick} className="bg-white p-6 rounded-xl shadow-md text-left w-full hover:bg-gray-50 transition"> <p className="text-lg font-semibold text-gray-900">{title}</p> <p className="text-sm text-gray-500 mt-1">{description}</p> </button> );
export default function Dashboard() {
    const [summary, setSummary] = useState({ totalTeachers: 0, totalRooms: 0, totalSubjects: 0 });
    const navigate = useNavigate();
    useEffect(() => { apiClient.get('/api/dashboard-summary').then(res => setSummary(res.data)); }, []);
    const TeacherIcon = <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>;
    const RoomIcon = <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 11V3h16v8h-3v10h-4v-5H7v5H3V11H4z" /></svg>;
    const SubjectIcon = <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Teachers" value={summary.totalTeachers} icon={TeacherIcon} color="bg-blue-100" />
                <StatCard title="Total Rooms" value={summary.totalRooms} icon={RoomIcon} color="bg-green-100" />
                <StatCard title="Total Subjects" value={summary.totalSubjects} icon={SubjectIcon} color="bg-purple-100" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <ActionCard title="Add Teacher" description="Enter details for a new teacher." onClick={() => navigate('/data-entry', {state: { activeTab: 'Teachers'}})} />
                <ActionCard title="Add Room" description="Define a new classroom or lab." onClick={() => navigate('/data-entry', {state: { activeTab: 'Rooms'}})} />
                <ActionCard title="Add Subject" description="Create a new subject to be scheduled." onClick={() => navigate('/data-entry', {state: { activeTab: 'Subjects'}})} />
                <button onClick={() => navigate('/timetable')} className="bg-blue-600 p-6 rounded-xl shadow-md text-left w-full hover:bg-blue-700 transition">
                    <p className="text-lg font-semibold text-white">View Timetable</p>
                    <p className="text-sm text-blue-200 mt-1">Check the latest generated timetable.</p>
                </button>
            </div>
        </div>
    );
}
