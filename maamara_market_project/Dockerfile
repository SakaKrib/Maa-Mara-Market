# Install pip packages
FROM python:3.14.5-slim AS pip_deps

RUN mkdir /app

WORKDIR /app

# So python doesn't unnecessarily cache files
ENV PYTHONDONTWRITEBYTECODE=1
# So python doesn't hold logs in a buffer but allows us to view them
ENV PYTHONBUFFERED=1

# Install dependencies
RUN pip install --upgrade pip
COPY ./django_pip_req_server.txt /app/
RUN pip install --no-cache-dir -r django_pip_req_server.txt
RUN pip install channels[daphne]==4.3.2 channels_redis==4.3.0


# Build the frontend
FROM node:current-alpine3.23 as frontend_builder
RUN mkdir /frontend
WORKDIR /frontend
COPY . .
WORKDIR Admin-Dashbord/
# Install node dependencies listed in package.json
RUN npm ci
# Build the frontend per instructions in package.json
RUN npm run build


# Build the app
FROM python:3.14.5-slim

# Make a non-root system (-r) user with a home directory (-m), and give it ownership of all app files
RUN useradd -m -r appuser && \
    mkdir /app && \
    chown -R appuser /app

# Copy libraries from dependency stage
COPY --from=pip_deps /usr/local/lib/python3.14/site-packages/ /usr/local/lib/python3.14/site-packages/
COPY --from=pip_deps /usr/local/bin/ /usr/local/bin/

WORKDIR /app

# Copy all app files (current directory) to /app (working directory in container)
COPY --chown=appuser:appuser . .
# Copy the built frontend
COPY --from=frontend_builder --chown=appuser:appuser /frontend/Admin-Dashbord/dist Admin-Dashbord/dist
COPY --from=frontend_builder /frontend/Admin-Dashbord/dist/index.html templates/index.html

# So python doesn't unnecessarily cache files
ENV PYTHONDONTWRITEBYTECODE=1
# So python doesn't hold logs in a buffer but allows us to view them
ENV PYTHONBUFFERED=1

# Switch to non-root user
USER appuser

# Expose app port
EXPOSE 8000

# Start app using ASGI/WSGI server
RUN chmod +x /app/entrypoint.prod.sh
CMD ["/app/entrypoint.prod.sh"]
