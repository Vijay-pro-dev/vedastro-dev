FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn[standard]

COPY . /app

CMD ["uvicorn", "services.finance.main:app", "--host", "0.0.0.0", "--port", "8005"]
