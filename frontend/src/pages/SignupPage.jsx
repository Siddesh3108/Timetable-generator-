import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api';

export default function SignupPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true); setError('');
        if (password.length < 6) {
             setError("Password must be at least 6 characters long.");
             setLoading(false);
             return;
        }
        try {
            await apiClient.post('/auth/signup', { username, email, password });
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Signup failed. Please try a different email.');
            setLoading(false);
        }
    };
    const inputClass = "block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm";
    return (
         <div className="flex flex-col justify-center items-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900">Create an Account</h2>
                <p className="mt-2 text-center text-sm text-gray-600">Get started with the Timetable Generator</p>
            </div>
            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white px-6 py-8 shadow-lg rounded-xl sm:px-10">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm text-center">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900">Username</label>
                            <div className="mt-2"><input type="text" value={username} onChange={e => setUsername(e.target.value)} required className={inputClass}/></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900">Email Address</label>
                            <div className="mt-2"><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass}/></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900">Password</label>
                            <div className="mt-2"><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass}/></div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>
                    <p className="mt-10 text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold leading-6 text-blue-600 hover:text-blue-500">Log in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
