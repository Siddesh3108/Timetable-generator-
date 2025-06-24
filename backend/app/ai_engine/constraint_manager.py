import numpy as np
from collections import defaultdict

class ConstraintManager:
    def __init__(self, teachers, rooms, subjects):
        self.teachers = {t.id: t for t in teachers}
        self.rooms = {r.id: r for r in rooms}
        self.subjects = {s.id: s for s in subjects}
        self.timeslots = list(range(9, 18))
        self.days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    def get_feature_matrix(self):
        num_features = len(self.teachers) + len(self.rooms) + len(self.subjects)
        return np.random.rand(len(self.subjects) * 5, num_features) if self.subjects else np.array([[]])

    def decode_timetable(self, nn_output):
        timetable_grid = {day: {str(time): [] for time in self.timeslots} for day in self.days}
        raw_events = []
        event_id_counter = 0

        for subject in self.subjects.values():
            placed = False
            for _ in range(50): # Increased attempts for better placement
                if placed: break
                day = np.random.choice(self.days)
                time = np.random.choice(self.timeslots)
                teacher = np.random.choice(list(self.teachers.values()))
                room = np.random.choice(list(self.rooms.values()))

                # --- THIS BLOCK IS NOW CORRECTLY INDENTED ---
                event = {
                    'id': str(event_id_counter), 'subject': subject,
                    'teacher': teacher, 'room': room,
                    'day': day, 'time': str(time)
                }

                if self.check_event_conflicts(event, timetable_grid) == 0:
                    timetable_grid[day][str(time)].append(event)
                    raw_events.append(event)
                    event_id_counter += 1
                    placed = True
                    break
        return timetable_grid, raw_events

    def check_event_conflicts(self, event_to_add, timetable_grid):
        conflicts = 0
        day, time = event_to_add['day'], event_to_add['time']
        
        for existing_event in timetable_grid[day][str(time)]:
            if existing_event['teacher'].id == event_to_add['teacher'].id: conflicts += 1
            if existing_event['room'].id == event_to_add['room'].id: conflicts += 1

        if event_to_add['subject'].requires_lab and event_to_add['room'].room_type != 'Lab':
            conflicts += 1
            
        teacher = event_to_add['teacher']
        if teacher.is_visiting and teacher.availability:
            avail = teacher.availability
            avail_days = avail.get('days', [])
            time_from = int(avail.get('from', '23:00').split(':')[0])
            time_to = int(avail.get('to', '00:00').split(':')[0])
            if not (day.lower() in avail_days and time_from <= int(time) < time_to):
                conflicts += 1
        return conflicts

    def evaluate_timetable(self, raw_events):
        total_conflicts = 0
        for i, event1 in enumerate(raw_events):
            for j, event2 in enumerate(raw_events):
                if i >= j: continue
                if event1['day'] == event2['day'] and event1['time'] == event2['time']:
                    if event1['teacher'].id == event2['teacher'].id: total_conflicts += 1
                    if event1['room'].id == event2['room'].id: total_conflicts += 1
        satisfaction = max(0, 100 - (total_conflicts * 20))
        return {'conflicts': total_conflicts, 'satisfaction': satisfaction}

    def get_constraint_types(self):
        return ['teacher_conflict', 'room_conflict', 'lab_mismatch', 'visiting_availability']
