import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { useNavigate } from 'react-router-dom';

export default function GeneratePage() {
    const [task, setTask] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    
    const handleGenerate = () => {
        setError('');
        setTask({ state: 'PENDING', status: 'Submitting job to the AI engine...' });
        apiClient.post('/api/generate')
            .then(res => setTask({ id: res.data.taskId, state: 'PENDING', status: 'Task is in the queue...' }))
            .catch(() => setError('Failed to start the generation process.'));
    };

    useEffect(() => {
        if (!task?.id) return; // Only poll if there's a task ID

        const pollStatus = () => {
            // --- THIS IS THE CORRECTED LOGIC ---
            // It polls the REAL task status from the backend.
            apiClient.get(`/api/task/${task.id}`).then(res => {
                const { state, status, result, error: taskError } = res.data;
                
                if (state === 'SUCCESS') {
                    // Task succeeded, navigate with the real results
                    navigate('/timetable', { state: { timetableResult: result } });
                } else if (state === 'FAILURE') {
                    // Task failed, display the error and stop polling
                    setError(taskError || 'The generation task failed for an unknown reason.');
                    setTask(null);
                } else {
                    // Task is still PENDING or in PROGRESS, update status and poll again
                    setTask(prev => ({ ...prev, state, status: status || prev.status, progress: res.data.progress }));
                    setTimeout(pollStatus, 3000); // Poll again after 3 seconds
                }
            }).catch(() => {
                setError('Could not retrieve task status from the server.');
                setTask(null);
            });
        };
        
        // Start the polling
        const timer = setTimeout(pollStatus, 1000);

        // Cleanup function to stop polling if the component unmounts
        return () => clearTimeout(timer);

    }, [task?.id, navigate]);
    
    const isProcessing = task && task.state !== 'SUCCESS' && task.state !== 'FAILURE';

    return (
        <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-bold">Generate Your Timetable</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                Ensure all your data is entered correctly on the 'Data Entry' page. Then, click the button below to start the AI generation.
            </p>
            <div className="mt-8">
                <button
                    onClick={handleGenerate}
                    disabled={isProcessing}
                    className="px-8 py-4 text-lg font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                    {isProcessing ? 'Generating...' : 'Start AI Generation'}
                </button>
            </div>
            
            {isProcessing && (
                 <div className="mt-8 max-w-xl mx-auto">
                     <p className="font-semibold">{task.status}</p>
                     <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${task.progress || 10}%`}}></div>
                     </div>
                 </div>
            )}
            
            {error && <p className="mt-4 text-red-600 font-semibold">Error: {error}</p>}
        </div>
    );
};
