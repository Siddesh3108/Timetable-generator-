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

```
optimized-timetable-system/
├── backend/          # Flask API and AI engine
├── frontend/         # React frontend
├── nginx/            # Reverse proxy config
├── docker-compose.yml # Full stack deployment
└── README.md
```

## Installation

1. **Prerequisites**:
   - Docker 20.10+
   - Docker Compose 2.0+

2. **Setup**:
   ```bash
   git clone https://github.com/your-repo/optimized-timetable-system.git
   cd optimized-timetable-system
   docker-compose up --build
   ```

3. **Access**:
   - Frontend: http://localhost
   - API Docs: http://localhost/api/docs

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | POST | Generate timetable with constraints |
| `/api/task/{id}` | GET | Check task status |
| `/api/constraints` | GET | List all constraints |

## Configuration

Environment variables for backend:

```env
DATABASE_URL=postgresql://user:password@db/timetable_db
REDIS_URL=redis://redis:6379/0
RATE_LIMIT=5/minute
```

## Testing

Run backend tests:
```bash
docker-compose exec backend pytest
```

Run frontend tests:
```bash
docker-compose exec frontend npm test
```

## Deployment

For production deployment:
1. Set proper secrets in `.env.production`
2. Configure HTTPS in `nginx/nginx.conf`
3. Scale services:
   ```bash
   docker-compose up -d --scale celery=3 --scale backend=3
   ```

## License

MIT License

## Contact

For support, email: support@timetable-system.com