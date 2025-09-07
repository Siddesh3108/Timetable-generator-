import React, { useState, useEffect } from 'react';
import apiClient from '../../api';

const dayOptions = [
    { id: 0, label: 'Monday' }, { id: 1, label: 'Tuesday' }, { id: 2, label: 'Wednesday' },
    { id: 3, label: 'Thursday' }, { id: 4, label: 'Friday' }, { id: 5, label: 'Saturday' },
    { id: 6, label: 'Sunday' },
];

const generateSlotsFromSimple = (start, end) => {
    const generated = [];
    for (let i = start; i < end; i++) {
        generated.push({ label: `${i}:00-${i+1}:00`, is_break: false, name: '' });
    }
    return generated;
};

export default function TimetableSettings() {
    const [settings, setSettings] = useState({ working_days: [], time_slots: [] });
    const [status, setStatus] = useState('');
    const [gen, setGen] = useState({ duration: 50, gap: 10, start: '09:00', end: '17:00' });

    // --- THIS IS THE KEY FIX: A MORE ROBUST LOADING LOGIC ---
    useEffect(() => {
        apiClient.get('/api/settings').then(res => {
            const fetched = res.data || {};
            
            let finalSettings = {};

            // Case 1: User has the new time_slots format
            if (fetched.time_slots && fetched.time_slots.length > 0) {
                finalSettings = {
                    working_days: fetched.working_days || [0, 1, 2, 3, 4, 5],
                    time_slots: fetched.time_slots,
                };
            // Case 2: User has the old format with start/end time
            } else if (fetched.start_time && fetched.end_time) {
                finalSettings = {
                    working_days: fetched.working_days || [0, 1, 2, 3, 4, 5],
                    time_slots: generateSlotsFromSimple(fetched.start_time, fetched.end_time),
                };
            // Case 3: Brand new user or corrupted settings
            } else {
                finalSettings = {
                    working_days: [0, 1, 2, 3, 4, 5], // Default to Mon-Sat
                    time_slots: generateSlotsFromSimple(9, 17), // Default to 9-5
                };
            }
            setSettings(finalSettings);

        }).catch(() => {
            setStatus('Could not load settings. Using defaults.');
            // Set safe defaults on failure
            setSettings({
                working_days: [0, 1, 2, 3, 4, 5],
                time_slots: generateSlotsFromSimple(9, 17),
            });
        });
    }, []);

    const handleDayChange = (dayId) => {
        const currentDays = settings.working_days || [];
        const newDays = currentDays.includes(dayId) ? currentDays.filter(d => d !== dayId) : [...currentDays, dayId];
        setSettings(prev => ({ ...prev, working_days: newDays.sort() }));
    };

    const handleGenerateSlots = () => {
        const generated = [];
        let currentTime = new Date(`1970-01-01T${gen.start}:00`);
        const endTime = new Date(`1970-01-01T${gen.end}:00`);
        const durationMs = parseInt(gen.duration) * 60000;
        const gapMs = parseInt(gen.gap) * 60000;

        while (currentTime.getTime() + durationMs <= endTime.getTime()) {
            const slotStart = new Date(currentTime);
            const slotEnd = new Date(slotStart.getTime() + durationMs);
            const formatTime = (date) => date.toTimeString().substring(0, 5);
            
            generated.push({ label: `${formatTime(slotStart)}-${formatTime(slotEnd)}`, is_break: false, name: '' });
            currentTime = new Date(slotEnd.getTime() + gapMs);
        }
        setSettings(prev => ({ ...prev, time_slots: generated }));
    };

    const handleSlotChange = (index, field, value) => {
        const newSlots = [...settings.time_slots];
        newSlots[index][field] = value;
        setSettings(prev => ({ ...prev, time_slots: newSlots }));
    };
    
    const toggleBreak = (index) => {
        const newSlots = [...settings.time_slots];
        const isBreak = !newSlots[index].is_break;
        newSlots[index].is_break = isBreak;
        if (isBreak && !newSlots[index].name) newSlots[index].name = 'Break';
        else if (!isBreak) newSlots[index].name = '';
        setSettings(prev => ({ ...prev, time_slots: newSlots }));
    };

    const removeSlot = (index) => {
        setSettings(prev => ({ ...prev, time_slots: prev.time_slots.filter((_, i) => i !== index)}));
    };

    // --- START: CORRECTED AND IMPROVED FUNCTION ---
    const addSlot = () => {
        const lastSlot = settings.time_slots[settings.time_slots.length - 1];
        let newLabel = '09:00-10:00'; // Default if no slots exist

        if (lastSlot && lastSlot.label.includes('-')) {
            const [startTimeString, endTimeString] = lastSlot.label.split('-');

            if (startTimeString && endTimeString) {
                // Use a fixed reference date to avoid timezone/DST bugs
                const referenceDate = '1970-01-01T';
                const startTime = new Date(`${referenceDate}${startTimeString}:00`);
                const endTime = new Date(`${referenceDate}${endTimeString}:00`);

                // Calculate the duration of the previous slot
                const durationMs = endTime.getTime() - startTime.getTime();

                // The new slot starts at the end time of the last one
                const newSlotStart = endTime;
                const newSlotEnd = new Date(newSlotStart.getTime() + durationMs);

                const formatTime = (date) => date.toTimeString().substring(0, 5);

                newLabel = `${formatTime(newSlotStart)}-${formatTime(newSlotEnd)}`;
            }
        }

        const newSlot = { label: newLabel, is_break: false, name: '' };
        setSettings(prev => ({ ...prev, time_slots: [...prev.time_slots, newSlot] }));
    };
    // --- END: CORRECTED AND IMPROVED FUNCTION ---
    
    const handleSave = async () => {
        setStatus('Saving...');
        try {
            await apiClient.put('/api/settings', settings);
            setStatus('Settings saved successfully!');
        } catch (error) { setStatus('Failed to save settings.'); }
        setTimeout(() => setStatus(''), 3000);
    };
    
    const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";

    return (
        <div className="bg-white p-8 rounded-lg shadow-md space-y-8">
            <div>
                <h3 className="text-lg font-medium text-gray-900">Working Days</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    {dayOptions.map(day => (
                        <label key={day.id} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={Array.isArray(settings.working_days) && settings.working_days.includes(day.id)} onChange={() => handleDayChange(day.id)} className="h-4 w-4 rounded"/>
                            <span>{day.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="border-t pt-8">
                <h3 className="text-lg font-medium text-gray-900">Time Slots & Breaks</h3>
                <p className="text-sm text-gray-500 mb-4">Generate default slots, then customize them. You can edit time labels directly, mark slots as breaks, and add new slots.</p>

                <div className="p-4 border bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-700">Generate Default Slots</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        <div><label className="text-sm">Duration (min)</label><input type="number" value={gen.duration} onChange={e => setGen({...gen, duration: e.target.value})} className={inputClass} /></div>
                        <div><label className="text-sm">Gap (min)</label><input type="number" value={gen.gap} onChange={e => setGen({...gen, gap: e.target.value})} className={inputClass} /></div>
                        <div><label className="text-sm">Start Time</label><input type="time" value={gen.start} onChange={e => setGen({...gen, start: e.target.value})} className={inputClass} /></div>
                        <div><label className="text-sm">End Time</label><input type="time" value={gen.end} onChange={e => setGen({...gen, end: e.target.value})} className={inputClass} /></div>
                    </div>
                    <button onClick={handleGenerateSlots} className="mt-4 px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-md hover:bg-indigo-700">Generate & Overwrite List</button>
                </div>

                <div className="space-y-3 mt-4">
                    {settings.time_slots.map((slot, index) => (
                        <div key={index} className="flex items-center space-x-3 p-2 border rounded-md bg-white">
                            <span className="font-mono text-gray-600">{index + 1}.</span>
                            <input type="text" value={slot.label} onChange={(e) => handleSlotChange(index, 'label', e.target.value)} className={`${inputClass} w-40`} title="Edit time label"/>
                            {slot.is_break && ( <input type="text" placeholder="Break Name" value={slot.name} onChange={(e) => handleSlotChange(index, 'name', e.target.value)} className={`${inputClass} w-48`} title="Rename break"/> )}
                            <button onClick={() => toggleBreak(index)} className={`px-3 py-1 text-sm rounded-full ${slot.is_break ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}>{slot.is_break ? 'Is a Break' : 'Mark as Break'}</button>
                            <button onClick={() => removeSlot(index)} className="text-red-500 hover:text-red-700 font-bold ml-auto px-2" title="Remove slot">✕</button>
                        </div>
                    ))}
                </div>
                
                <button onClick={addSlot} className="mt-4 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-md hover:bg-gray-100 w-full">+ Add New Slot</button>
            </div>
            
            <div className="flex justify-end items-center space-x-4 border-t pt-6 mt-6">
                {status && <p className="text-sm text-gray-600 transition-opacity">{status}</p>}
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Save All Timetable Settings</button>
            </div>
        </div>
    );
}