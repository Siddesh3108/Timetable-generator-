import React, { useState, useEffect } from 'react';
import apiClient from '../../api';

const initialFormState = { name: '', code: '', requires_lab: false };

export default function SubjectForm({ onSaveSuccess, editingItem, onCancelEdit }) {
    const [formData, setFormData] = useState(initialFormState);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (editingItem) {
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
        const apiCall = editingItem ? apiClient.put(`/api/subjects/${editingItem.id}`, formData) : apiClient.post('/api/subjects', formData);
        try {
            await apiCall;
            if(onSaveSuccess) onSaveSuccess();
        } catch (err) { setStatus('Operation failed.'); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
            <h3 className="text-lg font-semibold">Subject Information</h3>
            <div><label>Subject Name</label><input name="name" type="text" value={formData.name || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300" required/></div>
            <div><label>Subject Code</label><input name="code" type="text" value={formData.code || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300"/></div>
            <div className="flex items-center"><input name="requires_lab" type="checkbox" checked={formData.requires_lab || false} onChange={handleChange} className="h-4 w-4 rounded mr-2"/><label>Requires Lab Component</label></div>

            <div className="flex justify-end space-x-4 pt-4">
                {editingItem && <button type="button" onClick={onCancelEdit} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-md">Cancel</button>}
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md">{editingItem ? 'Update Subject' : 'Save Subject'}</button>
            </div>
            {status && <p className="text-red-600">{status}</p>}
        </form>
    );
}
