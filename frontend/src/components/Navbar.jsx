import React, { useState, useEffect, useRef } from 'react';
// --- MODIFIED: Import 'Link' from react-router-dom ---
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    // --- MODIFIED: Removed 'deleteAccount' as it's no longer used here ---
    const { user, logout } = useAuth();
    const [isMenuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const linkClass = ({ isActive }) => `px-3 py-2 text-sm font-medium rounded-md ${isActive ? 'text-blue-700 bg-blue-100' : 'text-gray-500 hover:text-gray-900'}`;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    // The handleDeleteClick function is no longer needed here.

    return (
        <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-50 print-hide">
            <div className="container mx-auto px-6 h-20 flex justify-between items-center">
                <NavLink to="/dashboard" className="text-2xl font-bold text-gray-800">Timetable Generator</NavLink>
                {user && (
                    <div className="flex items-center space-x-6">
                        <nav className="flex items-center space-x-4">
                            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
                            <NavLink to="/academics" className={linkClass}>Academics</NavLink>
                            <NavLink to="/data-entry" className={linkClass}>Data Entry</NavLink>
                            <NavLink to="/generate" className={linkClass}>Generate</NavLink>
                            <NavLink to="/timetable" className={linkClass}>View Timetable</NavLink>
                        </nav>
                        <div className="flex items-center space-x-4" ref={menuRef}>
                             <div onClick={() => setMenuOpen(!isMenuOpen)} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg cursor-pointer" title={user.username}>{user.username.charAt(0).toUpperCase()}</div>
                             {/* --- MODIFIED: This is the updated dropdown menu --- */}
                             {isMenuOpen && (
                                <div className="absolute right-0 mt-2 top-full w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                                    <div className="px-4 py-2 text-sm text-gray-500">
                                        Signed in as <span className="font-semibold text-gray-800">{user.username}</span>
                                    </div>
                                    <div className="border-t border-gray-200 my-1"></div>
                                    <Link 
                                        to="/settings" 
                                        onClick={() => setMenuOpen(false)} 
                                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Settings
                                    </Link>
                                    <button 
                                        onClick={() => { logout(); setMenuOpen(false); }} 
                                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Logout
                                    </button>
                                </div>
                             )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};