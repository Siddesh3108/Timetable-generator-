// frontend/src/components/forms/TeacherForm.jsx (Full Corrected Version)
import React, { useState, useEffect } from 'react';
import apiClient from '../../api';

const initialFormState = { name: '', subject_taught: '', max_lectures_per_day: 4, is_visiting: false, availability: {} };

export default function TeacherForm({ onSaveSuccess, editingItem, onCancelEdit }) {
    const [formData, setFormData] = useState(initialFormState);
    const [status, setStatus] = useState('');

    // This new useEffect handles the auto-vanishing status message
    useEffect(() => {
            if (status) {
                const timer = setTimeout(() => {
                    setStatus('');
                }, 5000); // Message will disappear after 5 seconds
                return () => clearTimeout(timer); // Cleanup the timer
            }
        }, [status]);

    useEffect(() => {
        const initialState = editingItem && editingItem.name ? editingItem : initialFormState;
        setFormData({
            ...initialState,
            availability: (editingItem && editingItem.availability) || {},
        });
    }, [editingItem]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : type === 'number' ? (value === '' ? '' : parseInt(value, 10)) : value;
        setFormData(p => ({ ...p, [name]: finalValue }));
    };

    const handleDayToggle = (day, isChecked) => {
        const newAvailability = { ...formData.availability };
        if (isChecked) {
            newAvailability[day] = { start: '09:00', end: '17:00' };
        } else {
            delete newAvailability[day];
        }
        setFormData(prev => ({ ...prev, availability: newAvailability }));
    };
    
    const handleTimeChange = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            availability: { ...prev.availability, [day]: { ...prev.availability[day], [field]: value } }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const apiCall = editingItem
            ? apiClient.put(`/api/teachers/${editingItem.id}`, formData)
            : apiClient.post('/api/teachers', formData);
            
        try {
            await apiCall;
            setStatus({ msg: `Teacher ${editingItem ? 'updated' : 'saved'} successfully!`, error: false });
            if (onSaveSuccess) onSaveSuccess();
        } catch (err) {
            setStatus({ msg: 'Operation failed. Please try again.', error: true });
        }
    };
    
    const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
            <div><label className="block text-sm font-medium text-gray-700">Teacher Name</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} placeholder="Enter teacher's full name" className={inputClass} required/></div>
            <div><label className="block text-sm font-medium text-gray-700">Primary Subject (for reference)</label><input type="text" name="subject_taught" value={formData.subject_taught || ''} onChange={handleChange} placeholder="e.g., Mathematics, Physics" className={inputClass}/></div>
            <div><label className="block text-sm font-medium text-gray-700">Max Lectures per Day</label><input type="number" name="max_lectures_per_day" value={formData.max_lectures_per_day} onChange={handleChange} min="1" className={inputClass}/></div>
            
            <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="is_visiting" name="is_visiting" type="checkbox" checked={formData.is_visiting} onChange={handleChange} className="h-4 w-4 rounded"/></div><div className="ml-3 text-sm"><label htmlFor="is_visiting">Is this a Visiting Faculty?</label></div></div>
            
            {formData.is_visiting && (
                <div className="p-4 border border-blue-200 rounded-md bg-blue-50 space-y-4">
                    <h4 className="font-semibold text-gray-800">Visiting Faculty Availability</h4>
                    {days.map(day => (
                        <div key={day} className="grid grid-cols-3 gap-x-4 items-center">
                            <label className="flex items-center space-x-2 col-span-1">
                                <input type="checkbox" checked={!!formData.availability?.[day]} onChange={(e) => handleDayToggle(day, e.target.checked)} className="h-4 w-4 rounded"/>
                                <span>{day}</span>
                            </label>
                            {formData.availability?.[day] && (
                                <div className="col-span-2 flex items-center space-x-2">
                                    <input type="time" value={formData.availability[day].start} onChange={(e) => handleTimeChange(day, 'start', e.target.value)} className={inputClass}/>
                                    <span>to</span>
                                    <input type="time" value={formData.availability[day].end} onChange={(e) => handleTimeChange(day, 'end', e.target.value)} className={inputClass}/>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            <div className="flex justify-end space-x-4 pt-4">
                {editingItem && <button type="button" onClick={onCancelEdit} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700">Cancel</button>}
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">{editingItem ? 'Update Teacher' : 'Save Teacher'}</button>
            </div>
            {status && <p className={`mt-4 text-sm ${status.error ? "text-red-500" : "text-green-600"}`}>{status.msg}</p>}
        </form>
    );
}