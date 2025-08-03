import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api';
import DivisionForm from '../components/forms/DivisionForm';
import CourseForm from '../components/forms/CourseForm';
import CourseTable from '../components/CourseTable'; // <-- Import the new table

export default function Academics() {
    const [divisions, setDivisions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [editingCourse, setEditingCourse] = useState(null); // <-- State for editing a course

    const fetchData = useCallback(async () => { /* ... (fetchData is unchanged) ... */ }, []);
    
    // (This useCallback is unchanged, just for reference)
    const fetchDataCallback = useCallback(async () => {
        try {
            const [divRes, courseRes, teacherRes, subjectRes] = await Promise.all([
                apiClient.get('/api/divisions'),
                apiClient.get('/api/courses'),
                apiClient.get('/api/teachers'),
                apiClient.get('/api/subjects'),
            ]);
            const uniqueTeachers = Array.from(new Map(teacherRes.data.map(t => [t.name, t])).values());
            setDivisions(divRes.data);
            setCourses(courseRes.data);
            setTeachers(uniqueTeachers);
            setSubjects(subjectRes.data);
        } catch (error) {
            console.error("Failed to fetch academic data", error);
        }
    }, []);

    useEffect(() => {
        fetchDataCallback();
    }, [fetchDataCallback]);

    // --- NEW HANDLERS for Edit/Delete ---
    const handleEditCourse = (course) => {
        setEditingCourse(course);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
    };

    const handleDeleteCourse = async (courseId) => {
        if (window.confirm("Are you sure you want to delete this course assignment?")) {
            try {
                await apiClient.delete(`/api/courses/${courseId}`);
                fetchDataCallback(); // Refresh the list
            } catch (error) {
                alert("Error deleting course.");
            }
        }
    };

    const handleSaveSuccess = () => {
        setEditingCourse(null); // Clear editing mode
        fetchDataCallback();
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Academic Setup</h1>
            <p className="text-gray-600 mb-8">Define your academic structure by creating divisions and assigning courses to teachers.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Division Management Section */}
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Manage Divisions</h2>
                    <DivisionForm onSaveSuccess={fetchDataCallback} />
                    <div className="mt-6 border-t pt-4">
                        <h3 className="font-semibold">Existing Divisions:</h3>
                        <ul className="list-disc list-inside mt-2 text-gray-700">
                            {divisions.length > 0 ? divisions.map(d => <li key={d.id}>{d.name}</li>) : <p className="text-sm italic">No divisions created yet.</p>}
                        </ul>
                    </div>
                </div>
                {/* Course Management Section */}
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">{editingCourse ? 'Editing Course Assignment' : 'Assign New Course'}</h2>
                     <CourseForm
                        divisions={divisions} teachers={teachers} subjects={subjects}
                        onSaveSuccess={handleSaveSuccess}
                        editingItem={editingCourse} // Pass the course to be edited
                        onCancelEdit={() => setEditingCourse(null)} // Add cancel functionality
                     />
                </div>
            </div>
            {/* --- NEW: Display the table of existing courses --- */}
            <div className="mt-12 bg-white p-8 rounded-lg shadow-md">
                <CourseTable courses={courses} onEdit={handleEditCourse} onDelete={handleDeleteCourse} />
            </div>
        </div>
    );
}