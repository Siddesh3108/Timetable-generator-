import React, { useState, useEffect } from 'react';
import apiClient from '../../api';

// Updated initial state to match the new database model
const initialFormState = { name: '', code: '', theory_lectures_per_week: 4, lab_sessions_per_week: 0 };

export default function SubjectForm({ onSaveSuccess, editingItem, onCancelEdit }) {
    const [formData, setFormData] = useState(initialFormState);
    // New state to manage the Theory/Lab/Both dropdown
    const [lectureType, setLectureType] = useState('Theory');
    const [status, setStatus] = useState('');

    // This useEffect determines the dropdown's state when an item is being edited
    useEffect(() => {
        if (editingItem && editingItem.name) {
            setFormData(editingItem);
            const hasTheory = editingItem.theory_lectures_per_week > 0;
            const hasLab = editingItem.lab_sessions_per_week > 0;

            if (hasTheory && hasLab) {
                setLectureType('Both');
            } else if (hasLab) {
                setLectureType('Lab');
            } else {
                setLectureType('Theory');
            }
        } else {
            // Reset to default when not editing
            setFormData(initialFormState);
            setLectureType('Theory');
        }
    }, [editingItem]);

    // This useEffect handles the auto-vanishing status message
    useEffect(() => {
        if (status) {
            const timer = setTimeout(() => setStatus(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const handleFormChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? (value === '' ? '' : parseInt(value, 10)) : value;
        setFormData(p => ({ ...p, [name]: finalValue }));
    };

    const handleTypeChange = (e) => {
        const newType = e.target.value;
        setLectureType(newType);
        // Reset hours when type changes to avoid confusion
        if (newType === 'Theory') {
            setFormData(p => ({ ...p, lab_sessions_per_week: 0 }));
        } else if (newType === 'Lab') {
            setFormData(p => ({ ...p, theory_lectures_per_week: 0 }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const apiCall = editingItem ? apiClient.put(`/api/subjects/${editingItem.id}`, formData) : apiClient.post('/api/subjects', formData);
        try {
            await apiCall;
            setStatus({ msg: `Subject ${editingItem ? 'updated' : 'saved'} successfully!`, error: false });
            if (onSaveSuccess) onSaveSuccess(); // Refresh table
            // Reset form completely
            setFormData(initialFormState);
            setLectureType('Theory');
        } catch (err) {
            setStatus({ msg: 'Operation failed. Please try again.', error: true });
        }
    };
    
    const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
            <div><label className="block text-sm font-medium text-gray-700">Subject Name</label><input type="text" name="name" value={formData.name} onChange={handleFormChange} placeholder="e.g., Advanced Calculus" className={inputClass} required/></div>
            <div><label className="block text-sm font-medium text-gray-700">Subject Code</label><input type="text" name="code" value={formData.code} onChange={handleFormChange} placeholder="e.g., MATH-301" className={inputClass} required/></div>
            
            {/* --- The New Dynamic Section --- */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Lecture Type</label>
                <select value={lectureType} onChange={handleTypeChange} className={inputClass}>
                    <option value="Theory">Theory Only</option>
                    <option value="Lab">Lab Only</option>
                    <option value="Both">Theory & Lab</option>
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {(lectureType === 'Theory' || lectureType === 'Both') && <div><label>Theory Lectures per Week</label><input type="number" name="theory_lectures_per_week" value={formData.theory_lectures_per_week} onChange={handleFormChange} min="0" className={inputClass}/></div>}
                {(lectureType === 'Lab' || lectureType === 'Both') && <div><label>Lab Sessions per Week</label><input type="number" name="lab_sessions_per_week" value={formData.lab_sessions_per_week} onChange={handleFormChange} min="0" className={inputClass}/></div>}
            </div>
            <div className="text-xs text-gray-500 -mt-4"></div>

            <div className="flex justify-end pt-4">
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">{editingItem ? 'Update Subject' : 'Save Subject'}</button>
            </div>
            {status && <p className={`mt-2 text-sm ${status.error ? "text-red-500" : "text-green-600"}`}>{status.msg}</p>}
        </form>
    );
}