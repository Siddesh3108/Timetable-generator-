# Optimized Academic Timetable Generation System
A hybrid AI-powered system for generating conflict-free academic timetables using neural networks trained by genetic algorithms.
## Features
- **7 Strict Constraints Enforcement**:
  - Teacher, room, and class conflicts
  - Room type matching (lab vs classroom)
  - Back-to-back class limits
  - Maximum weekly hours
  - Visiting faculty availability
- **Hybrid AI Architecture**:
  - Neural networks for pattern recognition
  - Genetic algorithms for optimization
  - Constraint-aware fitness functions
- **Production-Ready Infrastructure**:
  - Docker containers
  - PostgreSQL database
  - Redis message queue
  - Celery task processing
## System Architecture
`optimized-timetable-system/`
## Installation
1. **Prerequisites**: Docker & Docker Compose
2. **Setup**: `docker-compose up --build`
3. **Access**: `http://localhost`
## Testing
`docker-compose exec backend pytest`
