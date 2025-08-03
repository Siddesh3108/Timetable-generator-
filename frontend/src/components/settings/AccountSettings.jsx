// frontend/src/components/settings/AccountSettings.jsx

import React from 'react';
import { useAuth } from '../../context/AuthContext'; // Assuming you have a logout function here

export default function AccountSettings() {
    const { logout } = useAuth(); // Or however your logout is implemented

    const handleDeleteAccount = () => {
        if (window.confirm("Are you sure you want to delete your account? This action is irreversible and will delete all your data.")) {
            // Add your API call to delete the account here
            // e.g., apiClient.delete('/api/user').then(() => logout());
            alert("Delete functionality not yet implemented.");
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900">Logout</h3>
                <p className="text-sm text-gray-500 mb-4">You will be returned to the login screen.</p>
                <button onClick={logout} className="px-5 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700">
                    Logout
                </button>
            </div>

            <div className="border-t pt-6">
                 <h3 className="text-lg font-medium text-red-700">Delete Account</h3>
                 <p className="text-sm text-gray-500 mb-4">Permanently delete your account and all associated data.</p>
                 <button onClick={handleDeleteAccount} className="px-5 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">
                    Delete My Account
                </button>
            </div>
        </div>
    );
}