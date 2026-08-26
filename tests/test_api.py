import subprocess, time, os, signal, json, urllib.request

PORT = "3457"
proc = None

def setup_module():
    global proc
    env = {**os.environ, "PORT": PORT}
    proc = subprocess.Popen(["python", "api.py"], env=env, cwd=".")
    time.sleep(3)

def teardown_module():
    if proc: proc.terminate()

def test_health():
    with urllib.request.urlopen(f"http://localhost:{PORT}/api/health") as r:
        data = json.loads(r.read())
        assert data["status"] == "ok"

def test_products():
    with urllib.request.urlopen(f"http://localhost:{PORT}/api/products") as r:
        data = json.loads(r.read())
        assert isinstance(data, list) and len(data) >= 6

def test_order_validation():
    import urllib.error
    data = json.dumps({"items": [], "address": {}, "paymentMethod": "cod"}).encode()
    req = urllib.request.Request(f"http://localhost:{PORT}/api/orders", data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        urllib.request.urlopen(req)
        assert False, "should 400"
    except urllib.error.HTTPError as e:
        assert e.code == 400
