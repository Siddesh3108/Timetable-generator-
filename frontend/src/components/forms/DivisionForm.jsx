import React, { useState, useEffect } from 'react';
import apiClient from '../../api';

// --- THIS IS THE NEW, FULLY CORRECTED FILE ---

const initialFormState = { name: '' };

export default function DivisionForm({ onSaveSuccess, editingItem, onCancelEdit }) {
    const [formData, setFormData] = useState(initialFormState);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (editingItem) {
            setFormData({ name: editingItem.name });
        } else {
            setFormData(initialFormState);
        }
    }, [editingItem]);

    useEffect(() => {
        if (status) {
            const timer = setTimeout(() => setStatus(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const handleChange = (e) => {
        setFormData({ name: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setStatus({ msg: 'Division name cannot be empty.', error: true });
            return;
        }

        const apiCall = editingItem
            ? apiClient.put(`/api/divisions/${editingItem.id}`, formData)
            : apiClient.post('/api/divisions', formData);
            
        try {
            await apiCall;
            setStatus({ msg: `Division "${formData.name}" ${editingItem ? 'updated' : 'saved'} successfully!`, error: false });
            if (onSaveSuccess) onSaveSuccess(); // Refresh table & clear form
        } catch (err) {
            setStatus({ msg: 'Operation failed. Please try again.', error: true });
        }
    };

    const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="division_name" className="block text-sm font-medium text-gray-700">Division Name</label>
                <input
                    type="text"
                    id="division_name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Third Year Comp Eng - A"
                    className={inputClass}
                />
            </div>
            <div className="flex justify-end space-x-4">
                {editingItem && (
                    <button type="button" onClick={onCancelEdit} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700">
                        Cancel
                    </button>
                )}
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                    {editingItem ? 'Update Division' : 'Add Division'}
                </button>
            </div>
            {status && <p className={`mt-2 text-sm ${status.error ? "text-red-500" : "text-green-600"}`}>{status.msg}</p>}
        </form>
    );
}
