import React, { useState, useEffect } from 'react';
import apiClient from '../../api';

const initialFormState = { name: '', room_type: 'Classroom', capacity: 30 };

export default function RoomForm({ onSaveSuccess, editingItem, onCancelEdit }) {
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
        if (editingItem && editingItem.name) {
            setFormData(editingItem);
        } else {
            setFormData(initialFormState);
        }
    }, [editingItem]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        // Allow backspacing on number fields
        const finalValue = type === 'number' ? (value === '' ? '' : parseInt(value, 10)) : value;
        setFormData(p => ({ ...p, [name]: finalValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Ensure empty number fields are sent as 0
        const dataToSend = {
            ...formData,
            capacity: formData.capacity || 0,
        };

        const apiCall = editingItem
            ? apiClient.put(`/api/rooms/${editingItem.id}`, dataToSend)
            : apiClient.post('/api/rooms', dataToSend);
            
        try {
            await apiCall;
            setStatus({ msg: `Room ${editingItem ? 'updated' : 'saved'} successfully!`, error: false });
            if (onSaveSuccess) onSaveSuccess(); // This will clear the form and refresh the table
        } catch (err) {
            setStatus({ msg: 'Operation failed. Please try again.', error: true });
        }
    };
    
    const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
            <div>
                <label className="block text-sm font-medium text-gray-700">Room Name / Number</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., C-101, Auditorium, Physics Lab"
                    className={inputClass}
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Room Type</label>
                <select
                    name="room_type"
                    value={formData.room_type}
                    onChange={handleChange}
                    className={inputClass}
                >
                    <option>Classroom</option>
                    <option>Laboratory</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Capacity</label>
                <input
                    type="number"
                    name="capacity"
                    min="1"
                    value={formData.capacity}
                    onChange={handleChange}
                    placeholder="e.g., 60"
                    className={inputClass}
                />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
                {editingItem && <button type="button" onClick={onCancelEdit} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700">Cancel</button>}
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                    {editingItem ? 'Update Room' : 'Save Room'}
                </button>
            </div>
            {status && <p className={`mt-4 text-sm ${status.error ? "text-red-500" : "text-green-600"}`}>{status.msg}</p>}
        </form>
    );
}