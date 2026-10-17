FROM python:3.11-slim

WORKDIR /app
RUN useradd --create-home --uid 10001 jobs

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY config ./config

ENV PYTHONPATH=/app/src
USER jobs

ENTRYPOINT ["python", "-m", "betriebsrichtung_jobs"]
CMD ["--help"]
