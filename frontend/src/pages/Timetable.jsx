// frontend/src/pages/Timetable.jsx (Final Corrected Version)

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Timetable() {
    // 1. Get data from context
    const { timetableResult } = useAuth();

    // 2. Safely get the timetable data, settings, and metrics with fallbacks
    const timetableData = timetableResult?.timetable || {};
    const settings = timetableResult?.settings || {};
    const metrics = timetableResult?.metrics || {};

    // 3. State for managing the page's UI
    const [divisions, setDivisions] = useState([]);
    const [selectedDivisionId, setSelectedDivisionId] = useState('');
    const [events, setEvents] = useState([]);

    // 4. Derive UI constants directly from the settings data
    const timeSlots = settings.time_slots || [];
    const workingDays = settings.working_days || [];
    const dayHeaders = workingDays.map(dayIndex => {
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return dayNames[dayIndex];
    });

    // 5. This effect updates the page when new timetable data arrives
    useEffect(() => {
        if (timetableResult && timetableData && Object.keys(timetableData).length > 0) {
            const divisionIds = Object.keys(timetableData);
            const divisionOptions = divisionIds.map(id => ({
                id,
                name: timetableData[id][0]?.division || `Division ${id}`
            }));
            setDivisions(divisionOptions);

            if (divisionOptions.length > 0) {
                const firstId = divisionOptions[0].id;
                setSelectedDivisionId(firstId);
                setEvents(timetableData[firstId] || []);
            }
        }
    }, [timetableResult]);

    // 6. This handler updates the displayed events when the user changes the division
    const handleDivisionChange = (event) => {
        const newDivisionId = event.target.value;
        setSelectedDivisionId(newDivisionId);
        setEvents(timetableData[newDivisionId] || []);
    };

    // 7. Create a fast lookup grid for placing events in the table
    const grid = {};
    if (events) {
        events.forEach(event => {
            const key = `${event.day}-${event.slot}`; // e.g., "0-1"
            if (!grid[key]) grid[key] = [];
            grid[key].push(event);
        });
    }

    // 8. Handle the case where no timetable exists yet
    if (!timetableResult || Object.keys(timetableData).length === 0) {
        return (
            <div className="text-center p-10">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">View Timetable</h1>
                <p className="text-gray-600">No timetable has been generated. Please go to the 'Generate' page to create one.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6 print-hide">
                <h1 className="text-3xl font-bold text-gray-900">Generated Timetable</h1>
                <div className="flex items-center space-x-4">
                    <label htmlFor="division-select" className="font-semibold">Select Division:</label>
                    <select id="division-select" value={selectedDivisionId} onChange={handleDivisionChange} className="p-2 border rounded-md shadow-sm">
                        {divisions.map(div => (<option key={div.id} value={div.id}>{div.name}</option>))}
                    </select>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Print</button>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 font-semibold text-left text-gray-600 border-b w-40">Time</th>
                            {dayHeaders.map(day => <th key={day} className="p-3 font-semibold text-center text-gray-600 border-b">{day}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {/*
                            This is the FINAL corrected render loop. It cleanly separates the logic for
                            a 'break row' vs. a 'lecture row'.
                        */}
                        {timeSlots.map((slot, slotIndex) => {
                            if (slot.is_break) {
                                // RENDER A SPECIAL ROW FOR BREAKS
                                return (
                                    <tr key={`${slot.label}-${slotIndex}`} className="bg-gray-200">
                                        <td colSpan={workingDays.length + 1} className="p-3 text-center font-bold text-gray-600 border-b">
                                            {slot.name || 'Break'}
                                        </td>
                                    </tr>
                                );
                            } else {
                                // RENDER A NORMAL ROW FOR LECTURES
                                return (
                                    <tr key={`${slot.label}-${slotIndex}`}>
                                        <td className="p-3 font-mono text-sm text-gray-700 border-b border-r align-top">
                                            {slot.label}
                                        </td>
                                        {workingDays.map(dayIndex => {
                                            const cellKey = `${dayIndex}-${slotIndex}`;
                                            const cellEvents = grid[cellKey] || [];
                                            return (
                                                <td key={cellKey} className="p-1 border-b text-center align-top h-28">
                                                    {cellEvents.map((event, i) => (
                                                        <div key={i} className="bg-blue-100 text-blue-900 p-2 rounded-lg text-xs shadow-sm mb-1 text-left">
                                                            <p className="font-bold">{event.subject}</p>
                                                            <p className="text-gray-700">{event.teacher}</p>
                                                            <p className="font-mono text-sm">{event.room}</p>
                                                        </div>
                                                    ))}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            }
                        })}
                    </tbody>
                </table>
            </div>
            <div className="text-right mt-4 text-sm text-gray-500 print-hide">
                <p>Status: <span className="font-semibold text-green-600">{metrics.status}</span>. Conflicts: <span className="font-semibold">{metrics.conflicts}</span>.</p>
            </div>
        </div>
    );
}