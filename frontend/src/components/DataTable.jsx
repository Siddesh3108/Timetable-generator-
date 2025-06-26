import React from 'react';
import apiClient from '../api';

export default function DataTable({ title, items, onEdit, onSaveSuccess }) {
    if (!items || items.length === 0) {
        return <p className="text-gray-500 italic mb-6">No {title.toLowerCase()} entered yet.</p>;
    }
    const headers = Object.keys(items[0]).filter(key => !['id', 'availability', 'user_id', 'password_hash'].includes(key));

    const handleDelete = async (id) => {
        const endpoint = title.toLowerCase();
        if (window.confirm(`Are you sure you want to delete this ${endpoint.slice(0, -1)}?`)) {
            try {
                await apiClient.delete(`/api/${endpoint}/${id}`);
                onSaveSuccess();
            } catch (error) { alert(`Error deleting item.`); }
        }
    };

    return (
        <div className="mb-8 overflow-x-auto">
            <h2 className="text-xl font-bold mb-4">Existing {title}</h2>
            <table className="min-w-full bg-white border">
                <thead className="bg-gray-100">
                    <tr>
                        {headers.map(header => (<th key={header} className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">{header.replace(/_/g, ' ')}</th>))}
                        <th className="py-2 px-4 border-b text-center text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                            {headers.map(header => (<td key={header} className="py-2 px-4 border-b whitespace-nowrap">{String(item[header])}</td>))}
                            <td className="py-2 px-4 border-b text-center">
                                <button onClick={() => onEdit(item)} className="text-blue-600 hover:underline mr-4">Edit</button>
                                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
