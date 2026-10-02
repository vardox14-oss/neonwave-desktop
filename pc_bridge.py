import sys, os, time, threading, select, socket, subprocess, tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

LOCAL_PORT = 5055
REMOTE_PORT = 5055
VPS_HOST = '51.77.159.172'
VPS_USER = 'debian'
VPS_PASS = 'tzgzewxhAAK4mqT806XH'

class RelayHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"ok","relay":"residential-pc"}')
            return

        if parsed.path == '/download':
            qs = parse_qs(parsed.query)
            video_id = qs.get('videoId', [None])[0]
            if not video_id:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'Missing videoId')
                return

            print(f"[PC Bridge] Received download request for: {video_id}")
            temp_path = os.path.join(tempfile.gettempdir(), f"bridge_{video_id}_{int(time.time())}.m4a")
            try:
                cmd = [
                    sys.executable, '-m', 'yt_dlp',
                    '--no-playlist', '--no-warnings', '--no-progress',
                    '-f', '140/bestaudio[ext=m4a]/bestaudio',
                    '-o', temp_path,
                    f'https://www.youtube.com/watch?v={video_id}'
                ]
                proc = subprocess.run(cmd, capture_output=True, timeout=40)
                if proc.returncode != 0 or not os.path.exists(temp_path):
                    err_msg = proc.stderr.decode('utf-8', errors='replace')
                    print(f"[PC Bridge] Download failed for {video_id}: {err_msg[:200]}")
                    self.send_response(502)
                    self.end_headers()
                    self.wfile.write(b'Download failed: ' + err_msg.encode('utf-8'))
                    return

                size = os.path.getsize(temp_path)
                with open(temp_path, 'rb') as f:
                    data = f.read()

                self.send_response(200)
                self.send_header('Content-Type', 'audio/mp4')
                self.send_header('Content-Length', str(size))
                self.end_headers()
                self.wfile.write(data)
                print(f"[PC Bridge] Successfully downloaded & sent {video_id} ({size / 1024 / 1024:.2f} MB)")
            except Exception as e:
                print(f"[PC Bridge] Exception handling {video_id}: {e}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
            finally:
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except:
                        pass
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        pass

def run_http_server():
    server = HTTPServer(('127.0.0.1', LOCAL_PORT), RelayHandler)
    print(f"[PC Bridge] HTTP server running on 127.0.0.1:{LOCAL_PORT}")
    server.serve_forever()

def tunnel_handler(chan, host, port):
    sock = socket.socket()
    try:
        sock.connect((host, port))
    except Exception as e:
        chan.close()
        return

    while True:
        r, w, x = select.select([sock, chan], [], [])
        if sock in r:
            data = sock.recv(8192)
            if len(data) == 0:
                break
            chan.send(data)
        if chan in r:
            data = chan.recv(8192)
            if len(data) == 0:
                break
            sock.send(data)
    chan.close()
    sock.close()

def run_ssh_tunnel():
    while True:
        try:
            print(f"[PC Bridge] Connecting SSH to {VPS_HOST}...")
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=10)
            transport = client.get_transport()
            transport.request_port_forward('', REMOTE_PORT)
            print(f"[PC Bridge] Reverse tunnel active: VPS port {REMOTE_PORT} -> Local {LOCAL_PORT}")

            while transport.is_active():
                chan = transport.accept(1000)
                if chan is None:
                    continue
                thr = threading.Thread(target=tunnel_handler, args=(chan, '127.0.0.1', LOCAL_PORT))
                thr.daemon = True
                thr.start()

        except Exception as e:
            print(f"[PC Bridge] SSH tunnel error: {e}. Reconnecting in 5s...")
            time.sleep(5)

if __name__ == '__main__':
    t_http = threading.Thread(target=run_http_server, daemon=True)
    t_http.start()
    run_ssh_tunnel()
