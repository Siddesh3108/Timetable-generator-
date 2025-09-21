import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api';
import DivisionForm from '../components/forms/DivisionForm';
import CourseForm from '../components/forms/CourseForm';
import CourseTable from '../components/CourseTable';

// --- THIS IS THE NEW, FULLY CORRECTED FILE ---

export default function Academics() {
    // State for all data
    const [divisions, setDivisions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);

    // State for managing editing mode
    const [editingCourse, setEditingCourse] = useState(null);
    const [editingDivision, setEditingDivision] = useState(null); // <-- NEW STATE

    const fetchDataCallback = useCallback(async () => {
        try {
            const [divRes, courseRes, teacherRes, subjectRes] = await Promise.all([
                apiClient.get('/api/divisions'),
                apiClient.get('/api/courses'),
                apiClient.get('/api/teachers'),
                apiClient.get('/api/subjects'),
            ]);
            setDivisions(divRes.data);
            setCourses(courseRes.data);
            setTeachers(teacherRes.data);
            setSubjects(subjectRes.data);
        } catch (error) {
            console.error("Failed to fetch academic data", error);
        }
    }, []);

    useEffect(() => {
        fetchDataCallback();
    }, [fetchDataCallback]);

    // --- NEW HANDLERS for Division Edit/Delete ---
    const handleEditDivision = (division) => {
        setEditingDivision(division);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
    };

    const handleDeleteDivision = async (divisionId) => {
        if (window.confirm("Are you sure? Deleting a division will also delete all of its course assignments.")) {
            try {
                await apiClient.delete(`/api/divisions/${divisionId}`);
                fetchDataCallback();
            } catch (error) {
                alert("Error deleting division.");
            }
        }
    };
    
    // --- Course Handlers (unchanged) ---
    const handleEditCourse = (course) => {
        setEditingCourse(course);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteCourse = async (courseId) => {
        if (window.confirm("Are you sure you want to delete this course assignment?")) {
            try {
                await apiClient.delete(`/api/courses/${courseId}`);
                fetchDataCallback();
            } catch (error) {
                alert("Error deleting course.");
            }
        }
    };

    // Generic save success handler for both forms
    const handleSaveSuccess = () => {
        setEditingCourse(null);
        setEditingDivision(null); // Clear division editing mode as well
        fetchDataCallback();
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Academic Setup</h1>
            <p className="text-gray-600 mb-8">Define your academic structure by creating divisions and assigning courses to teachers.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                
                {/* Division Management Section */}
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">{editingDivision ? 'Editing Division' : 'Manage Divisions'}</h2>
                    <DivisionForm 
                        onSaveSuccess={handleSaveSuccess}
                        editingItem={editingDivision}
                        onCancelEdit={() => setEditingDivision(null)}
                    />
                    <div className="mt-6 border-t pt-4">
                        <h3 className="font-semibold mb-4">Existing Divisions:</h3>
                        {divisions.length > 0 ? (
                            <table className="min-w-full bg-white">
                                <tbody>
                                    {divisions.map(d => (
                                        <tr key={d.id} className="hover:bg-gray-50 border-b">
                                            <td className="py-2 px-4">{d.name}</td>
                                            <td className="py-2 px-4 text-right">
                                                <button onClick={() => handleEditDivision(d)} className="text-blue-600 hover:underline mr-4">Edit</button>
                                                <button onClick={() => handleDeleteDivision(d.id)} className="text-red-600 hover:underline">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <p className="text-sm italic">No divisions created yet.</p>}
                    </div>
                </div>

                {/* Course Management Section */}
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">{editingCourse ? 'Editing Course Assignment' : 'Assign New Course'}</h2>
                     <CourseForm
                        divisions={divisions} teachers={teachers} subjects={subjects}
                        onSaveSuccess={handleSaveSuccess}
                        editingItem={editingCourse}
                        onCancelEdit={() => setEditingCourse(null)}
                     />
                </div>
            </div>
            
            {/* Existing Courses Table */}
            <div className="mt-12 bg-white p-8 rounded-lg shadow-md">
                <CourseTable courses={courses} onEdit={handleEditCourse} onDelete={handleDeleteCourse} />
            </div>
        </div>
    );
}
