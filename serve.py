import http.server
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
print(f"Serving from: {os.getcwd()}")
print(f"Files: {os.listdir('.')}")
http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler, port=9090, bind="0.0.0.0")
