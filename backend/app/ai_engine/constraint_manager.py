import collections
from ortools.sat.python import cp_model

class TimetableSolver:
    """Solves the timetabling problem using Google's CP-SAT solver."""

    def __init__(self, courses, rooms, teachers, divisions, settings):
        self.courses = courses
        self.rooms = rooms
        self.teachers = teachers
        self.divisions = divisions
        self.settings = settings
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()

        self.days = self.settings.get('working_days', list(range(6)))
        self.time_slots_data = self.settings.get('time_slots', [])
        self.slots = list(range(len(self.time_slots_data)))

        self.lecture_vars = {}
        self.room_assignments = {}
        self.objective_terms = []  # To hold penalty terms for soft constraints

    def solve(self):
        """Main method to set up constraints, solve, and return the timetable."""
        self._create_variables()
        self._add_constraints() # Renamed for clarity
        self.solver.parameters.max_time_in_seconds = 60.0 # Add a timeout
        status = self.solver.Solve(self.model)

        metrics = {
            "status": self.solver.StatusName(status),
            "wall_time_seconds": self.solver.WallTime(),
            "objective_value": self.solver.ObjectiveValue(),
            "conflicts": self.solver.NumConflicts()
        }

        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            return self._decode_solution(), metrics
        
        return None, metrics

    def _create_variables(self):
        """Creates the primary variables for the solver model."""
        self.course_instances = []
        for c in self.courses:
            theory_hours = c.subject.theory_lectures_per_week if c.subject else 0
            lab_sessions = c.subject.lab_sessions_per_week if c.subject else 0

            for i in range(theory_hours):
                self.course_instances.append({
                    'id': f"t_{c.id}_{i}", 'course': c, 'is_lab': False, 'duration': 1
                })
                
            for i in range(lab_sessions):
                self.course_instances.append({
                    'id': f"l_{c.id}_{i}", 'course': c, 'is_lab': True, 'duration': 1
                })

        for inst in self.course_instances:
            for d in self.days:
                for s in self.slots:
                    if s + inst['duration'] <= len(self.slots):
                        self.lecture_vars[(inst['id'], d, s)] = self.model.NewBoolVar(f"lecture_{inst['id']}_{d}_{s}")
                    else:
                        self.lecture_vars[(inst['id'], d, s)] = self.model.NewConstant(0)

        for inst in self.course_instances:
            for d in self.days:
                for s in self.slots:
                    for r in self.rooms:
                        self.room_assignments[(inst['id'], d, s, r.id)] = self.model.NewBoolVar(f"room_{inst['id']}_{d}_{s}_{r.id}")

    def _add_constraints(self): # Renamed from _add_hard_constraints
        """Adds all hard constraints and defines the objective for soft constraints."""
        
        # C1: Each lecture must be scheduled exactly once. (Hard)
        for inst in self.course_instances:
            self.model.AddExactlyOne(self.lecture_vars[(inst['id'], d, s)] for d in self.days for s in self.slots)

        for inst in self.course_instances:
            # C2: Room type must match lecture type. (Hard)
            for r in self.rooms:
                is_lab_room = r.room_type == 'Laboratory'
                if inst['is_lab'] != is_lab_room:
                    for d in self.days:
                        for s in self.slots:
                            self.model.Add(self.room_assignments[(inst['id'], d, s, r.id)] == 0)

            # C3: Each lecture must be assigned to exactly one room. (Hard)
            for d in self.days:
                for s in self.slots:
                    self.model.Add(sum(self.room_assignments[(inst['id'], d, s, r.id)] for r in self.rooms) == self.lecture_vars[(inst['id'], d, s)])
            
            # C4: Visiting Faculty Availability. (Hard)
            teacher = inst['course'].teacher
            if teacher.is_visiting and teacher.availability:
                day_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6}
                allowed_slots = set()
                for day_name, times in teacher.availability.items():
                    day_index = day_map.get(day_name)
                    if day_index is None or day_index not in self.days: continue
                    try:
                        vf_start_hour = int(times['start'].split(':')[0])
                        vf_end_hour = int(times['end'].split(':')[0])
                        for slot_index, slot_data in enumerate(self.time_slots_data):
                            slot_start_hour = int(slot_data['label'].split('-')[0].split(':')[0])
                            if vf_start_hour <= slot_start_hour < vf_end_hour:
                                allowed_slots.add((day_index, slot_index))
                    except (ValueError, IndexError):
                        continue
                for d in self.days:
                    for s in self.slots:
                        if not all((d, s + i) in allowed_slots for i in range(inst['duration'])):
                             self.model.Add(self.lecture_vars[(inst['id'], d, s)] == 0)

        # C5: No lectures during a break. (Hard)
        for slot_index, slot_data in enumerate(self.time_slots_data):
            if slot_data.get('is_break'):
                for inst in self.course_instances:
                    for day in self.days:
                        self.model.Add(self.lecture_vars[(inst['id'], day, slot_index)] == 0)

        # C6-C8: Resource Conflict Constraints. (Hard)
        for d in self.days:
            for s in self.slots:
                # Teacher conflict
                for t in self.teachers:
                    self.model.Add(sum(self._get_active_lecture_var(inst, d, s) for inst in self.course_instances if inst['course'].teacher_id == t.id) <= 1)
                # Division conflict
                for div in self.divisions:
                    division_batches = {b.id for b in div.batches}
                    self.model.Add(sum(self._get_active_lecture_var(inst, d, s) for inst in self.course_instances if inst['course'].batch_id in division_batches) <= 1)
                # Room conflict
                for r in self.rooms:
                    self.model.Add(sum(self._get_active_room_var(inst, d, s, r.id) for inst in self.course_instances) <= 1)

        # --- START OF MODIFICATION: C11 Logic is updated ---
        # C11: Labs for the same subject should be in 2-hour consecutive blocks where possible. (Hard)
        labs_by_course = collections.defaultdict(list)
        for inst in self.course_instances:
            if inst['is_lab']:
                labs_by_course[inst['course'].id].append(inst)

        for course_id, instances in labs_by_course.items():
            # Sort instances to ensure consistent pairing (e.g., l_c1_0 with l_c1_1)
            instances.sort(key=lambda x: x['id'])
            
            # Iterate through the labs, pairing them up to form 2-hour blocks
            # This loop takes steps of 2, so it pairs instances[0] with instances[1], then instances[2] with instances[3], etc.
            # If there's an odd number of labs, the last one is ignored by this loop and can be scheduled freely.
            for i in range(0, len(instances) // 2 * 2, 2):
                first_lab = instances[i]
                second_lab = instances[i + 1]
                
                # Enforce that the second lab must start exactly one slot after the first on the same day
                for d in self.days:
                    for s in range(1, len(self.slots)):
                        # If the first lab is at slot s-1, the second must be at slot s
                        var1 = self.lecture_vars.get((first_lab['id'], d, s - 1), 0)
                        var2 = self.lecture_vars.get((second_lab['id'], d, s), 0)
                        self.model.Add(var1 == var2)
                    
                    # Also, the second lab of a pair cannot be scheduled in the first slot of any day
                    self.model.Add(self.lecture_vars.get((second_lab['id'], d, 0), 0) == 0)
        # --- END OF MODIFICATION ---

        # C9: Max lectures per day for a teacher. (Soft)
        for t in self.teachers:
            if t.max_lectures_per_day:
                for d in self.days:
                    daily_hours = sum(self.lecture_vars[(inst['id'], d, s)] * inst['duration'] for inst in self.course_instances if inst['course'].teacher_id == t.id for s in self.slots)
                    max_lectures = t.max_lectures_per_day
                    
                    excess_hours = self.model.NewIntVar(-len(self.slots), len(self.slots), f'excess_hours_{t.id}_{d}')
                    self.model.Add(excess_hours == daily_hours - max_lectures)

                    penalty = self.model.NewIntVar(0, len(self.slots), f'penalty_teacher_hours_{t.id}_{d}')
                    self.model.AddMaxEquality(penalty, [excess_hours, 0])
                    self.objective_terms.append(penalty)
        
        # C10: A specific lab for a division should not happen more than once per day. (Soft)
        for course_id in labs_by_course:
            course_lab_instances = [inst['id'] for inst in labs_by_course[course_id]]
            for d in self.days:
                daily_lab_count = sum(self.lecture_vars[(inst_id, d, s)] for inst_id in course_lab_instances for s in self.slots)
                
                excess_labs = self.model.NewIntVar(-len(course_lab_instances), len(course_lab_instances), f'excess_labs_{course_id}_{d}')
                self.model.Add(excess_labs == daily_lab_count - 1)

                penalty = self.model.NewIntVar(0, len(course_lab_instances), f'penalty_lab_freq_{course_id}_{d}')
                self.model.AddMaxEquality(penalty, [excess_labs, 0])
                self.objective_terms.append(penalty)

        # Define the objective function to minimize the sum of all penalties
        self.model.Minimize(sum(self.objective_terms))

    def _get_active_lecture_var(self, instance, day, slot):
        """Returns a sum of variables indicating if a lecture is active at a given time."""
        return sum(self.lecture_vars.get((instance['id'], day, s_start), 0) for s_start in range(max(0, slot - instance['duration'] + 1), slot + 1))

    def _get_active_room_var(self, instance, day, slot, room_id):
        """Returns a sum of variables indicating if a lecture is in a room at a given time."""
        return sum(self.room_assignments.get((instance['id'], day, s_start, room_id), 0) for s_start in range(max(0, slot - instance['duration'] + 1), slot + 1))

    def _decode_solution(self):
        """Converts the solver's output into a human-readable timetable grid."""
        timetable_grid = collections.defaultdict(list)
        room_map = {r.id: r for r in self.rooms}
        for inst in self.course_instances:
            for d in self.days:
                for s in self.slots:
                    if self.solver.Value(self.lecture_vars.get((inst['id'], d, s), 0)) == 1:
                        assigned_room_name = "N/A"
                        for r_id, room in room_map.items():
                            if self.solver.Value(self.room_assignments.get((inst['id'], d, s, r_id), 0)) == 1:
                                assigned_room_name = room.name
                                break
                        for i in range(inst['duration']):
                            event = {
                                "day": d, "slot": s + i,
                                "division": inst['course'].batch.division.name,
                                "batch": inst['course'].batch.name,
                                "subject": inst['course'].subject.name + (' (Lab)' if inst['is_lab'] else ''),
                                "teacher": inst['course'].teacher.name,
                                "room": assigned_room_name
                            }
                            timetable_grid[inst['course'].batch.division.id].append(event)
        return timetable_grid