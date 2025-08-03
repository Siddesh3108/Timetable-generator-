import React from 'react';

export default function CourseTable({ courses, onEdit, onDelete }) {
    if (!courses || courses.length === 0) {
        return <p className="text-gray-500 italic">No courses assigned yet.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4">Existing Course Assignments</h3>
            <table className="min-w-full bg-white border">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Subject</th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Teacher</th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Division</th>
                        <th className="py-2 px-4 border-b text-center text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {courses.map(course => (
                        <tr key={course.id} className="hover:bg-gray-50">
                            <td className="py-2 px-4 border-b whitespace-nowrap">{course.subject_name}</td>
                            <td className="py-2 px-4 border-b whitespace-nowrap">{course.teacher_name}</td>
                            <td className="py-2 px-4 border-b whitespace-nowrap">{course.division_name}</td>
                            <td className="py-2 px-4 border-b text-center">
                                <button onClick={() => onEdit(course)} className="text-blue-600 hover:underline mr-4">Edit</button>
                                <button onClick={() => onDelete(course.id)} className="text-red-600 hover:underline">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}