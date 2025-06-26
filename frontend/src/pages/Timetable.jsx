import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useAuth } from '../context/AuthContext'; // <-- Import useAuth

// --- Reusable Components (no changes here) ---
const TimeSlot = ({ time }) => (<div className="h-28 flex items-center justify-center text-sm font-semibold text-gray-500 sticky left-0 bg-white z-10 border-r border-gray-200">{time}</div>);
const DayHeader = ({ day }) => (<div className="text-center font-bold text-gray-700 py-3 sticky top-0 bg-white z-10 border-b border-gray-200">{day.toUpperCase()}</div>);
const TimetableCard = ({ event, provided, snapshot }) => {
    const color = event.room.room_type === 'Lab' ? 'bg-green-100 border-green-300' : 'bg-blue-100 border-blue-300';
    return (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{...provided.draggableProps.style}} className={`p-2 rounded-lg border text-xs shadow-sm m-1 ${color} ${snapshot.isDragging ? 'ring-2 ring-blue-500 shadow-xl' : ''}`}>
            <p className="font-bold text-gray-800 truncate">{event.subject.name}</p>
            <p className="text-gray-600 truncate">{event.teacher.name}</p>
            <p className="text-gray-500 italic truncate">{event.room.name}</p>
        </div>
    );
};

export default function TimetablePage() {
    const navigate = useNavigate();
    const { timetableResult } = useAuth(); // <-- Get the result from the global context
    const [gridSchedule, setGridSchedule] = useState({});
    const [flatSchedule, setFlatSchedule] = useState([]); // Use local state for drag-and-drop modifications

    useEffect(() => {
        // --- THIS IS THE KEY CHANGE ---
        // When the component mounts or the global result changes, update the local schedule
        if (timetableResult?.timetable) {
            const flattened = [];
            Object.values(timetableResult.timetable).forEach(day => {
                Object.values(day).forEach(slots => {
                    slots.forEach(event => flattened.push(event));
                });
            });
            setFlatSchedule(flattened);
        }
    }, [timetableResult]); // Re-run this effect when the global timetableResult changes

    useEffect(() => {
        const newGrid = {};
        flatSchedule.forEach(event => {
            if (!newGrid[event.day]) newGrid[event.day] = {};
            if (!newGrid[event.day][event.time]) newGrid[event.day][event.time] = [];
            newGrid[event.day][event.time].push(event);
        });
        setGridSchedule(newGrid);
    }, [flatSchedule]);

    const handleOnDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;
        const [newDay, newTime] = destination.droppableId.split('-');
        // Update the *local* flatSchedule for immediate UI feedback
        setFlatSchedule(prev => prev.map(event =>
            event.id === draggableId ? { ...event, day: newDay, time: newTime } : event
        ));
    };

    if (!timetableResult) { // Check the global result now
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-3xl font-bold text-gray-900">View Timetable</h1>
                <p className="mt-4 text-lg text-gray-600">No timetable has been generated in this session yet.</p>
                <button onClick={() => navigate('/generate')} className="mt-8 px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Go to Generate Page</button>
            </div>
        );
    }

    const timeSlots = ['9', '10', '11', '12', '13', '14', '15', '16', '17'];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    return (
        <div className="pb-16">
            <div className="flex justify-between items-center mb-6 print-hide">
                <h1 className="text-3xl font-bold text-gray-900">Generated Timetable</h1>
                <button onClick={() => window.print()} className="px-4 py-2 text-blue-600 font-semibold rounded-md hover:bg-blue-100">Print Timetable</button>
            </div>
            <DragDropContext onDragEnd={handleOnDragEnd}>
                <div className="bg-white rounded-lg shadow-md overflow-x-auto timetable-container">
                    <div className="grid grid-cols-[120px_repeat(6,1fr)] min-w-[900px]">
                        <div className="sticky top-0 bg-white z-20"></div>
                        {days.map(day => <DayHeader key={day} day={day} />)}
                        {timeSlots.map(timeKey => (
                            <React.Fragment key={timeKey}>
                                <TimeSlot time={`${timeKey}:00 - ${parseInt(timeKey) + 1}:00`} />
                                {days.map(day => (
                                    <Droppable key={`${day}-${timeKey}`} droppableId={`${day}-${timeKey}`}>
                                        {(provided) => (<div ref={provided.innerRef} {...provided.droppableProps} className="h-32 border-t border-r border-gray-200 p-1">
                                            {(gridSchedule[day]?.[timeKey] || []).map((event, index) => (
                                                <Draggable key={event.id} draggableId={event.id} index={index}>
                                                    {(p, s) => <TimetableCard event={event} provided={p} snapshot={s} />}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>)}
                                    </Droppable>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </DragDropContext>
        </div>
    );
}
