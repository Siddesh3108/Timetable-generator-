# /backend/Dockerfile
FROM python:3.9-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV FLASK_APP="app:create_app()"

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose the port Gunicorn will run on
EXPOSE 5000

# The command to run the application using Gunicorn
CMD ["gunicorn", "app:create_app()", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "300"]