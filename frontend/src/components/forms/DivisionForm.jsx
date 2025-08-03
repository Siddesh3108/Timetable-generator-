import React, { useState, useEffect } from 'react'; // <-- CORRECTED: Added useEffect here
import apiClient from '../../api';

export default function DivisionForm({ onSaveSuccess }) {
    const [name, setName] = useState('');
    const [status, setStatus] = useState('');

    // This useEffect hook will make the success/error message disappear after 5 seconds
    useEffect(() => {
        if (status) {
            const timer = setTimeout(() => {
                setStatus('');
            }, 5000);
            return () => clearTimeout(timer); // This cleans up the timer if the component unmounts
        }
    }, [status]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setStatus({ msg: 'Division name cannot be empty.', error: true });
            return;
        }
        try {
            await apiClient.post('/api/divisions', { name });
            setStatus({ msg: `Division "${name}" saved successfully!`, error: false });
            setName(''); // Clear form
            if (onSaveSuccess) onSaveSuccess(); // Refresh the list
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Third Year Comp Eng - A"
                    className={inputClass}
                />
            </div>
            <div className="flex justify-end">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                    Add Division
                </button>
            </div>
            {status && <p className={`mt-2 text-sm ${status.error ? "text-red-500" : "text-green-600"}`}>{status.msg}</p>}
        </form>
    );
}