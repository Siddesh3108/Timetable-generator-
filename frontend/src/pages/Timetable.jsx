import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
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
const FilterDropdown = ({ name, label, value, onChange, options }) => (
    <div><label className="text-sm font-medium text-gray-700">{label}</label><select name={name} value={value} onChange={onChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"><option value="">All</option>{options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}</select></div>
);
export default function TimetablePage() {
    const location = useLocation(); const navigate = useNavigate();
    const [gridSchedule, setGridSchedule] = useState({});
    const [flatSchedule, setFlatSchedule] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ teachers: [], rooms: [], classes: [] });
    const [activeFilters, setActiveFilters] = useState({ teacher: '', room: '', class: '' });
    useEffect(() => {
        if (location.state?.timetableResult?.timetable) {
            const timetable = location.state.timetableResult.timetable;
            const unique = { teachers: new Map(), rooms: new Map(), classes: new Map() };
            const flattened = [];
            Object.values(timetable).forEach(day => {
                Object.values(day).forEach(slots => {
                    slots.forEach(event => {
                        flattened.push(event);
                        unique.teachers.set(event.teacher.id, event.teacher);
                        unique.rooms.set(event.room.id, event.room);
                    });
                });
            });
            setFlatSchedule(flattened);
            setFilterOptions({ teachers: Array.from(unique.teachers.values()), rooms: Array.from(unique.rooms.values()), classes: [] });
        }
    }, [location.state]);
    useEffect(() => {
        const newGrid = {};
        flatSchedule.filter(e => (activeFilters.teacher ? e.teacher.id == activeFilters.teacher : true) && (activeFilters.room ? e.room.id == activeFilters.room : true)).forEach(event => {
            if (!newGrid[event.day]) newGrid[event.day] = {};
            if (!newGrid[event.day][event.time]) newGrid[event.day][event.time] = [];
            newGrid[event.day][event.time].push(event);
        });
        setGridSchedule(newGrid);
    }, [flatSchedule, activeFilters]);
    if (flatSchedule.length === 0) {
        return ( <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-bold text-gray-900">View Timetable</h1><p className="mt-4 text-lg text-gray-600">Your generated timetable will appear here after a successful run.</p><button onClick={() => navigate('/generate')} className="mt-8 px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Go to Generate Page</button></div>);
    }
    const timeSlots = ['9', '10', '11', '12', '13', '14', '15', '16', '17'];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return (
        <div className="pb-16"><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900">View Timetable</h1><div className="flex space-x-2"><button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Print</button><button className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300">Export as PDF</button></div></div>
            <div className="bg-white p-4 rounded-lg shadow-md mb-8 grid md:grid-cols-3 gap-4"><FilterDropdown name="teacher" label="Filter by Teacher" value={activeFilters.teacher} onChange={e => setActiveFilters({...activeFilters, teacher: e.target.value})} options={filterOptions.teachers} /><FilterDropdown name="room" label="Filter by Room" value={activeFilters.room} onChange={e => setActiveFilters({...activeFilters, room: e.target.value})} options={filterOptions.rooms} /></div>
            <DragDropContext onDragEnd={()=>{}}><div className="bg-white rounded-lg shadow-md overflow-x-auto"><div className="grid grid-cols-[120px_repeat(6,1fr)] min-w-[900px]"><div className="sticky top-0 bg-white z-20"></div>{days.map(day => <DayHeader key={day} day={day} />)}{timeSlots.map(timeKey => (<React.Fragment key={timeKey}><TimeSlot time={`${timeKey}:00 - ${parseInt(timeKey) + 1}:00`} />{days.map(day => (<Droppable key={`${day}-${timeKey}`} droppableId={`${day}-${timeKey}`}>{(provided) => (<div ref={provided.innerRef} {...provided.droppableProps} className="h-32 border-t border-r border-gray-200">{(gridSchedule[day]?.[timeKey] || []).map((event, index) => (<Draggable key={event.id} draggableId={event.id} index={index}>{(p, s) => <TimetableCard event={event} provided={p} snapshot={s} />}</Draggable>))}{provided.placeholder}</div>)}</Droppable>))}</React.Fragment>))}</div></div></DragDropContext>
        </div>
    );
}
