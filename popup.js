const toggleBtn = document.getElementById("toggleBtn");
const tableBody = document.getElementById("rangeTable");

// Load saved settings when popup opens
chrome.storage.local.get(["ranges", "enabled"], function (data) {

    const status = data.enabled !== false;
    updateToggleUI(status);

    const ranges = (data.ranges && data.ranges.length > 0) ? data.ranges : [
        { min: 100000, max: 1000000, bgColor: "#00ff00", textColor: "#000000" }
    ];

    renderRows(ranges);

});

function renderRows(ranges) {
    tableBody.innerHTML = "";
    ranges.forEach(range => {
        const bgColor = range.bgColor || range.color || "#00ff00";
        const textColor = range.textColor || "#000000";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><input type="text" class="min" value="${Number(range.min).toLocaleString('en-US')}"></td>
            <td><input type="text" class="max" value="${Number(range.max).toLocaleString('en-US')}"></td>
            <td><input type="color" class="bgColor" value="${bgColor}"></td>
            <td><input type="color" class="textColor" value="${textColor}"></td>
        `;

        tableBody.appendChild(row);
    });
}

function updateToggleUI(status) {
    if (status) {
        toggleBtn.textContent = "SYSTEM ACTIVE";
        toggleBtn.classList.add("active");
        document.body.classList.add("system-active");
    } else {
        toggleBtn.textContent = "SYSTEM OFF";
        toggleBtn.classList.remove("active");
        document.body.classList.remove("system-active");
    }
}

// Toggle ON/OFF
toggleBtn.addEventListener("click", function () {

    chrome.storage.local.get("enabled", function (data) {

        const newStatus = !(data.enabled !== false);

        chrome.storage.local.set({ enabled: newStatus }, function () {

            updateToggleUI(newStatus);

            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { toggle: newStatus }, () => {
                        if (chrome.runtime.lastError) {
                            // Suppress error if content script is not injected
                            console.log("Content script not ready:", chrome.runtime.lastError.message);
                        }
                    });
                }
            });

        });

    });

});

// Cursor Effect
document.addEventListener('mousemove', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    document.documentElement.style.setProperty('--cursor-x', `${x}px`);
    document.documentElement.style.setProperty('--cursor-y', `${y}px`);
});

// Apply button
document.getElementById("apply").addEventListener("click", function () {

    const rows = document.querySelectorAll("#rangeTable tr");
    const ranges = [];

    rows.forEach(row => {
        const min = parseInt(row.querySelector(".min").value.replace(/,/g, ""));
        const max = parseInt(row.querySelector(".max").value.replace(/,/g, ""));
        const bgColor = row.querySelector(".bgColor").value;
        const textColor = row.querySelector(".textColor").value;
        ranges.push({ min, max, bgColor, textColor });
    });

    chrome.storage.local.set({ ranges: ranges });

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { ranges: ranges }, () => {
                if (chrome.runtime.lastError) {
                    console.log("Content script update failed:", chrome.runtime.lastError.message);
                }
            });
        }
    });

    const btn = document.getElementById("apply");
    const originalText = btn.textContent;
    btn.textContent = "SYSTEM DEPLOYED // DONE";
    btn.style.background = "linear-gradient(45deg, #00D428, #008B18)"; // Success Green
    btn.style.boxShadow = "0 0 15px #00D428";

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = "";
        btn.style.boxShadow = "";
    }, 1500);

});

// Auto-format numbers with commas as user types
tableBody.addEventListener("input", function (e) {
    if (e.target.classList.contains("min") || e.target.classList.contains("max")) {
        // Remove non-digits
        const rawValue = e.target.value.replace(/\D/g, "");
        if (rawValue) {
            // Format with commas
            e.target.value = parseInt(rawValue).toLocaleString('en-US');
        } else {
            e.target.value = "";
        }
    }
});
