import subprocess, re, sys, time, os

# Find PID(s) listening on a given TCP port (Windows netstat)
def pids_on_port(port):
    out = subprocess.run(["netstat", "-ano"], capture_output=True, text=True).stdout
    pids = set()
    for line in out.splitlines():
        parts = line.split()
        if len(parts) >= 5 and parts[1].endswith(":" + str(port)) and parts[3] == "LISTENING":
            pids.add(parts[4])
    return pids

port = sys.argv[1]
for pid in pids_on_port(port):
    subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True, text=True)
    print("killed", pid)
time.sleep(1)
print("remaining:", pids_on_port(port))
