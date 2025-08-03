import React, { useState, useEffect } from 'react';
import apiClient from '../../api';

const initialFormState = { subject_id: '', teacher_id: '', division_id: '' };

export default function CourseForm({ divisions, teachers, subjects, onSaveSuccess, editingItem, onCancelEdit }) {
    const [formData, setFormData] = useState(initialFormState);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (status) {
            const timer = setTimeout(() => setStatus(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    // This useEffect populates the form when editing starts
    useEffect(() => {
        if (editingItem) {
            setFormData({
                subject_id: editingItem.subject_id,
                teacher_id: editingItem.teacher_id,
                division_id: editingItem.division_id,
            });
        } else {
            setFormData(initialFormState);
        }
    }, [editingItem]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Determine if we are updating (PUT) or creating (POST)
        const apiCall = editingItem
            ? apiClient.put(`/api/courses/${editingItem.id}`, formData)
            : apiClient.post('/api/courses', formData);
        try {
            await apiCall;
            setStatus({ msg: `Course ${editingItem ? 'updated' : 'saved'} successfully!`, error: false });
            if (onSaveSuccess) onSaveSuccess(); // Refresh table & clear editing mode
        } catch (err) {
            setStatus({ msg: 'Operation failed. Please try again.', error: true });
        }
    };
    
    const selectClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">Subject</label><select name="subject_id" value={formData.subject_id} onChange={handleChange} className={selectClass} required><option value="">-- Select a Subject --</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700">Teacher</label><select name="teacher_id" value={formData.teacher_id} onChange={handleChange} className={selectClass} required><option value="">-- Select a Teacher --</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700">Division</label><select name="division_id" value={formData.division_id} onChange={handleChange} className={selectClass} required><option value="">-- Select a Division --</option>{divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            
            <div className="flex justify-end space-x-4 pt-2">
                {editingItem && (<button type="button" onClick={onCancelEdit} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700">Cancel</button>)}
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">{editingItem ? 'Update Course' : 'Assign Course'}</button>
            </div>
            {status && <p className={`mt-2 text-sm ${status.error ? "text-red-500" : "text-green-600"}`}>{status.msg}</p>}
        </form>
    );
}