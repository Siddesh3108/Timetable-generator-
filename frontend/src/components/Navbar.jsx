import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
const Navbar = () => {
    const { user, logout } = useAuth();
    const linkClass = ({ isActive }) => `px-3 py-2 text-sm font-medium rounded-md ${isActive ? 'text-blue-700 bg-blue-100' : 'text-gray-500 hover:text-gray-900'}`;
    return (
        <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
            <div className="container mx-auto px-6 h-20 flex justify-between items-center">
                <NavLink to="/dashboard" className="text-2xl font-bold text-gray-800">Timetable Generator</NavLink>
                {user && (
                    <div className="flex items-center space-x-6">
                        <nav className="flex items-center space-x-4">
                            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
                            <NavLink to="/data-entry" className={linkClass}>Data Entry</NavLink>
                            <NavLink to="/generate" className={linkClass}>Generate</NavLink> {/* Add Generate link */}
                            <NavLink to="/timetable" className={linkClass}>Timetable</NavLink>
                        </nav>
                        <div className="flex items-center space-x-3">
                            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg></button>
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg cursor-pointer" onClick={logout} title={`Logout ${user.username}`}>{user.username.charAt(0).toUpperCase()}</div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
export default Navbar;
