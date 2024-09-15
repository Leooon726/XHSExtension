chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed!');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.tabId) {
        chrome.scripting.executeScript({
            target: { tabId: request.tabId },
            function: getContent
        });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.content) {
        console.log(message.log, message.content.substring(0, 100) + '...'); // Log first 100 characters
    }
});

function getContent() {
    setTimeout(() => {
        let content = document.documentElement.outerHTML;
        
        // Capture iframe contents
        const iframes = document.getElementsByTagName('iframe');
        for (let i = 0; i < iframes.length; i++) {
            try {
                content += `\n\n--- iframe ${i} content ---\n`;
                content += iframes[i].contentDocument.documentElement.outerHTML;
            } catch (e) {
                content += `\n\n--- iframe ${i} content not accessible ---\n`;
            }
        }

        // Send the full content to the popup
        chrome.runtime.sendMessage({ content: content, log: 'Full HTML content retrieved' });
    }, 2000); // Wait for 2 seconds
}