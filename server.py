
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
import socket
import subprocess
import platform
import re
import time
import requests
import json
import os
import sys
import ipaddress
import threading
import webbrowser

# ============================================================
# MOBILE NETWORK ASSISTANT
# Consolidated Flask backend
# ============================================================

app = Flask(__name__)
CORS(app)

REQUEST_TIMEOUT = 5


# ============================================================
# FILE PATHS AND SYSTEM HELPERS
# ============================================================

def resource_path(filename=""):
    """Locate application files in Python or packaged execution."""
    if getattr(sys, "frozen", False):
        base_path = Path(sys.executable).resolve().parent
        bundle_path = getattr(sys, "_MEIPASS", None)

        if bundle_path:
            bundled = Path(bundle_path) / filename
            if bundled.exists():
                return str(bundled)

        return str(base_path / filename)

    return str(Path(__file__).resolve().parent / filename)



def run_command(command, timeout=10):
    """Run a command without opening a console window on Windows."""
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
            shell=False,
            creationflags=(
                subprocess.CREATE_NO_WINDOW
                if os.name == "nt"
                else 0
            )
        )
        return result.stdout.strip()

    except (OSError, subprocess.SubprocessError, ValueError):
        return ""


def powershell_json(command, timeout=10):
    """Execute PowerShell and safely parse JSON output."""
    output = run_command(
        ["powershell", "-NoProfile", "-Command", command],
        timeout=timeout
    )

    if not output:
        return None

    try:
        return json.loads(output)
    except json.JSONDecodeError:
        return None


def first_item(value):
    """Normalize a PowerShell result to its first item."""
    if isinstance(value, list):
        return value[0] if value else None
    return value


def valid_host(host):
    """Allow hostnames and IP addresses, not command text."""
    if not isinstance(host, str):
        return False

    host = host.strip()

    if not host or len(host) > 253:
        return False

    if any(char.isspace() for char in host):
        return False

    if host.startswith("-"):
        return False

    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        pass

    hostname = host[:-1] if host.endswith(".") else host

    return all(
        len(label) <= 63
        and re.fullmatch(
            r"[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?",
            label
        )
        for label in hostname.split(".")
    )


def resolve_host(host):
    try:
        return socket.gethostbyname(host)
    except (socket.gaierror, socket.timeout, OSError):
        return None


def tcp_test(host, port=443, timeout=REQUEST_TIMEOUT):
    """Test a TCP connection and measure elapsed time."""
    start = time.perf_counter()

    try:
        with socket.create_connection((host, port), timeout=timeout):
            elapsed = (time.perf_counter() - start) * 1000

        return True, round(elapsed, 2)

    except (socket.timeout, socket.gaierror, OSError, ValueError):
        return False, None


# ============================================================
# NETWORK INFORMATION HELPERS
# ============================================================

def get_active_network_config():
    """Find the active Windows interface and its configuration."""
    if platform.system() != "Windows":
        return None

    command = """
    $config = Get-NetIPConfiguration |
        Where-Object {
            $_.NetAdapter.Status -eq 'Up' -and
            $_.IPv4Address -and
            $_.IPv4Address.IPAddress -notlike '169.254.*'
        } |
        Select-Object -First 1

    if ($config) {
        $result = [PSCustomObject]@{
            InterfaceAlias = $config.InterfaceAlias
            InterfaceDescription = $config.NetAdapter.InterfaceDescription
            MacAddress = $config.NetAdapter.MacAddress
            IPv4Address = @($config.IPv4Address | ForEach-Object {
                @{
                    IPAddress = $_.IPAddress
                    PrefixLength = $_.PrefixLength
                }
            })
            Gateway = @($config.IPv4DefaultGateway | ForEach-Object {
                $_.NextHop
            })
            DNS = @($config.DNSServer.ServerAddresses)
            InterfaceIndex = $config.InterfaceIndex
        }

        $result | ConvertTo-Json -Depth 5 -Compress
    }
    """

    return powershell_json(command)


def get_wifi_details():
    """Read Wi-Fi state, SSID, signal and receive rate."""
    details = {
        "connected": False,
        "ssid": "Not connected",
        "signal": None,
        "speed": "Unknown",
        "adapter": "Unknown",
        "profile": "Unknown"
    }

    if platform.system() != "Windows":
        return details

    output = run_command(["netsh", "wlan", "show", "interfaces"])

    state = re.search(
        r"^\s*State\s*:\s*(.+)$",
        output,
        re.IGNORECASE | re.MULTILINE
    )

    ssid = re.search(
        r"^\s*SSID\s*:\s*(.+)$",
        output,
        re.IGNORECASE | re.MULTILINE
    )

    signal = re.search(
        r"^\s*Signal\s*:\s*(\d+)\s*%",
        output,
        re.IGNORECASE | re.MULTILINE
    )

    receive_rate = re.search(
        r"^\s*Receive rate\s*\(Mbps\)\s*:\s*(.+)$",
        output,
        re.IGNORECASE | re.MULTILINE
    )

    details["connected"] = bool(
        state and state.group(1).strip().lower() == "connected"
    )

    if details["connected"] and ssid:
        details["ssid"] = ssid.group(1).strip()
        details["profile"] = details["ssid"]

    if signal:
        details["signal"] = int(signal.group(1))

    if receive_rate:
        details["speed"] = receive_rate.group(1).strip() + " Mbps"

    adapter_command = """
    Get-NetAdapter |
        Where-Object {
            $_.Name -like '*Wi-Fi*' -and $_.Status -eq 'Up'
        } |
        Select-Object -First 1 -ExpandProperty Name
    """

    adapter = run_command([
        "powershell", "-NoProfile", "-Command", adapter_command
    ])

    if adapter:
        details["adapter"] = adapter.splitlines()[0].strip()

    return details


def get_network_details():
    """Collect local IP, MAC, subnet, gateway and DNS information."""
    hostname = socket.gethostname()
    local_ip = None
    mac_address = "Not detected"
    wifi_adapter = "Not detected"
    subnet_mask = "Not detected"
    gateway = "Not detected"
    dns_server = "Not detected"
    interface_alias = "Not detected"

    config = get_active_network_config() if (
        platform.system() == "Windows"
    ) else None

    if config:
        interface_alias = config.get("InterfaceAlias") or "Not detected"
        wifi_adapter = (
            config.get("InterfaceDescription") or interface_alias
        )
        mac_address = config.get("MacAddress") or "Not detected"

        ip_entry = first_item(config.get("IPv4Address"))
        if isinstance(ip_entry, dict):
            local_ip = ip_entry.get("IPAddress")
            prefix = ip_entry.get("PrefixLength")

            try:
                subnet_mask = str(
                    ipaddress.IPv4Network(f"0.0.0.0/{int(prefix)}").netmask
                )
            except (ValueError, TypeError):
                pass

        gateway_entry = first_item(config.get("Gateway"))
        if gateway_entry:
            gateway = gateway_entry

        dns_entry = first_item(config.get("DNS"))
        if dns_entry:
            dns_server = dns_entry

    if not local_ip:
        try:
            with socket.socket(
                socket.AF_INET, socket.SOCK_DGRAM
            ) as sock:
                sock.connect(("8.8.8.8", 80))
                local_ip = sock.getsockname()[0]
        except OSError:
            local_ip = None

    if not local_ip:
        local_ip = "Not detected"

    if platform.system() != "Windows":
        try:
            mac_command = run_command(["ip", "link", "show"])
            mac_match = re.search(
                r"link/ether\s+([0-9a-f:]{17})",
                mac_command,
                re.IGNORECASE
            )
            if mac_match:
                mac_address = mac_match.group(1)

            route_output = run_command(["ip", "route", "show", "default"])
            route_match = re.search(r"\bdefault via (\S+)", route_output)
            if route_match:
                gateway = route_match.group(1)

            dns_output = run_command(["cat", "/etc/resolv.conf"])
            dns_match = re.search(
                r"^\s*nameserver\s+(\S+)",
                dns_output,
                re.MULTILINE
            )
            if dns_match:
                dns_server = dns_match.group(1)

            if local_ip != "Not detected":
                addr_output = run_command(["ip", "-o", "-4", "addr", "show"])
                for line in addr_output.splitlines():
                    if local_ip in line:
                        prefix_match = re.search(
                            r"\binet\s+\S+/(\d+)", line
                        )
                        if prefix_match:
                            subnet_mask = str(
                                ipaddress.IPv4Network(
                                    "0.0.0.0/" + prefix_match.group(1)
                                ).netmask
                            )
                        break

        except (OSError, ValueError):
            pass

    return {
        "hostname": hostname,
        "local_ip": local_ip,
        "mac_address": mac_address,
        "wifi_adapter": wifi_adapter,
        "subnet_mask": subnet_mask,
        "gateway": gateway,
        "dns_server": dns_server,
        "operating_system": platform.system(),
        "os_version": platform.platform(),
        "interface_alias": interface_alias
    }


# ============================================================
# CONNECTIVITY TEST HELPERS
# ============================================================

def test_dns():
    try:
        address = socket.gethostbyname("google.com")
        return True, address
    except (socket.gaierror, socket.timeout, OSError):
        return False, None


def test_internet():
    """Check external HTTPS connectivity using more than one target."""
    for host in ("google.com", "1.1.1.1"):
        connected, latency = tcp_test(host, 443, timeout=3)

        if connected:
            return True, latency

    return False, None


def test_icmp(host):
    """Run one ping test using the operating system's ping utility."""
    if platform.system() == "Windows":
        command = ["ping", "-n", "4", "-w", "1500", host]
    else:
        command = ["ping", "-c", "4", "-W", "2", host]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=10,
            encoding="utf-8",
            errors="replace"
        )
        output = result.stdout + "\n" + result.stderr

        if platform.system() == "Windows":
            match = re.search(
                r"Average\s*=\s*(\d+)\s*ms",
                output,
                re.IGNORECASE
            )
        else:
            match = re.search(
                r"=\s*[\d.]+/([\d.]+)/",
                output
            )

        if match and result.returncode == 0:
            return True, float(match.group(1)), output

        return False, None, output

    except (OSError, subprocess.SubprocessError):
        return False, None, ""


# ============================================================
# FRONTEND ROUTES
# ============================================================

@app.route("/")
def home():
    index_file = Path(resource_path("index.html"))

    if index_file.is_file():
        return send_from_directory(str(index_file.parent), "index.html")

    return jsonify({
        "status": "online",
        "message": "Mobile Network Assistant API is running",
        "endpoints": [
            "/app", "/health", "/check-port", "/dns-lookup",
            "/internet-check", "/network-info", "/ping",
            "/diagnostic", "/wifi-info", "/speed-test",
            "/interfaces", "/health-score"
        ]
    })


@app.route("/app")
def web_app():
    index_file = Path(resource_path("index.html"))

    if not index_file.is_file():
        return jsonify({"error": "index.html was not found"}), 404

    return send_from_directory(str(index_file.parent), "index.html")


@app.route("/style.css")
def style():
    return send_from_directory(resource_path(""), "style.css")


@app.route("/script.js")
def script():
    return send_from_directory(resource_path(""), "script.js")


@app.route("/manifest.json")
def manifest():
    return send_from_directory(resource_path(""), "manifest.json")


@app.route("/<path:filename>")
def frontend_asset(filename):
    allowed_extensions = {
        ".css", ".js", ".json", ".png", ".jpg", ".jpeg",
        ".svg", ".ico", ".webp", ".webmanifest"
    }

    if Path(filename).suffix.lower() not in allowed_extensions:
        return jsonify({"error": "File not found"}), 404

    base = Path(resource_path("")).resolve()
    target = (base / filename).resolve()

    if base not in target.parents or not target.is_file():
        return jsonify({"error": "File not found"}), 404

    return send_from_directory(str(target.parent), target.name)


# ============================================================
# BASIC HEALTH
# ============================================================

@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "application": "Mobile Network Assistant"
    })


# ============================================================
# TCP PORT CHECKER
# ============================================================

@app.route("/check-port")
def check_port():
    host = request.args.get("host", "").strip()
    port_value = request.args.get("port", "").strip()

    if not host or not port_value:
        return jsonify({
            "error": "Host and port are required"
        }), 400

    if not valid_host(host):
        return jsonify({"error": "Invalid hostname or IP address"}), 400

    try:
        port = int(port_value)
    except (ValueError, TypeError):
        return jsonify({"error": "Port must be a number"}), 400

    if not 1 <= port <= 65535:
        return jsonify({
            "error": "Port must be between 1 and 65535"
        }), 400

    is_open, latency = tcp_test(host, port, timeout=3)

    if is_open:
        status = "OPEN"
    else:
        status = "CLOSED or FILTERED"

    return jsonify({
        "host": host,
        "port": port,
        "status": status,
        "latency_ms": latency
    })


# ============================================================
# DNS LOOKUP
# ============================================================

@app.route("/dns-lookup")
def dns_lookup():
    host = request.args.get("host", "").strip()

    if not host:
        return jsonify({"error": "Domain name is required"}), 400

    if not valid_host(host):
        return jsonify({"error": "Invalid domain name or IP address"}), 400

    ip_address = resolve_host(host)

    if ip_address:
        return jsonify({
            "host": host,
            "ip": ip_address,
            "status": "resolved"
        })

    return jsonify({
        "error": f"Could not resolve domain: {host}"
    }), 400


# ============================================================
# INTERNET CONNECTIVITY
# ============================================================

@app.route("/internet-check")
def internet_check():
    dns_ok, _ = test_dns()
    https_ok, _ = test_internet()

    if dns_ok and https_ok:
        status = "ONLINE"
        https_status = "WORKING"
        message = "Internet connection is working normally."
    elif dns_ok:
        status = "LIMITED"
        https_status = "FAILED"
        message = "DNS is working, but HTTPS connectivity failed."
    else:
        status = "OFFLINE"
        https_status = "FAILED"
        message = (
            "DNS resolution failed. Internet connectivity may be unavailable."
        )

    return jsonify({
        "status": status,
        "dns": "WORKING" if dns_ok else "FAILED",
        "https": https_status,
        "message": message
    })


# ============================================================
# NETWORK INFORMATION
# ============================================================

@app.route("/network-info")
def network_info():
    try:
        return jsonify(get_network_details())
    except Exception:
        app.logger.exception("Network information collection failed")
        return jsonify({
            "error": "Unable to collect network information"
        }), 500


# ============================================================
# PING AND TCP REACHABILITY
# ============================================================

@app.route("/ping")
def ping():
    host = request.args.get("host", "").strip()

    if not host:
        return jsonify({"error": "Host is required"}), 400

    if not valid_host(host):
        return jsonify({"error": "Invalid hostname or IP address"}), 400

    icmp_ok, latency, _ = test_icmp(host)
    tcp_ok, tcp_latency = tcp_test(host, 443, timeout=5)

    reachable = icmp_ok or tcp_ok

    if icmp_ok:
        status = "SUCCESS"
        message = "Host is reachable."
    elif tcp_ok:
        status = "TIMEOUT"
        message = "Host is reachable, but ICMP ping is blocked or ignored."
    else:
        status = "FAILED"
        message = "Host could not be reached using the tested methods."

    return jsonify({
        "host": host,
        "status": status,
        "latency": latency if icmp_ok else tcp_latency,
        "reachable": reachable,
        "tcp443": "OPEN" if tcp_ok else "CLOSED",
        "message": message
    })


# ============================================================
# NETWORK DIAGNOSTIC
# ============================================================

@app.route("/diagnostic")
def diagnostic():
    details = get_network_details()
    dns_ok, _ = test_dns()
    https_ok, _ = test_internet()

    local_ip = details["local_ip"]
    has_local_ip = (
        local_ip != "Not detected"
        and not local_ip.startswith("169.254.")
    )

    if has_local_ip and dns_ok and https_ok:
        status = "HEALTHY"
        icon = "🟢"
        message = (
            "Your network connection is working normally. "
            "The device has a local IP address, DNS resolution works, "
            "and external HTTPS connectivity is available."
        )
    elif dns_ok and not https_ok:
        status = "LIMITED"
        icon = "🟡"
        message = (
            "DNS is working, but HTTPS connectivity failed. "
            "Check your internet connection or firewall settings."
        )
    elif not dns_ok:
        status = "DNS ISSUE"
        icon = "🟠"
        message = (
            "DNS resolution is failing. Check your DNS configuration "
            "or network connection."
        )
    else:
        status = "OFFLINE"
        icon = "🔴"
        message = (
            "Internet connectivity appears unavailable. "
            "Check your network connection and settings."
        )

    return jsonify({
        "status": status,
        "icon": icon,
        "hostname": details["hostname"],
        "local_ip": local_ip,
        "dns": "WORKING" if dns_ok else "FAILED",
        "https": "WORKING" if https_ok else "FAILED",
        "message": message
    })


# ============================================================
# WI-FI INFORMATION
# ============================================================

@app.route("/wifi-info")
def wifi_info():
    details = get_wifi_details()

    return jsonify({
        "connection": (
            "CONNECTED" if details["connected"] else "DISCONNECTED"
        ),
        "ssid": details["ssid"],
        "signal": (
            f'{details["signal"]}%'
            if details["signal"] is not None
            else "Unknown"
        ),
        "speed": details["speed"],
        "adapter": details["adapter"],
        "profile": details["profile"]
    })


# ============================================================
# DOWNLOAD SPEED TEST
# Upload is not measured by this endpoint.
# ============================================================

@app.route("/speed-test")
def speed_test():
    try:
        connected, latency = tcp_test("google.com", 443, timeout=5)

        if not connected:
            return jsonify({
                "error": "Could not connect to the speed-test service."
            }), 503

        download_url = (
            "https://speed.cloudflare.com/__down?bytes=10000000"
        )

        start = time.perf_counter()

        response = requests.get(
            download_url,
            timeout=(5, 20),
            stream=True
        )
        response.raise_for_status()

        data_size = 0

        for chunk in response.iter_content(chunk_size=65536):
            if chunk:
                data_size += len(chunk)

        response.close()

        elapsed = time.perf_counter() - start

        if elapsed <= 0:
            download_mbps = 0
        else:
            download_mbps = round(
                (data_size * 8) / elapsed / 1_000_000,
                2
            )

        if download_mbps >= 50 and latency < 50:
            quality, icon = "EXCELLENT", "🟢"
        elif download_mbps >= 20 and latency < 100:
            quality, icon = "GOOD", "🟢"
        elif download_mbps >= 5:
            quality, icon = "FAIR", "🟡"
        else:
            quality, icon = "POOR", "🔴"

        return jsonify({
            "latency": latency,
            "download": download_mbps,
            "upload": "Not measured",
            "quality": quality,
            "icon": icon,
            "message": "Download speed test completed successfully."
        })

    except requests.RequestException as error:
        return jsonify({
            "error": "Speed test failed. Check your internet connection.",
            "details": str(error)
        }), 502


# ============================================================
# NETWORK INTERFACES
# ============================================================

@app.route("/interfaces")
def network_interfaces():
    if platform.system() == "Windows":
        command = """
        Get-NetAdapter |
            Select-Object Name, InterfaceDescription, Status,
                LinkSpeed, MacAddress, ifIndex |
            ConvertTo-Json -Compress
        """

        output = run_command([
            "powershell", "-NoProfile", "-Command", command
        ])

        if not output:
            return jsonify({"interfaces": []})

        try:
            data = json.loads(output)
        except json.JSONDecodeError:
            return jsonify({
                "error": "Unable to read network interface information"
            }), 500

        if isinstance(data, dict):
            data = [data]

        interfaces = []

        for adapter in data:
            interfaces.append({
                "name": adapter.get("Name", "Unknown"),
                "description": adapter.get(
                    "InterfaceDescription", "Unknown"
                ),
                "status": adapter.get("Status", "Unknown"),
                "speed": adapter.get("LinkSpeed", "Unknown"),
                "mac": adapter.get("MacAddress", "Unknown"),
                "index": adapter.get("ifIndex", "Unknown")
            })

        return jsonify({"interfaces": interfaces})

    interfaces = []

    try:
        for index, name in socket.if_nameindex():
            interfaces.append({
                "name": name,
                "description": name,
                "status": "Unknown",
                "speed": "Unknown",
                "mac": "Unknown",
                "index": index
            })
    except OSError:
        pass

    return jsonify({"interfaces": interfaces})



# ============================================================
# START SERVER
# Keep app.run() at the very bottom.
# ============================================================

if __name__ == "__main__":
    def open_browser():
        webbrowser.open("http://127.0.0.1:5000")

    threading.Timer(2.0, open_browser).start()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        use_reloader=False
    )
