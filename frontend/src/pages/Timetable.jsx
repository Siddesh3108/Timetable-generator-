// frontend/src/pages/Timetable.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Timetable() {
    const { timetableResult } = useAuth();
    const timetableData = timetableResult?.timetable || {};
    const settings = timetableResult?.settings || { start_time: 9, end_time: 17 };

    const [divisions, setDivisions] = useState([]);
    const [selectedDivision, setSelectedDivision] = useState('');
    const [events, setEvents] = useState([]);
    
    const timeSlots = Array.from(
        { length: settings.end_time - settings.start_time },
        (_, i) => {
            const start = settings.start_time + i;
            const end = start + 1;
            return `${start}:00-${end}:00`;
        }
    );

    useEffect(() => {
        if (timetableData && Object.keys(timetableData).length > 0) {
            const divisionIds = Object.keys(timetableData);
            const divisionNames = divisionIds.map(id => ({
                id: id, name: timetableData[id][0]?.division || `Division ${id}`
            }));
            
            setDivisions(divisionNames);
            
            if (divisionNames.length > 0) {
                const firstDivId = divisionNames[0].id;
                setSelectedDivision(firstDivId);
                setEvents(timetableData[firstDivId] || []);
            }
        }
    }, [timetableData]);

    const handleDivisionChange = (event) => {
        const divisionId = event.target.value;
        setSelectedDivision(divisionId);
        setEvents(timetableData[divisionId] || []);
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].slice(0, timetableResult?.settings?.working_days?.length || 6);

    const grid = {};
    events.forEach(event => {
        const key = `${event.day}-${event.slot}`;
        if (!grid[key]) {
            grid[key] = [];
        }
        grid[key].push(event);
    });

    if (Object.keys(timetableData).length === 0) {
        return ( <div className="text-center"> <h1 className="text-2xl font-bold text-gray-800 mb-4">View Timetable</h1> <p className="text-gray-600">No timetable has been generated yet. Please go to the 'Generate' page to create one.</p> </div> );
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6"> <h1 className="text-3xl font-bold text-gray-900">Generated Timetable</h1> <div className="flex items-center space-x-4"> <label htmlFor="division-select" className="font-semibold">Select Division:</label> <select id="division-select" value={selectedDivision} onChange={handleDivisionChange} className="p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"> {divisions.map(div => ( <option key={div.id} value={div.id}>{div.name}</option>))} </select> </div> </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 font-semibold text-left text-gray-600 border-b">Time</th>
                            {days.map(day => <th key={day} className="p-3 font-semibold text-center text-gray-600 border-b">{day}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map((time, slotIndex) => (
                            <tr key={time}>
                                <td className="p-3 font-mono text-sm text-gray-700 border-b border-r align-top">{time}</td>
                                {days.map((day, dayIndex) => {
                                    const dayNum = timetableResult?.settings?.working_days[dayIndex] ?? dayIndex;
                                    const cellEvents = grid[`${dayNum}-${slotIndex}`] || [];

                                    return (
                                        <td key={`${day}-${time}`} className="p-1 border-b text-center align-top h-24">
                                            {cellEvents.map((event, i) => (
                                                <div key={i} className="bg-blue-100 text-blue-800 p-2 rounded-md text-xs shadow-sm mb-1">
                                                    <p className="font-bold">{event.subject}</p>
                                                    <p>{event.teacher}</p>
                                                    <p className="font-mono">{event.room}</p>
                                                </div>
                                            ))}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}