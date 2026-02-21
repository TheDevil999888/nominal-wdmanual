function removeRowHighlights() {
    document.querySelectorAll(".row-highlight").forEach(el => {
        el.classList.remove("row-highlight");
        el.style.removeProperty("background-color");
        el.style.removeProperty("color");
    });
}

let observer;
let currentRanges = [];
let isEnabled = true;

function highlightRows() {
    // Target specific elements first for better performance
    const amountElements = document.querySelectorAll('span[data-changekey="amount"]');

    if (amountElements.length > 0) {
        amountElements.forEach(el => {
            const row = el.closest('tr');
            if (!row) return;

            // Strict check: Only highlight if this is a "Withdraw" row and NOT "Deposit"
            const withdrawLink = row.querySelector('.jq-withdraw-detail');
            if (!withdrawLink || withdrawLink.innerText.trim() !== "Withdraw") return;

            const text = el.innerText;
            const numericValue = parseInt(text.replace(/[^\d]/g, ""));
            let matchRange = null;

            for (const range of currentRanges) {
                if (numericValue >= range.min && numericValue <= range.max) {
                    matchRange = range;
                    break;
                }
            }

            if (matchRange) {
                row.classList.add("row-highlight");
                row.style.setProperty("background-color", matchRange.bgColor || matchRange.color, "important");
                if (matchRange.textColor) {
                    row.style.setProperty("color", matchRange.textColor, "important");
                }
            } else {
                if (row.classList.contains("row-highlight")) {
                    row.classList.remove("row-highlight");
                    row.style.removeProperty("background-color");
                    row.style.removeProperty("color");
                }
            }
        });
    }
}

function startObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
        if (!isEnabled || !currentRanges.length) return;
        highlightRows();
    });

    observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true
    });
}

chrome.storage.local.get(["ranges", "enabled"], function (data) {
    if (data.enabled !== false) {
        isEnabled = true;
        if (data.ranges) {
            currentRanges = data.ranges;
            highlightRows();
            startObserver();
        }
    } else {
        isEnabled = false;
        removeRowHighlights();
        if (observer) observer.disconnect();
    }
});

chrome.runtime.onMessage.addListener((request) => {

    if (request.toggle !== undefined) {
        isEnabled = request.toggle;
        if (isEnabled) {
            chrome.storage.local.get("ranges", function (data) {
                if (data.ranges) {
                    currentRanges = data.ranges;
                    highlightRows();
                    startObserver();
                }
            });
        } else {
            removeRowHighlights();
            if (observer) observer.disconnect();
        }
    }

    if (request.ranges) {
        currentRanges = request.ranges;
        if (isEnabled) {
            highlightRows();
        }
    }

});
