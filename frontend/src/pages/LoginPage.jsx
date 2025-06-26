import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';

export default function LoginPage() {
    // We get the saved email when the component first loads
    const [email, setEmail] = useState(() => localStorage.getItem('rememberedEmail') || '');
    const [password, setPassword] = useState('');
    // If there's a saved email, we default the checkbox to true
    const [remember, setRemember] = useState(() => !!localStorage.getItem('rememberedEmail'));
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // --- THIS IS THE KEY LOGIC ---
        if (remember) {
            // If checkbox is ticked, save the email to localStorage
            localStorage.setItem('rememberedEmail', email);
        } else {
            // If not, remove it
            localStorage.removeItem('rememberedEmail');
        }

        try {
            const response = await apiClient.post('/auth/login', { email, password, remember });
            login(response.data.user);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm";
    
    return (
        <div className="flex flex-col justify-center items-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md"><h2 className="mt-10 text-center text-3xl font-bold tracking-tight text-gray-900">Welcome Back</h2><p className="mt-2 text-center text-sm text-gray-600">Sign in to generate your timetable</p></div>
            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white px-6 py-8 shadow-lg rounded-xl sm:px-10">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm text-center">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div><label className="block text-sm font-medium leading-6 text-gray-900">Email Address</label><div className="mt-2"><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass}/></div></div>
                        <div><label className="block text-sm font-medium leading-6 text-gray-900">Password</label><div className="mt-2"><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass}/></div></div>
                        <div className="flex items-center"><input id="remember-me" name="remember-me" type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600"/><label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">Remember me</label></div>
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">{loading ? 'Signing In...' : 'Sign In'}</button>
                    </form>
                    <p className="mt-10 text-center text-sm text-gray-500">Don't have an account? <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-500">Sign up for free</Link></p>
                </div>
            </div>
        </div>
    );
}
