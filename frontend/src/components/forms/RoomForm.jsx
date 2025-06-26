import React, { useState, useEffect } from 'react';
import apiClient from '../../api';

const initialFormState = { name: '', room_type: 'Classroom', capacity: 30 };

export default function RoomForm({ onSaveSuccess, editingItem, onCancelEdit }) {
    const [formData, setFormData] = useState(initialFormState);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (editingItem) {
            setFormData(editingItem);
        } else {
            setFormData(initialFormState);
        }
    }, [editingItem]);

    const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

    const handleSubmit = async (e) => {
        e.preventDefault();
        const apiCall = editingItem ? apiClient.put(`/api/rooms/${editingItem.id}`, formData) : apiClient.post('/api/rooms', formData);
        try {
            await apiCall;
            if(onSaveSuccess) onSaveSuccess();
        } catch (err) { setStatus('Operation failed.'); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
            <h3 className="text-lg font-semibold">Room Information</h3>
            <div><label>Room Name / Number</label><input name="name" type="text" value={formData.name || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300" required/></div>
            <div><label>Room Type</label><select name="room_type" value={formData.room_type || 'Classroom'} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300"><option>Classroom</option><option>Lab</option></select></div>
            <div><label>Capacity</label><input name="capacity" type="number" value={formData.capacity || 30} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300"/></div>
            
            <div className="flex justify-end space-x-4 pt-4">
                {editingItem && <button type="button" onClick={onCancelEdit} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-md">Cancel</button>}
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md">{editingItem ? 'Update Room' : 'Save Room'}</button>
            </div>
            {status && <p className="text-red-600">{status}</p>}
        </form>
    );
}
