# 🧠 Timetable Generator

A full-stack web application that automatically generates **conflict-free university timetables** using **Constraint Programming (CP-SAT)** — a powerful optimization engine from Google OR-Tools.  
The system provides a fast, accurate, and production-ready solution for automating academic scheduling, eliminating the inefficiencies of manual timetable creation.

---

## 📘 Overview

Timetable generation in educational institutions is a complex **NP-hard** optimization problem involving multiple constraints such as room capacity, teacher availability, and lecture overlaps.  

This project introduces an **AI-powered Timetable Generator** that:
- Automates the scheduling of lectures, labs, and faculty assignments.  
- Uses the **CP-SAT solver** for constraint satisfaction and optimization.  
- Generates feasible, conflict-free timetables within seconds.  
- Allows administrators to manage subjects, teachers, and resources via an intuitive web interface.

---

## 🧩 Problem Statement

To develop a system that can **automatically generate a valid weekly timetable** for a university department such that:

- No teacher, division, or room is double-booked.  
- Labs are scheduled in consecutive slots.  
- Visiting faculty are scheduled only within their available hours.  
- No lectures occur during designated breaks.  
- Teacher workload limits and preferences are respected.

The system should guarantee **zero hard-constraint violations** and minimize soft-constraint penalties.

---

## 🚀 Key Features

- ✅ **AI-Based Constraint Solver (CP-SAT)** – Finds optimal solutions quickly and accurately.  
- 🧩 **Constraint Enforcement** – Models both *hard* and *soft* constraints for practical scheduling.  
- 🖥️ **Web Interface** – Built with React and Flask for intuitive management and generation.  
- ⚡ **Asynchronous Processing** – Uses Celery and Redis to run AI computations in the background.  
- 🐳 **Containerized Deployment** – Runs in isolated Docker containers for easy setup and scalability.  
- 🧾 **Conflict Detection & Diagnostics** – Identifies infeasible scheduling scenarios in seconds.  
- 📊 **Data-Driven Insights** – Offers workload analysis for teachers and departments.

---

## 🧱 System Architecture

```
Frontend (React.js)
        ↓
Nginx (Reverse Proxy)
        ↓
Flask Backend (Python)
        ↓
Redis Queue ↔ Celery Worker (Runs CP-SAT Solver)
        ↓
PostgreSQL Database
```

Each component runs inside a **Docker container**, enabling seamless integration and deployment.

---

## 🧰 Tech Stack

**Frontend:** React.js, TailwindCSS, Axios, React Router  
**Backend:** Flask, Gunicorn  
**AI Engine:** Google OR-Tools (CP-SAT Solver)  
**Database:** PostgreSQL  
**Asynchronous Tasks:** Celery + Redis  
**Deployment:** Docker & Docker Compose  

---

## ⚙️ Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Siddesh3108/Timetable-generator-.git
   cd Timetable-generator-
   ```

2. **Build and Run Using Docker**
   ```bash
   docker compose up --build
   ```

3. **Access the Web App**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

4. **Login / Sign Up**
   Create an account and start generating timetables.

---

## 📸 Screenshots

| Description |
|--------------|
| Interactive dashboard to manage all modules |
| Generate timetable with one click |
| View generated conflict-free timetable instantly |

---

## 📊 Results and Performance

| Scenario | Utilization | CP-SAT Runtime | Conflicts | Result |
|-----------|--------------|----------------|------------|---------|
| Easy | 78% | 0.67s | 0 | Optimal |
| Medium | 100% | 2.36s | 0 | Optimal |
| Impossible | >100% | 1.5s | N/A | Proven Infeasible |

**Key Outcomes:**
- Generated perfect timetables in seconds.  
- Automatically identified unsolvable (over-constrained) schedules.  
- Provided balanced workloads for faculty and fair lecture distribution.

---

## 🏆 Advantages

- **Optimal and Reliable** – Guarantees mathematically valid solutions.  
- **Diagnostic Power** – Detects infeasible scenarios instantly.  
- **Scalable Architecture** – Supports multi-department or institutional expansion.  
- **Modern UI/UX** – Simplifies timetable creation for non-technical users.  
- **Research-Grade Model** – Implements academic rigor with engineering best practices.

---

## 🚧 Limitations & Future Scope

**Current Limitations:**
- Limited number of configurable soft constraints.  
- Requires precise modeling for complex institutions.

**Future Enhancements:**
- Add elective subject scheduling.  
- Allow administrators to define and prioritize soft constraints dynamically.  
- Integrate automated teacher notifications for personalized schedules.

---

## 👨‍💻 Authors

- **Siddesh Lohkare **  
- **Shrutee Salpe **  
- **Parth Gupta **  

Under the guidance of  
**Dr. Shailendra Aote (Asst. Professor, STME, NMIMS Navi Mumbai)**  

---

## 📚 References

- Google OR-Tools Documentation: [https://developers.google.com/optimization](https://developers.google.com/optimization)  

---

## 🧾 License
 
All rights reserved © 2025 Timetable Generator Project Team.
