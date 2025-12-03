"""
Gunicorn configuration file for production deployment.

This config is optimized for standard HTTP/REST API (no WebSockets needed).
Compatible with: Render, Heroku, AWS, GCP, and other cloud platforms.
"""

import multiprocessing
import os

# Server socket - bind to PORT env variable (Render, Heroku, etc.)
port = os.environ.get("PORT", "5001")
bind = f"0.0.0.0:{port}"
backlog = 2048

# Worker processes
# Use (2 * CPU cores) + 1 as recommended for sync workers
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"  # Standard sync workers (no WebSockets needed)
worker_connections = 1000
max_requests = 1000  # Restart workers after 1000 requests (prevents memory leaks)
max_requests_jitter = 50  # Add randomness to prevent all workers restarting simultaneously
timeout = 120  # 2 minutes timeout for long operations
keepalive = 5  # Keep connections alive for 5 seconds

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "savings_backend"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Preload app for better memory efficiency
preload_app = True

# SSL (uncomment and configure for HTTPS if needed)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"


def when_ready(server):
    """Called just after the server is started."""
    server.log.info(f"Server ready on {bind} - spawning {workers} workers")


def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("Starting Savings Backend server with sync workers")


def worker_int(worker):
    """Called when a worker receives the INT or QUIT signal."""
    worker.log.info("Worker received INT or QUIT signal")


def worker_abort(worker):
    """Called when a worker receives the SIGABRT signal."""
    worker.log.info("Worker received SIGABRT signal")


def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"Worker spawned (pid: {worker.pid})")


def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass


def pre_exec(server):
    """Called just before a new master process is forked."""
    server.log.info("Forked child, re-executing.")


def post_worker_init(worker):
    """Called just after a worker has initialized the application."""
    worker.log.info(f"Worker initialized successfully (pid: {worker.pid})")

