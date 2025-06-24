import React, { useState } from 'react';
import apiClient from '../../api';
export default function TeacherForm() {
    const [formData, setFormData] = useState({name: '', subject_taught: '', classes_taught: '', max_lectures_per_day: 5, lecture_type: 'Theory', theory_hours_per_week: 0, lab_hours_per_week: 0, is_visiting: false});
    const [avail, setAvail] = useState({monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, from: '09:00', to: '17:00'});
    const [status, setStatus] = useState('');
    const handleFormChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    const handleAvailChange = (e) => setAvail(p => ({ ...p, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    const handleSubmit = e => {
        e.preventDefault();
        let payload = { ...formData };
        if(formData.is_visiting) {
            payload.availability = { days: Object.keys(avail).filter(k => avail[k] === true), from: avail.from, to: avail.to };
        }
        apiClient.post('/api/teachers', payload).then(() => setStatus('Teacher saved!'));
    };
    const inputClass="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";
    return(
        <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Teacher Information</h3>
            <div><label className="block text-sm font-medium text-gray-700">Teacher Name</label><input type="text" name="name" value={formData.name} onChange={handleFormChange} placeholder="Enter teacher's full name" className={inputClass} required/></div>
            <div><label className="block text-sm font-medium text-gray-700">Subject Taught</label><input type="text" name="subject_taught" value={formData.subject_taught} onChange={handleFormChange} placeholder="e.g., Mathematics, Physics" className={inputClass}/></div>
            <div><label className="block text-sm font-medium text-gray-700">Classes Taught</label><input type="text" name="classes_taught" value={formData.classes_taught} onChange={handleFormChange} placeholder="e.g., 9A, 10B, 11-Science" className={inputClass}/></div>
            <div><label className="block text-sm font-medium text-gray-700">Preferred Max Lectures per Day</label><input type="number" name="max_lectures_per_day" value={formData.max_lectures_per_day} onChange={handleFormChange} placeholder="e.g., 5" className={inputClass}/></div>
            <div><label className="text-sm font-medium text-gray-700">Lecture Type</label><div className="flex space-x-4 mt-1"><label><input type="radio" name="lecture_type" value="Theory" checked={formData.lecture_type==='Theory'} onChange={handleFormChange}/> Theory</label><label><input type="radio" name="lecture_type" value="Lab" checked={formData.lecture_type==='Lab'} onChange={handleFormChange}/> Lab</label><label><input type="radio" name="lecture_type" value="Both" checked={formData.lecture_type==='Both'} onChange={handleFormChange}/> Both</label></div></div>
            <div className="grid grid-cols-2 gap-4">
                {(formData.lecture_type === 'Theory' || formData.lecture_type === 'Both') && <div><label>Theory Hours per Week</label><input type="number" name="theory_hours_per_week" value={formData.theory_hours_per_week} onChange={handleFormChange} className={inputClass} /></div>}
                {(formData.lecture_type === 'Lab' || formData.lecture_type === 'Both') && <div><label>Lab Hours per Week</label><input type="number" name="lab_hours_per_week" value={formData.lab_hours_per_week} onChange={handleFormChange} className={inputClass} /></div>}
            </div>
            <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="is_visiting" name="is_visiting" type="checkbox" checked={formData.is_visiting} onChange={handleFormChange} className="h-4 w-4 rounded"/></div><div className="ml-3 text-sm"><label htmlFor="is_visiting">Is this a Visiting Faculty?</label></div></div>
            {formData.is_visiting && <div className="p-4 rounded-md bg-gray-50 border space-y-4"><p className="font-semibold">Visiting Faculty Availability</p><div className="grid grid-cols-3 gap-2">{Object.keys(avail).filter(k => k.endsWith('day')).map(day => (<label key={day}><input type="checkbox" name={day} checked={avail[day]} onChange={handleAvailChange} /> {day.charAt(0).toUpperCase()+day.slice(1)}</label>))}</div><div className="grid grid-cols-2 gap-4"><label>From <input type="time" name="from" value={avail.from} onChange={handleAvailChange} className={inputClass}/></label><label>To <input type="time" name="to" value={avail.to} onChange={handleAvailChange} className={inputClass}/></label></div></div>}
            {status && <p className={status.error ? "text-red-500" : "text-green-600"}>{status}</p>}
            <div className="text-right"><button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Save Teacher</button></div>
        </form>
    );
}
