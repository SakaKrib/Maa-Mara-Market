#!/usr/bin/env python3
"""
Django's command-line utility for administrative tasks.
"""
import os  # For interacting with the operating system
import subprocess  # For starting subprocesses
import sys  # For accessing command-line arguments

def start_node_server():
    """Start the Node.js backend server."""
    node_server_path = os.path.join('client/server.js')  # Path to your Node.js server file

    try:
        print("Starting Node.js server...")
        process = subprocess.Popen(['node', node_server_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"Node.js server started with PID: {process.pid}")
        print(f"Node.js server started with PID: {process}")
    except Exception as e:
        print(f"Error starting Node.js server: {e}")

def start_vite_dev_server():
    """Start the Vite.js development server."""
    client_path = os.path.join('client')  # Path to your Vite.js project folder

    try:
        print("Starting Vite.js dev server...")
        process = subprocess.Popen(['npm', 'run', 'dev'], cwd=client_path, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"Vite.js dev server started with PID: {process.pid}")
    except Exception as e:
        print(f"Error starting Vite.js dev server: {e}")

def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project01.settings')

    # Check if the command is 'runserver' and start the necessary servers
    if 'runserver' in sys.argv:
        start_node_server()  # Start Node.js server
        start_vite_dev_server()  # Start Vite.js dev server

    try:
        from django.core.management import execute_from_command_line  # Django management utility
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
