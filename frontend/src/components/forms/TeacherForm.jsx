import React, { useState, useEffect } from 'react';
import apiClient from '../../api';

const initialFormState = { name: '', subject_taught: '', classes_taught: '', max_lectures_per_day: 5, lecture_type: 'Theory', theory_hours_per_week: 0, lab_hours_per_week: 0, is_visiting: false };

export default function TeacherForm({ onSaveSuccess, editingItem, onCancelEdit }) {
    const [formData, setFormData] = useState(initialFormState);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (editingItem && editingItem.name) { // Check if a valid item is being edited
            setFormData(editingItem);
        } else {
            setFormData(initialFormState);
        }
    }, [editingItem]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Determine if we are updating (PUT) or creating (POST)
        const apiCall = editingItem
            ? apiClient.put(`/api/teachers/${editingItem.id}`, formData)
            : apiClient.post('/api/teachers', formData);
            
        try {
            await apiCall;
            setStatus({ msg: `Teacher ${editingItem ? 'updated' : 'saved'} successfully!`, error: false });
            if (onSaveSuccess) onSaveSuccess(); // This will clear the form and refresh the table
        } catch (err) {
            setStatus({ msg: 'Operation failed. Please try again.', error: true });
        }
    };
    
    const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
            {/* The form fields with corrected 'name' attributes */}
            <div><label className="block text-sm font-medium text-gray-700">Teacher Name</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} placeholder="Enter teacher's full name" className={inputClass} required/></div>
            <div><label className="block text-sm font-medium text-gray-700">Subject Taught</label><input type="text" name="subject_taught" value={formData.subject_taught || ''} onChange={handleChange} placeholder="e.g., Mathematics, Physics" className={inputClass}/></div>
            <div><label className="block text-sm font-medium text-gray-700">Classes Taught</label><input type="text" name="classes_taught" value={formData.classes_taught || ''} onChange={handleChange} placeholder="e.g., 9A, 10B, 11-Science" className={inputClass}/></div>
            <div><label className="block text-sm font-medium text-gray-700">Preferred Max Lectures per Day</label><input type="number" name="max_lectures_per_day" value={formData.max_lectures_per_day || 5} onChange={handleChange} className={inputClass}/></div>
            <div><label className="text-sm font-medium text-gray-700">Lecture Type</label><div className="flex space-x-4 mt-1"><label><input type="radio" name="lecture_type" value="Theory" checked={formData.lecture_type==='Theory'} onChange={handleChange}/> Theory</label><label><input type="radio" name="lecture_type" value="Lab" checked={formData.lecture_type==='Lab'} onChange={handleChange}/> Lab</label><label><input type="radio" name="lecture_type" value="Both" checked={formData.lecture_type==='Both'} onChange={handleChange}/> Both</label></div></div>
            <div className="grid grid-cols-2 gap-4">
                {(formData.lecture_type === 'Theory' || formData.lecture_type === 'Both') && <div><label>Theory Hours per Week</label><input type="number" name="theory_hours_per_week" value={formData.theory_hours_per_week || 0} onChange={handleChange} className={inputClass} /></div>}
                {(formData.lecture_type === 'Lab' || formData.lecture_type === 'Both') && <div><label>Lab Hours per Week</label><input type="number" name="lab_hours_per_week" value={formData.lab_hours_per_week || 0} onChange={handleChange} className={inputClass} /></div>}
            </div>
            <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="is_visiting" name="is_visiting" type="checkbox" checked={formData.is_visiting || false} onChange={handleChange} className="h-4 w-4 rounded"/></div><div className="ml-3 text-sm"><label htmlFor="is_visiting">Is this a Visiting Faculty?</label></div></div>
            {/* Availability section can be added here if needed for editing */}
            
            <div className="flex justify-end space-x-4 pt-4">
                {editingItem && <button type="button" onClick={onCancelEdit} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700">Cancel</button>}
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">{editingItem ? 'Update Teacher' : 'Save Teacher'}</button>
            </div>
            {status && <p className={`mt-4 text-sm ${status.error ? "text-red-500" : "text-green-600"}`}>{status.msg}</p>}
        </form>
    );
}
