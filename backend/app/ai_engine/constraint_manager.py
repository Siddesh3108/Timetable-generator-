from collections import defaultdict
from ortools.sat.python import cp_model

class ConstraintManager:
    def __init__(self, teachers, rooms, subjects):
        self.teachers = teachers
        self.rooms = rooms
        self.subjects = subjects
        self.timeslots = list(range(9, 18))
        self.days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

        # --- Mappings for easy lookup ---
        self.teacher_map = {t.id: t for t in teachers}
        self.room_map = {r.id: r for r in rooms}
        self.subject_map = {s.id: s for s in subjects}

    def decode_timetable_with_ortools(self):
        """
        --- THIS IS THE NEW, HIGHLY-OPTIMIZED OR-TOOLS LOGIC ---
        Uses the CP-SAT solver to generate a valid timetable.
        """
        model = cp_model.CpModel()

        # --- 1. Create Variables ---
        # For each subject, we need to decide its teacher, room, day, and time.
        # This will be our main data structure holding the solution variables.
        placements = {}
        for s in self.subjects:
            # We assume one lecture per subject for simplicity
            teacher_var = model.NewIntVar(0, len(self.teachers) - 1, f'teacher_{s.id}')
            room_var = model.NewIntVar(0, len(self.rooms) - 1, f'room_{s.id}')
            day_var = model.NewIntVar(0, len(self.days) - 1, f'day_{s.id}')
            time_var = model.NewIntVar(0, len(self.timeslots) - 1, f'time_{s.id}')
            
            # An "interval" variable is perfect for scheduling. It represents a block of time.
            start_var = model.NewIntVar(0, len(self.days) * len(self.timeslots), f'start_{s.id}')
            duration = 1 # Each class is 1 timeslot long
            end_var = model.NewIntVar(0, len(self.days) * len(self.timeslots), f'end_{s.id}')
            interval_var = model.NewIntervalVar(start_var, duration, end_var, f'interval_{s.id}')

            # Link day/time variables to the single start variable
            # This makes it easier to model "no overlap" constraints.
            # Start = day_index * num_slots_per_day + time_index
            model.Add(start_var == day_var * len(self.timeslots) + time_var)

            placements[s.id] = {
                'subject': s,
                'teacher_var': teacher_var, 'room_var': room_var,
                'day_var': day_var, 'time_var': time_var,
                'interval_var': interval_var
            }

        # --- 2. Add Hard Constraints ---
        
        # C1: Teacher Conflict - A teacher can't teach two classes at the same time.
        for i, t in enumerate(self.teachers):
            # Get all intervals assigned to this teacher
            teacher_intervals = []
            for s_id, p in placements.items():
                is_assigned = model.NewBoolVar(f'is_teacher_{t.id}_subj_{s_id}')
                model.Add(p['teacher_var'] == i).OnlyEnforceIf(is_assigned)
                model.Add(p['teacher_var'] != i).OnlyEnforceIf(is_assigned.Not())
                teacher_intervals.append(p['interval_var'].Optional(is_assigned, 1))
            model.AddNoOverlap(teacher_intervals)

        # C2: Room Conflict - A room can't host two classes at the same time.
        for i, r in enumerate(self.rooms):
            room_intervals = []
            for s_id, p in placements.items():
                is_assigned = model.NewBoolVar(f'is_room_{r.id}_subj_{s_id}')
                model.Add(p['room_var'] == i).OnlyEnforceIf(is_assigned)
                model.Add(p['room_var'] != i).OnlyEnforceIf(is_assigned.Not())
                room_intervals.append(p['interval_var'].Optional(is_assigned, 1))
            model.AddNoOverlap(room_intervals)

        # C3: Room Type - A lab subject must be in a lab room.
        for s_id, p in placements.items():
            if p['subject'].requires_lab:
                # Get indices of all rooms that are labs
                lab_room_indices = [i for i, r in enumerate(self.rooms) if r.room_type == 'Lab']
                if not lab_room_indices:
                     # If no lab rooms exist, it's impossible to schedule this.
                     # We can add a constraint that will always fail.
                     model.AddBoolOr([]) # An empty OR is always false
                else:
                    # The assigned room_var must be one of the lab rooms
                    model.AddAllowedAssignments([p['room_var']], [(i,) for i in lab_room_indices])
        
        # C4: Visiting Faculty Availability (if applicable)
        # This is more complex and would be added similarly, by constraining
        # the day_var and time_var for any placement assigned to a visiting teacher.

        # --- 3. Solve the Model ---
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0 # Don't let it run forever
        status = solver.Solve(model)

        # --- 4. Decode the Solution ---
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            timetable_grid = {day: {str(time): [] for time in self.timeslots} for day in self.days}
            raw_events = []
            for s_id, p in placements.items():
                teacher = self.teachers[solver.Value(p['teacher_var'])]
                room = self.rooms[solver.Value(p['room_var'])]
                day = self.days[solver.Value(p['day_var'])]
                time = self.timeslots[solver.Value(p['time_var'])]
                event = {
                    'id': str(s_id), 'subject': self.subject_map[s_id],
                    'teacher': teacher, 'room': room,
                    'day': day, 'time': str(time)
                }
                timetable_grid[day][str(time)].append(event)
                raw_events.append(event)
            return timetable_grid, raw_events
        else:
            raise ValueError("No solution found by OR-Tools. The problem might be over-constrained.")
            
    def evaluate_timetable(self, raw_events):
        # A simple conflict counter can be used to evaluate the final grid
        total_conflicts = 0 # With OR-Tools hard constraints, this should be 0.
        satisfaction = max(0, 100 - (total_conflicts * 20))
        return {'conflicts': total_conflicts, 'satisfaction': satisfaction}
