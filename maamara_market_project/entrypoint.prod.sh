#!/usr/bin/env bash

# Collect static files into STATIC_ROOT (django settings file)
python manage.py collectstatic --noinput
# Update databases
#sudo python manage.py makemigrations --noinput
python manage.py migrate --noinput
# Start gunicorn which will handle the interface between the django application
# and the web server (nginx)
#python -m gunicorn --bind 0.0.0.0:8000 --workers 12 project01.wsgi:application
python -m daphne \
   --bind 0.0.0.0 \
   --port 8000 \
   project01.asgi:application

#usage: __main__.py [-h] [-p PORT] [-b HOST]
#                   [--websocket_timeout WEBSOCKET_TIMEOUT]
#                   [--websocket_connect_timeout WEBSOCKET_CONNECT_TIMEOUT]
#                   [-u UNIX_SOCKET] [--fd FILE_DESCRIPTOR] [-e SOCKET_STRINGS]
#                   [-v VERBOSITY] [-t HTTP_TIMEOUT] [--access-log ACCESS_LOG]
#                   [--log-fmt LOG_FMT] [--ping-interval PING_INTERVAL]
#                   [--ping-timeout PING_TIMEOUT]
#                   [--application-close-timeout APPLICATION_CLOSE_TIMEOUT]
#                   [--root-path ROOT_PATH] [--proxy-headers]
#                   [--proxy-headers-host PROXY_HEADERS_HOST]
#                   [--proxy-headers-port PROXY_HEADERS_PORT] [-s SERVER_NAME]
#                   [--no-server-name]
#                   application
#
#Django HTTP/WebSocket server
#
#positional arguments:
#  application           The application to dispatch to as
#                        path.to.module:instance.path
#
#options:
#  -h, --help            show this help message and exit
#  -p PORT, --port PORT  Port number to listen on
#  -b HOST, --bind HOST  The host/address to bind to
#  --websocket_timeout WEBSOCKET_TIMEOUT
#                        Maximum time to allow a websocket to be connected. -1
#                        for infinite.
#  --websocket_connect_timeout WEBSOCKET_CONNECT_TIMEOUT
#                        Maximum time to allow a connection to handshake. -1
#                        for infinite
#  -u UNIX_SOCKET, --unix-socket UNIX_SOCKET
#                        Bind to a UNIX socket rather than a TCP host/port
#  --fd FILE_DESCRIPTOR  Bind to a file descriptor rather than a TCP host/port
#                        or named unix socket
#  -e SOCKET_STRINGS, --endpoint SOCKET_STRINGS
#                        Use raw server strings passed directly to twisted
#  -v VERBOSITY, --verbosity VERBOSITY
#                        How verbose to make the output
#  -t HTTP_TIMEOUT, --http-timeout HTTP_TIMEOUT
#                        How long to wait for worker before timing out HTTP
#                        connections
#  --access-log ACCESS_LOG
#                        Where to write the access log (- for stdout, the
#                        default for verbosity=1)
#  --log-fmt LOG_FMT     Log format to use
#  --ping-interval PING_INTERVAL
#                        The number of seconds a WebSocket must be idle before
#                        a keepalive ping is sent
#  --ping-timeout PING_TIMEOUT
#                        The number of seconds before a WebSocket is closed if
#                        no response to a keepalive ping
#  --application-close-timeout APPLICATION_CLOSE_TIMEOUT
#                        The number of seconds an ASGI application has to exit
#                        after client disconnect before it is killed
#  --root-path ROOT_PATH
#                        The setting for the ASGI root_path variable
#  --proxy-headers       Enable parsing and using of X-Forwarded-For and
#                        X-Forwarded-Port headers and using that as the client
#                        address
#  --proxy-headers-host PROXY_HEADERS_HOST
#                        Specify which header will be used for getting the host
#                        part. Can be omitted, requires --proxy-headers to be
#                        specified when passed. "X-Real-IP" (when passed by
#                        your webserver) is a good candidate for this.
#  --proxy-headers-port PROXY_HEADERS_PORT
#                        Specify which header will be used for getting the port
#                        part. Can be omitted, requires --proxy-headers to be
#                        specified when passed.
#  -s SERVER_NAME, --server-name SERVER_NAME
#                        specify which value should be passed to response
#                        header Server attribute
#  --no-server-name
