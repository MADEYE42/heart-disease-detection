# Gunicorn configuration file
import multiprocessing

# Server socket configuration
bind = "0.0.0.0:10000"

# Worker processes
workers = 2  # Reduced number of workers to conserve memory
worker_class = 'gthread'  # Thread-based workers for better memory sharing
threads = 2  # Number of threads per worker

# Timeout configuration
timeout = 300  # Increase timeout to 5 minutes for long-running tasks
graceful_timeout = 30  # Give workers 30 seconds to finish processing

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Logging
errorlog = '-'  # Log to stderr
loglevel = 'info'
accesslog = '-'  # Log to stdout
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = None

# Server hooks
def on_starting(server):
    server.log.info("Starting Gunicorn server with memory-optimized configuration")

def post_fork(server, worker):
    server.log.info(f"Worker spawned (pid: {worker.pid})")

# Memory management
max_requests = 20  # Restart workers after handling 20 requests to prevent memory leaks
max_requests_jitter = 5  # Add jitter to prevent all workers restarting at once
