"""
Gunicorn configuration file for production deployment.

This config is optimized for standard HTTP/REST API (no WebSockets needed).
Compatible with: Render, Heroku, AWS, GCP, and other cloud platforms.
"""

import multiprocessing
import os

# Server socket - bind to PORT env variable (Render, Heroku, etc.)
port = os.environ.get("PORT", "5000")
bind = f"0.0.0.0:{port}"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 120
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "savings_flask"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

preload_app = True

if os.environ.get('RENDER') == 'true':
    workers = 2


def when_ready(server):
    """Called just after the server is started."""
    server.log.info(f"Server ready on {bind} - spawning {workers} workers")


def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("Starting Savings Flask server with sync workers")


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
    worker.log.info("Database keep-alive scheduler is active (pinging every 4 minutes)")
