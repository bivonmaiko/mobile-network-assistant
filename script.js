const networkStatus = document.getElementById("networkStatus");
const results = document.getElementById("results");
const themeToggle = document.getElementById("themeToggle");


// Check browser connection
function updateNetworkStatus() {

    if (navigator.onLine) {
        networkStatus.textContent = "Online";
    } else {
        networkStatus.textContent = "Offline";
    }
}

updateNetworkStatus();

window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);
// Internet connectivity check
async function checkConnection() {

    results.innerHTML = `
        <h3>🌐 Internet Connectivity</h3>
        <p>Checking your internet connection...</p>
    `;

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/internet-check"
        );

        const data = await response.json();

        if (data.error) {

            results.innerHTML = `
                <h3>🌐 Internet Connectivity</h3>
                <p>❌ ${data.error}</p>
            `;

            return;
        }

        let statusIcon = "🔴";

        if (data.status === "ONLINE") {

            statusIcon = "🟢";

        } else if (data.status === "LIMITED") {

            statusIcon = "🟡";

        }

        results.innerHTML = `
            <h3>🌐 Internet Connectivity</h3>

            <div class="network-info-grid">

                <div class="network-info-item">
                    <span>${statusIcon}</span>

                    <div>
                        <small>Connection Status</small>
                        <strong>${data.status}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>🔎</span>

                    <div>
                        <small>DNS Resolution</small>
                        <strong>${data.dns}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>🔒</span>

                    <div>
                        <small>HTTPS Connectivity</small>
                        <strong>${data.https}</strong>
                    </div>
                </div>

            </div>

            <p style="margin-top: 20px;">
                <strong>Diagnosis:</strong>
                ${data.message}
            </p>
        `;

        // SAVE TO DIAGNOSTIC HISTORY
        saveDiagnosticHistory(
            "🌐",
            "Internet Connectivity",
            `${data.status} — DNS ${data.dns}, HTTPS ${data.https}`
        );

    } catch (error) {

        results.innerHTML = `
            <h3>🌐 Internet Connectivity</h3>

            <p>
                ❌ Cannot connect to the Python backend.
            </p>

            <p>
                Make sure <strong>server.py</strong>
                is running.
            </p>
        `;
    }
}
async function updateNetworkStatus() {

    const statusElement = document.getElementById("networkStatus");

    if (!statusElement) {
        return;
    }

    statusElement.textContent = "Checking connection...";

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/internet-check"
        );

        const data = await response.json();

        if (data.status === "ONLINE") {

            statusElement.textContent =
                "🟢 Online — Internet connection is working";

        } else if (data.status === "LIMITED") {

            statusElement.textContent =
                "🟡 Limited — Internet connection has issues";

        } else {

            statusElement.textContent =
                "🔴 Offline — No internet connection";

        }

    } catch (error) {

        statusElement.textContent =
            "🔴 Unable to check connection";

    }
}
// Internet check
function showPortChecker() {

    const panel = document.getElementById("portPanel");

    panel.style.display = "block";

    panel.scrollIntoView({
        behavior: "smooth"
    });

}
async function runPortTest() {

    const host = document.getElementById("hostInput").value.trim();
    const port = document.getElementById("portInput").value.trim();

    if (!host || !port) {

        results.innerHTML = `
            <h3>🔌 Port Checker</h3>
            <p>❌ Please enter both a host and port.</p>
        `;

        return;
    }

    if (port < 1 || port > 65535) {

        results.innerHTML = `
            <h3>🔌 Port Checker</h3>
            <p>❌ Port must be between 1 and 65535.</p>
        `;

        return;
    }

    results.innerHTML = `
        <h3>🔌 Port Checker</h3>
        <p>Testing <strong>${host}:${port}</strong>...</p>
    `;

    try {

        const response = await fetch(
            `http://127.0.0.1:5000/check-port?host=${encodeURIComponent(host)}&port=${port}`
        );

        const data = await response.json();

        if (data.error) {

            results.innerHTML = `
                <h3>🔌 Port Checker</h3>
                <p>❌ ${data.error}</p>
            `;

            return;
        }

        let icon = "🔴";

        if (data.status === "OPEN") {
            icon = "🟢";
        }

        results.innerHTML = `
            <h3>🔌 Port Checker</h3>

            <div class="port-result">

                <p><strong>Host:</strong> ${data.host}</p>

                <p><strong>Port:</strong> ${data.port}</p>

                <p>
                    <strong>Status:</strong>
                    ${icon} ${data.status}
                </p>

            </div>
        `;

    } catch (error) {

        results.innerHTML = `
            <h3>🔌 Port Checker</h3>

            <p>❌ Cannot connect to the Python backend.</p>

            <p>
                Make sure <strong>server.py</strong> is running.
            </p>
        `;
    }
}




// IP information
function getIPInfo() {

    results.innerHTML = `
        <h3>📍 IP Information</h3>
        <p>Collecting network information...</p>
    `;

    fetch("https://api.ipify.org?format=json")
        .then(response => response.json())
        .then(data => {

            results.innerHTML = `
                <h3>📍 IP Information</h3>
                <p><strong>Public IP:</strong> ${data.ip}</p>
            `;

        })
        .catch(() => {

            results.innerHTML = `
                <h3>📍 IP Information</h3>
                <p>Unable to retrieve IP information.</p>
            `;

        });
}


// DNS lookup
async function dnsLookup() {

    const domain = prompt("Enter a domain name (example.com):");

    if (!domain) {
        return;
    }

    results.innerHTML = `
        <h3>🔎 DNS Lookup</h3>
        <p>Looking up <strong>${domain}</strong>...</p>
    `;

    try {

        const response = await fetch(
            `https://dns.google/resolve?name=${encodeURIComponent(domain)}`
        );

        const data = await response.json();

        if (!data.Answer) {

            results.innerHTML = `
                <h3>🔎 DNS Lookup</h3>
                <p>No DNS records found for <strong>${domain}</strong>.</p>
            `;

            return;
        }

        let records = "";

        data.Answer.forEach(record => {

            records += `
                <p>
                    <strong>Type:</strong> ${record.type}<br>
                    <strong>Address:</strong> ${record.data}
                </p>
                <hr>
            `;

        });

        results.innerHTML = `
            <h3>🔎 DNS Lookup</h3>

            <p>
                <strong>Domain:</strong> ${domain}
            </p>

            <br>

            ${records}
        `;

    } catch (error) {

        results.innerHTML = `
            <h3>🔎 DNS Lookup</h3>
            <p>Unable to complete the DNS lookup.</p>
        `;

    }
}
function showPingTool() {

    const panel = document.getElementById("pingPanel");

    panel.style.display = "block";

    panel.scrollIntoView({
        behavior: "smooth"
    });

}
async function runPingTest() {

    const host = document.getElementById("pingHost").value.trim();

    if (!host) {

        results.innerHTML = `
            <h3>📡 Ping Test</h3>
            <p>❌ Please enter a host or IP address.</p>
        `;

        return;
    }

    results.innerHTML = `
        <h3>📡 Ping Test</h3>
        <p>Testing <strong>${host}</strong>...</p>
    `;

    try {

        const response = await fetch(
            `http://127.0.0.1:5000/ping?host=${encodeURIComponent(host)}`
        );

        const data = await response.json();

        if (data.error) {

            results.innerHTML = `
                <h3>📡 Ping Test</h3>
                <p>❌ ${data.error}</p>
            `;

            return;
        }

        let statusIcon = "🔴";

        if (data.reachable === true) {
            statusIcon = "🟢";
        }

        let latency = data.latency !== null
            ? `${data.latency} ms`
            : "No response";

        let tcpStatus = data.tcp443 || "UNKNOWN";

        let tcpIcon =
            tcpStatus === "OPEN"
                ? "🟢"
                : "🔴";

        results.innerHTML = `
            <h3>📡 Ping Test</h3>

            <p>
                <strong>Host:</strong>
                ${data.host}
            </p>

            <p>
                <strong>Status:</strong>
                ${statusIcon}
                ${data.reachable
                ? "Reachable"
                : "Unreachable"}
            </p>

            <p>
                <strong>Latency:</strong>
                ${latency}
            </p>

            <p>
                <strong>HTTPS (443):</strong>
                ${tcpIcon}
                ${tcpStatus}
            </p>

            <p>
                <strong>Diagnosis:</strong>
                ${data.message}
            </p>
        `;

        // SAVE PING RESULT TO HISTORY

        saveDiagnosticHistory(
            "📡",
            "Ping Test",
            `${data.host} — ${data.latency !== null
                ? data.latency + " ms"
                : "No response"
            } — ${data.reachable
                ? "Reachable"
                : "Unreachable"
            }`
        );

    } catch (error) {

        results.innerHTML = `
            <h3>📡 Ping Test</h3>

            <p>
                ❌ Cannot connect to the Python backend.
            </p>

            <p>
                Make sure
                <strong>server.py</strong>
                is running.
            </p>
        `;
    }
}

async function runDiagnostic() {

    results.innerHTML = `
        <h3>🧠 Diagnostic Results</h3>
        <p>Running complete network diagnostics...</p>
    `;

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/diagnostic"
        );

        const data = await response.json();

        if (data.error) {

            results.innerHTML = `
                <h3>🧠 Diagnostic Results</h3>
                <p>❌ ${data.error}</p>
            `;

            return;
        }

        results.innerHTML = `
            <h3>🧠 Diagnostic Results</h3>

            <div class="network-info-grid">

                <div class="network-info-item">
                    <span>${data.icon}</span>
                    <div>
                        <small>Overall Status</small>
                        <strong>${data.status}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>💻</span>
                    <div>
                        <small>Hostname</small>
                        <strong>${data.hostname}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>🌐</span>
                    <div>
                        <small>Local IP</small>
                        <strong>${data.local_ip}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>🔎</span>
                    <div>
                        <small>DNS Resolution</small>
                        <strong>${data.dns}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>🔒</span>
                    <div>
                        <small>HTTPS Connectivity</small>
                        <strong>${data.https}</strong>
                    </div>
                </div>

            </div>

            <p style="margin-top: 20px;">
                <strong>Diagnosis:</strong>
                ${data.message}
            </p>
        `;

    } catch (error) {

        results.innerHTML = `
            <h3>🧠 Diagnostic Results</h3>

            <p>❌ Cannot connect to the Python backend.</p>

            <p>
                Make sure <strong>server.py</strong> is running.
            </p>
        `;
    }
}


async function getNetworkInfo() {

    const panel = document.getElementById("networkInfoPanel");

    if (panel) {

        panel.style.display = "block";

        panel.scrollIntoView({
            behavior: "smooth"
        });
    }

    results.innerHTML = `
        <h3>📡 Network Information</h3>
        <p>Collecting network information...</p>
    `;

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/network-info"
        );

        const data = await response.json();

        if (data.error) {

            results.innerHTML = `
                <h3>📡 Network Information</h3>
                <p>❌ ${data.error}</p>
            `;

            return;
        }

        results.innerHTML = `
            <h3>📡 Network Information</h3>

            <div class="network-info-grid">

                <div class="network-info-item">
                    <span>💻</span>
                    <div>
                        <small>Hostname</small>
                        <strong>${data.hostname}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>🌐</span>
                    <div>
                        <small>Local IP Address</small>
                        <strong>${data.local_ip}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>🔗</span>
                    <div>
                        <small>MAC Address</small>
                        <strong>${data.mac_address}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>📡</span>
                    <div>
                        <small>Wi-Fi Adapter</small>
                        <strong>${data.wifi_adapter}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>📐</span>
                    <div>
                        <small>Subnet Mask</small>
                        <strong>${data.subnet_mask}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>🚪</span>
                    <div>
                        <small>Default Gateway</small>
                        <strong>${data.gateway}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>🧭</span>
                    <div>
                        <small>DNS Server</small>
                        <strong>${data.dns_server}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>🪟</span>
                    <div>
                        <small>Operating System</small>
                        <strong>${data.operating_system}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>📋</span>
                    <div>
                        <small>OS Version</small>
                        <strong>${data.os_version}</strong>
                    </div>
                </div>

            </div>
        `;

    } catch (error) {

        results.innerHTML = `
            <h3>📡 Network Information</h3>

            <p>❌ Cannot connect to the Python backend.</p>

            <p>
                Make sure <strong>server.py</strong> is running.
            </p>
        `;
    }
}


async function getNetworkInterfaces() {

    results.innerHTML = `
        <h3>🖧 Network Interfaces</h3>
        <p>Scanning network adapters...</p>
    `;

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/interfaces"
        );

        const data = await response.json();

        if (data.error) {

            results.innerHTML = `
                <h3>🖧 Network Interfaces</h3>
                <p>❌ ${data.error}</p>
            `;

            return;
        }

        if (!data.interfaces || data.interfaces.length === 0) {

            results.innerHTML = `
                <h3>🖧 Network Interfaces</h3>
                <p>❌ No network adapters were detected.</p>
            `;

            return;
        }

        let interfaceCards = "";

        data.interfaces.forEach(adapter => {

            let statusIcon = "⚪";
            let statusLabel = adapter.status || "Unknown";

            if (
                statusLabel.toLowerCase() === "up"
            ) {

                statusIcon = "🟢";
                statusLabel = "CONNECTED";

            } else if (
                statusLabel.toLowerCase() === "disconnected"
            ) {

                statusIcon = "🟡";
                statusLabel = "DISCONNECTED";

            } else if (
                statusLabel.toLowerCase() === "not present"
            ) {

                statusIcon = "⚪";
                statusLabel = "NOT PRESENT";
            }

            interfaceCards += `

                <div class="network-info-item">

                    <span>${statusIcon}</span>

                    <div>

                        <small>Adapter</small>

                        <strong>
                            ${adapter.name}
                        </strong>

                        <small style="margin-top: 8px;">
                            Status
                        </small>

                        <strong>
                            ${statusLabel}
                        </strong>

                        <small style="margin-top: 8px;">
                            Link Speed
                        </small>

                        <strong>
                            ${adapter.speed}
                        </strong>

                        <small style="margin-top: 8px;">
                            MAC Address
                        </small>

                        <strong>
                            ${adapter.mac || "Not available"}
                        </strong>

                        <small style="margin-top: 8px;">
                            Description
                        </small>

                        <strong>
                            ${adapter.description}
                        </strong>

                    </div>

                </div>

            `;
        });

        results.innerHTML = `

            <h3>🖧 Network Interfaces</h3>

            <p>
                Detected
                <strong>
                    ${data.interfaces.length}
                </strong>
                network adapter(s).
            </p>

            <div class="network-info-grid">

                ${interfaceCards}

            </div>

        `;

    } catch (error) {

        results.innerHTML = `

            <h3>🖧 Network Interfaces</h3>

            <p>
                ❌ Cannot connect to the Python backend.
            </p>

            <p>
                Make sure
                <strong>server.py</strong>
                is running.
            </p>

        `;
    }
}
async function getWiFiInfo() {

    const panel = document.getElementById("wifiPanel");

    panel.style.display = "block";

    panel.scrollIntoView({
        behavior: "smooth"
    });

    results.innerHTML = `
        <h3>📶 Wi-Fi Information</h3>
        <p>Collecting Wi-Fi connection details...</p>
    `;

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/wifi-info"
        );

        const data = await response.json();

        if (data.error) {

            results.innerHTML = `
                <h3>📶 Wi-Fi Information</h3>
                <p>❌ ${data.error}</p>
            `;

            return;
        }

        let statusIcon = "🔴";

        if (data.connection === "CONNECTED") {
            statusIcon = "🟢";
        }

        results.innerHTML = `
            <h3>📶 Wi-Fi Information</h3>

            <div class="network-info-grid">

                <div class="network-info-item">
                    <span>${statusIcon}</span>
                    <div>
                        <small>Connection Status</small>
                        <strong>${data.connection}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>📶</span>
                    <div>
                        <small>Wi-Fi Network (SSID)</small>
                        <strong>${data.ssid}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>📊</span>
                    <div>
                        <small>Signal Strength</small>
                        <strong>${data.signal}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>⚡</span>
                    <div>
                        <small>Link Speed</small>
                        <strong>${data.speed}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>💻</span>
                    <div>
                        <small>Wi-Fi Adapter</small>
                        <strong>${data.adapter}</strong>
                    </div>
                </div>

                <div class="network-info-item">
                    <span>🌐</span>
                    <div>
                        <small>Network Profile</small>
                        <strong>${data.profile}</strong>
                    </div>
                </div>

            </div>
        `;

    } catch (error) {

        results.innerHTML = `
            <h3>📶 Wi-Fi Information</h3>

            <p>❌ Cannot connect to the Python backend.</p>

            <p>
                Make sure <strong>server.py</strong> is running.
            </p>
        `;
    }
}
// -------------------------
// NETWORK STATUS
// -------------------------

async function updateNetworkStatus() {

    const statusElement =
        document.getElementById("networkStatus");

    if (!statusElement) {
        return;
    }

    statusElement.textContent =
        "Checking connection...";

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/internet-check"
        );

        const data = await response.json();

        if (data.status === "ONLINE") {

            statusElement.textContent =
                "🟢 Online — Internet connection is working";

        } else if (data.status === "LIMITED") {

            statusElement.textContent =
                "🟡 Limited — Internet connection has issues";

        } else {

            statusElement.textContent =
                "🔴 Offline — No internet connection";

        }

    } catch (error) {

        statusElement.textContent =
            "🔴 Unable to check connection";

    }
}


// -------------------------
// START NETWORK STATUS
// -------------------------

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateNetworkStatus();

    }
);
// =================================
// NETWORK DASHBOARD
// =================================

async function loadNetworkDashboard() {

    const internet = document.getElementById("dashboardInternet");
    const wifi = document.getElementById("dashboardWifi");
    const signal = document.getElementById("dashboardSignal");
    const speed = document.getElementById("dashboardSpeed");
    const ip = document.getElementById("dashboardIP");
    const gateway = document.getElementById("dashboardGateway");
    const dns = document.getElementById("dashboardDNS");
    const adapter = document.getElementById("dashboardAdapter");


    // Show loading state

    internet.textContent = "Checking...";
    wifi.textContent = "Checking...";
    signal.textContent = "Checking...";
    speed.textContent = "Checking...";
    ip.textContent = "Checking...";
    gateway.textContent = "Checking...";
    dns.textContent = "Checking...";
    adapter.textContent = "Checking...";


    try {

        // =================================
        // INTERNET STATUS
        // =================================

        const internetResponse = await fetch(
            "http://127.0.0.1:5000/internet-check"
        );

        const internetData =
            await internetResponse.json();


        if (internetData.status === "ONLINE") {

            internet.textContent = "🟢 ONLINE";

        } else if (
            internetData.status === "LIMITED"
        ) {

            internet.textContent = "🟡 LIMITED";

        } else {

            internet.textContent = "🔴 OFFLINE";

        }


        // =================================
        // WI-FI INFORMATION
        // =================================

        const wifiResponse = await fetch(
            "http://127.0.0.1:5000/wifi-info"
        );

        const wifiData =
            await wifiResponse.json();


        if (wifiData.connection === "CONNECTED") {

            wifi.textContent = "🟢 CONNECTED";

        } else {

            wifi.textContent = "🔴 DISCONNECTED";

        }


        signal.textContent =
            wifiData.signal || "Unknown";


        speed.textContent =
            wifiData.speed || "Unknown";


        adapter.textContent =
            wifiData.adapter || "Unknown";


        // =================================
        // NETWORK INFORMATION
        // =================================

        const networkResponse = await fetch(
            "http://127.0.0.1:5000/network-info"
        );

        const networkData =
            await networkResponse.json();


        ip.textContent =
            networkData.local_ip || "Unknown";


        gateway.textContent =
            networkData.gateway || "Unknown";


        dns.textContent =
            networkData.dns_server || "Unknown";


    } catch (error) {

        internet.textContent = "🔴 ERROR";
        wifi.textContent = "🔴 ERROR";
        signal.textContent = "Unavailable";
        speed.textContent = "Unavailable";
        ip.textContent = "Unavailable";
        gateway.textContent = "Unavailable";
        dns.textContent = "Unavailable";
        adapter.textContent = "Unavailable";

        console.error(
            "Dashboard error:",
            error
        );

    }
}
document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadNetworkDashboard();

    }
);
// =================================
// DIAGNOSTIC HISTORY
// =================================

function saveDiagnosticHistory(
    icon,
    title,
    result
) {

    const history =
        JSON.parse(
            localStorage.getItem(
                "networkDiagnosticHistory"
            )
        ) || [];

    const now = new Date();

    const time = now.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

    history.unshift({

        icon: icon,

        title: title,

        result: result,

        time: time

    });

    // Keep only the latest 20 tests

    if (history.length > 20) {
        history.length = 20;
    }

    localStorage.setItem(
        "networkDiagnosticHistory",
        JSON.stringify(history)
    );

    displayDiagnosticHistory();
}


function displayDiagnosticHistory() {

    const container =
        document.getElementById(
            "diagnosticHistory"
        );

    if (!container) {
        return;
    }

    const history =
        JSON.parse(
            localStorage.getItem(
                "networkDiagnosticHistory"
            )
        ) || [];

    if (history.length === 0) {

        container.innerHTML = `
            <div class="history-empty">
                No diagnostic tests recorded yet.
            </div>
        `;

        return;
    }

    container.innerHTML =
        history.map(item => `

            <div class="history-item">

                <div class="history-item-left">

                    <span class="history-icon">
                        ${item.icon}
                    </span>

                    <div>

                        <strong>
                            ${item.title}
                        </strong>

                        <small>
                            ${item.result}
                        </small>

                    </div>

                </div>

                <span class="history-time">
                    ${item.time}
                </span>

            </div>

        `).join("");
}


function clearDiagnosticHistory() {

    localStorage.removeItem(
        "networkDiagnosticHistory"
    );

    displayDiagnosticHistory();
}


document.addEventListener(
    "DOMContentLoaded",
    function () {

        displayDiagnosticHistory();

    }
);
// =================================
// SMART TROUBLESHOOTING
// =================================

async function runSmartDiagnosis() {

    const resultBox =
        document.getElementById("smartDiagnosisResult");

    if (!resultBox) {
        return;
    }

    resultBox.innerHTML = `
        <div class="diagnosis-status">
            <strong>🧠 Running Full Diagnosis...</strong>
            <span>Please wait while the network is being analyzed.</span>
        </div>
    `;

    try {

        // INTERNET CHECK
        const internetResponse = await fetch(
            "http://127.0.0.1:5000/internet-check"
        );

        const internetData =
            await internetResponse.json();


        // WI-FI CHECK
        const wifiResponse = await fetch(
            "http://127.0.0.1:5000/wifi-info"
        );

        const wifiData =
            await wifiResponse.json();


        // NETWORK INFORMATION
        const networkResponse = await fetch(
            "http://127.0.0.1:5000/network-info"
        );

        const networkData =
            await networkResponse.json();


        let problems = 0;
        let checks = [];


        // INTERNET
        if (internetData.status === "ONLINE") {

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🟢</span>
                    <div>
                        <strong>Internet Connection</strong>
                        <small>Internet connection is working normally.</small>
                    </div>
                </div>
            `);

        } else {

            problems++;

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🔴</span>
                    <div>
                        <strong>Internet Connection</strong>
                        <small>${internetData.status || "Connection problem detected."}</small>
                    </div>
                </div>
            `);
        }


        // WI-FI
        if (wifiData.connection === "CONNECTED") {

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🟢</span>
                    <div>
                        <strong>Wi-Fi Connection</strong>
                        <small>Wi-Fi is connected.</small>
                    </div>
                </div>
            `);

        } else {

            problems++;

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🔴</span>
                    <div>
                        <strong>Wi-Fi Connection</strong>
                        <small>Wi-Fi is not connected.</small>
                    </div>
                </div>
            `);
        }


        // DNS
        if (
            internetData.dns &&
            internetData.dns.toString().toUpperCase().includes("OK")
        ) {

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🟢</span>
                    <div>
                        <strong>DNS Resolution</strong>
                        <small>DNS resolution is working.</small>
                    </div>
                </div>
            `);

        } else {

            problems++;

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🟡</span>
                    <div>
                        <strong>DNS Resolution</strong>
                        <small>${internetData.dns || "DNS problem detected."}</small>
                    </div>
                </div>
            `);
        }


        // HTTPS
        if (
            internetData.https &&
            internetData.https.toString().toUpperCase().includes("OK")
        ) {

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🟢</span>
                    <div>
                        <strong>HTTPS Connectivity</strong>
                        <small>Secure internet connectivity is working.</small>
                    </div>
                </div>
            `);

        } else {

            problems++;

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🟡</span>
                    <div>
                        <strong>HTTPS Connectivity</strong>
                        <small>${internetData.https || "HTTPS problem detected."}</small>
                    </div>
                </div>
            `);
        }


        // GATEWAY
        if (
            networkData.gateway &&
            networkData.gateway !== "Unknown"
        ) {

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🟢</span>
                    <div>
                        <strong>Gateway</strong>
                        <small>${networkData.gateway}</small>
                    </div>
                </div>
            `);

        } else {

            problems++;

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🔴</span>
                    <div>
                        <strong>Gateway</strong>
                        <small>No gateway detected.</small>
                    </div>
                </div>
            `);
        }


        // LOCAL IP
        if (
            networkData.local_ip &&
            networkData.local_ip !== "Unknown"
        ) {

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🟢</span>
                    <div>
                        <strong>Local IP Address</strong>
                        <small>${networkData.local_ip}</small>
                    </div>
                </div>
            `);

        } else {

            problems++;

            checks.push(`
                <div class="diagnosis-check">
                    <span class="diagnosis-check-icon">🔴</span>
                    <div>
                        <strong>Local IP Address</strong>
                        <small>No local IP address detected.</small>
                    </div>
                </div>
            `);
        }


        // OVERALL RESULT
        let overallTitle;
        let overallMessage;

        if (problems === 0) {

            overallTitle = "🟢 Network Healthy";
            overallMessage =
                "No major network problems were detected.";

        } else if (problems === 1) {

            overallTitle = "🟡 Minor Network Issue";
            overallMessage =
                "One network problem was detected.";

        } else {

            overallTitle = "🔴 Multiple Network Issues";
            overallMessage =
                `${problems} network problems were detected.`;
        }


        // RECOMMENDATIONS
        let recommendations = [];

        if (internetData.status !== "ONLINE") {
            recommendations.push(
                "Check your router or mobile data connection."
            );
        }

        if (wifiData.connection !== "CONNECTED") {
            recommendations.push(
                "Reconnect to a Wi-Fi network."
            );
        }

        if (
            !internetData.dns ||
            !internetData.dns.toString().toUpperCase().includes("OK")
        ) {
            recommendations.push(
                "Restart the router or check your DNS settings."
            );
        }

        if (
            !networkData.gateway ||
            networkData.gateway === "Unknown"
        ) {
            recommendations.push(
                "Reconnect to the network and obtain a new IP configuration."
            );
        }


        resultBox.innerHTML = `

            <div class="diagnosis-status">

                <strong>${overallTitle}</strong>

                <span>
                    ${overallMessage}
                </span>

            </div>

            ${checks.join("")}

            ${recommendations.length > 0
                ? `
                    <div class="diagnosis-status">

                        <strong>💡 Recommendations</strong>

                        <ul>
                            ${recommendations
                    .map(item => `<li>${item}</li>`)
                    .join("")}
                        </ul>

                    </div>
                `
                : ""
            }

        `;

    } catch (error) {

        console.error(
            "Smart Diagnosis Error:",
            error
        );

        resultBox.innerHTML = `

            <div class="diagnosis-status">

                <strong>🔴 Diagnosis Failed</strong>

                <span>
                    Unable to communicate with the Python backend.
                    Make sure server.py is running.
                </span>

            </div>

        `;
    }
}
// =================================
// NETWORK DIAGNOSTIC REPORT
// =================================

async function generateNetworkReport() {

    const report =
        document.getElementById("networkReport");

    if (!report) {
        return;
    }

    report.innerHTML = `
        <div class="report-card">
            <h3>📄 Generating Report...</h3>
            <p>Please wait while the network information is collected.</p>
        </div>
    `;

    try {

        // INTERNET
        const internetResponse = await fetch(
            "http://127.0.0.1:5000/internet-check"
        );

        const internetData =
            await internetResponse.json();


        // WI-FI
        const wifiResponse = await fetch(
            "http://127.0.0.1:5000/wifi-info"
        );

        const wifiData =
            await wifiResponse.json();


        // NETWORK INFORMATION
        const networkResponse = await fetch(
            "http://127.0.0.1:5000/network-info"
        );

        const networkData =
            await networkResponse.json();


        // CURRENT DATE AND TIME
        const reportDate =
            new Date().toLocaleString();


        // INTERNET STATUS
        let internetStatus = "🔴 OFFLINE";

        if (internetData.status === "ONLINE") {

            internetStatus = "🟢 ONLINE";

        } else if (internetData.status === "LIMITED") {

            internetStatus = "🟡 LIMITED";
        }


        // WIFI STATUS
        let wifiStatus = "🔴 DISCONNECTED";

        if (wifiData.connection === "CONNECTED") {

            wifiStatus = "🟢 CONNECTED";
        }


        // BUILD REPORT
        report.innerHTML = `

            <div class="report-card">

                <h3>📄 Network Diagnostic Report</h3>

                <p>
                    <strong>Generated:</strong>
                    ${reportDate}
                </p>

            </div>


            <div class="report-card">

                <h3>🖥️ Device Information</h3>

                <div class="report-grid">

                    <div class="report-item">

                        <small>Hostname</small>

                        <strong>
                            ${networkData.hostname || "Unknown"}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>Operating System</small>

                        <strong>
                            ${networkData.operating_system || "Unknown"}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>OS Version</small>

                        <strong>
                            ${networkData.os_version || "Unknown"}
                        </strong>

                    </div>

                </div>

            </div>


            <div class="report-card">

                <h3>🌐 Internet Connectivity</h3>

                <div class="report-grid">

                    <div class="report-item">

                        <small>Status</small>

                        <strong>
                            ${internetStatus}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>DNS Resolution</small>

                        <strong>
                            ${internetData.dns || "Unknown"}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>HTTPS Connectivity</small>

                        <strong>
                            ${internetData.https || "Unknown"}
                        </strong>

                    </div>

                </div>

            </div>


            <div class="report-card">

                <h3>📶 Wi-Fi Information</h3>

                <div class="report-grid">

                    <div class="report-item">

                        <small>Connection</small>

                        <strong>
                            ${wifiStatus}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>Network</small>

                        <strong>
                            ${wifiData.ssid || "Unknown"}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>Signal Strength</small>

                        <strong>
                            ${wifiData.signal || "Unknown"}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>Link Speed</small>

                        <strong>
                            ${wifiData.speed || "Unknown"}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>Adapter</small>

                        <strong>
                            ${wifiData.adapter || "Unknown"}
                        </strong>

                    </div>

                </div>

            </div>


            <div class="report-card">

                <h3>📍 Network Configuration</h3>

                <div class="report-grid">

                    <div class="report-item">

                        <small>Local IP</small>

                        <strong>
                            ${networkData.local_ip || "Unknown"}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>Gateway</small>

                        <strong>
                            ${networkData.gateway || "Unknown"}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>DNS Server</small>

                        <strong>
                            ${networkData.dns_server || "Unknown"}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>Subnet Mask</small>

                        <strong>
                            ${networkData.subnet_mask || "Unknown"}
                        </strong>

                    </div>


                    <div class="report-item">

                        <small>MAC Address</small>

                        <strong>
                            ${networkData.mac_address || "Unknown"}
                        </strong>

                    </div>

                </div>

            </div>


            <div class="report-card">

                <h3>🧠 Overall Diagnosis</h3>

                <p>

                    ${internetData.status === "ONLINE"
                && wifiData.connection === "CONNECTED"
                ? "🟢 Network appears to be operating normally."
                : "🟡 Network issues were detected. Run Smart Troubleshooting for detailed recommendations."
            }

                </p>

            </div>

        `;

    } catch (error) {

        console.error(
            "Network Report Error:",
            error
        );

        report.innerHTML = `

            <div class="report-card">

                <h3>🔴 Report Generation Failed</h3>

                <p>
                    Unable to collect network information.
                    Make sure <strong>server.py</strong>
                    is running.
                </p>

            </div>

        `;
    }
}
// =================================
// DOWNLOAD NETWORK REPORT
// =================================

function downloadNetworkReport() {

    const report =
        document.getElementById("networkReport");

    if (!report) {
        return;
    }

    const reportContent =
        report.innerText.trim();

    if (
        !reportContent ||
        reportContent.includes(
            "Click Generate Report"
        )
    ) {

        alert(
            "Please generate the network report first."
        );

        return;
    }

    const date =
        new Date()
            .toISOString()
            .slice(0, 10);

    const fileName =
        `Network-Diagnostic-Report-${date}.txt`;

    const blob =
        new Blob(
            [reportContent],
            {
                type: "text/plain"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download = fileName;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

}
// =================================
// DOWNLOAD NETWORK PDF REPORT
// =================================

// =================================
// PROFESSIONAL NETWORK PDF REPORT
// =================================

function downloadNetworkPDF() {

    const report =
        document.getElementById("networkReport");

    if (!report) {
        return;
    }

    const reportContent =
        report.innerText.trim();

    if (
        !reportContent ||
        reportContent.includes("Click Generate Report")
    ) {

        alert(
            "Please generate the network report first."
        );

        return;
    }

    if (
        typeof window.jspdf === "undefined"
    ) {

        alert(
            "PDF library is not available. Please refresh the page."
        );

        return;
    }


    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF();


    const pageWidth =
        pdf.internal.pageSize.getWidth();

    const pageHeight =
        pdf.internal.pageSize.getHeight();


    const margin = 18;

    let y = 20;


    // =================================
    // HEADER
    // =================================

    pdf.setFontSize(22);

    pdf.setFont(undefined, "bold");

    pdf.text(
        "MOBILE NETWORK ASSISTANT",
        margin,
        y
    );

    y += 9;


    pdf.setFontSize(14);

    pdf.setFont(undefined, "normal");

    pdf.text(
        "Network Diagnostic Report",
        margin,
        y
    );

    y += 8;


    pdf.setFontSize(9);

    pdf.text(
        "Generated: " +
        new Date().toLocaleString(),
        margin,
        y
    );

    y += 8;


    pdf.line(
        margin,
        y,
        pageWidth - margin,
        y
    );

    y += 12;


    // =================================
    // REPORT CONTENT
    // =================================

    const sections =
        reportContent.split(
            "\n\n"
        );


    pdf.setFontSize(10);


    sections.forEach(
        function (section) {

            const lines =
                section
                    .split("\n")
                    .filter(
                        line =>
                            line.trim() !== ""
                    );


            if (lines.length === 0) {
                return;
            }


            // Check if enough space remains

            if (
                y >
                pageHeight - 45
            ) {

                addPDFPageHeader();

            }


            // SECTION TITLE

            const firstLine =
                lines[0].trim();


            if (
                firstLine.includes("📄") ||
                firstLine.includes("🖥️") ||
                firstLine.includes("🌐") ||
                firstLine.includes("📶") ||
                firstLine.includes("📍") ||
                firstLine.includes("🧠")
            ) {

                pdf.setFontSize(12);

                pdf.setFont(
                    undefined,
                    "bold"
                );

                pdf.text(
                    cleanPDFText(firstLine),
                    margin,
                    y
                );

                y += 7;

                pdf.setFont(
                    undefined,
                    "normal"
                );

                lines
                    .slice(1)
                    .forEach(
                        function (line) {

                            addPDFLine(line);

                        }
                    );

            } else {

                lines.forEach(
                    function (line) {

                        addPDFLine(line);

                    }
                );

            }


            y += 5;

        }
    );


    // =================================
    // FOOTER
    // =================================

    addPDFFooters();


    // =================================
    // SAVE FILE
    // =================================

    const date =
        new Date()
            .toISOString()
            .slice(0, 10);


    pdf.save(
        `Network-Diagnostic-Report-${date}.pdf`
    );


    // =================================
    // HELPER FUNCTIONS
    // =================================

    function addPDFLine(line) {

        const cleanLine =
            cleanPDFText(
                line.trim()
            );


        if (!cleanLine) {
            return;
        }


        const wrapped =
            pdf.splitTextToSize(
                cleanLine,
                pageWidth - margin * 2
            );


        wrapped.forEach(
            function (textLine) {

                if (
                    y >
                    pageHeight - 25
                ) {

                    addPDFPageHeader();

                }


                pdf.setFontSize(10);

                pdf.setFont(
                    undefined,
                    "normal"
                );

                pdf.text(
                    textLine,
                    margin,
                    y
                );

                y += 5.5;

            }
        );

    }


    function addPDFPageHeader() {

        pdf.addPage();

        y = 20;


        pdf.setFontSize(11);

        pdf.setFont(
            undefined,
            "bold"
        );

        pdf.text(
            "MOBILE NETWORK ASSISTANT",
            margin,
            y
        );

        y += 8;


        pdf.line(
            margin,
            y,
            pageWidth - margin,
            y
        );

        y += 10;

    }


    function addPDFFooters() {

        const pageCount =
            pdf.internal.getNumberOfPages();


        for (
            let page = 1;
            page <= pageCount;
            page++
        ) {

            pdf.setPage(page);


            pdf.setFontSize(8);

            pdf.setFont(
                undefined,
                "normal"
            );


            pdf.line(
                margin,
                pageHeight - 16,
                pageWidth - margin,
                pageHeight - 16
            );


            pdf.text(
                "Mobile Network Assistant",
                margin,
                pageHeight - 9
            );


            pdf.text(
                `Page ${page} of ${pageCount}`,
                pageWidth - 48,
                pageHeight - 9
            );

        }

    }


    function cleanPDFText(text) {

        return text
            .replace(
                /[^\x20-\x7E]/g,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    }

}