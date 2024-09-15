document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('getContentButton');
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download Content';
    document.body.appendChild(downloadButton);
    
    let resultContainer = document.getElementById('resultContainer');

    // Create resultContainer if it doesn't exist
    if (!resultContainer) {
        resultContainer = document.createElement('div');
        resultContainer.id = 'resultContainer';
        document.body.appendChild(resultContainer);
    }

    if (button) {
        button.addEventListener('click', function() {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const activeTab = tabs[0];
                if (activeTab) {
                    // Send a message to the background script to execute the content script
                    chrome.runtime.sendMessage({ tabId: activeTab.id });
                }
            });
        });
    } else {
        console.error('Button not found');
    }

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.content) {
            console.log('Full HTML content retrieved');

            // Parse the content to find all author names, titles, likes, and user profile links
            const { authors, likes, titles, userProfiles } = parseContent(request.content);

            // Display parsed results
            resultContainer.innerHTML = ''; // Clear previous results

            authors.forEach((author, index) => {
                const likeCount = likes[index] || 'Not found'; // Handle case where likes may not match authors
                const title = titles[index] || 'Not found'; // Handle case where titles may not match authors
                const userProfile = userProfiles[index] ? `https://www.xiaohongshu.com${userProfiles[index]}` : 'Not found'; // Prepend base URL to user profile
                resultContainer.innerHTML += `<p>Title: ${title}, Author: ${author}, Likes: ${likeCount}, Profile: <a href="${userProfile}" target="_blank">${userProfile}</a></p>`;
            });

            if (authors.length === 0) {
                resultContainer.innerHTML += '<p>No authors found.</p>';
            }

            // Display original unparsed content
            const originalContentDiv = document.createElement('div');
            originalContentDiv.innerHTML = `<h3>Original Content:</h3><pre>${escapeHTML(request.content)}</pre>`;
            resultContainer.appendChild(originalContentDiv);
        }
    });

    downloadButton.addEventListener('click', function() {
        const contentToSave = resultContainer.innerHTML; // Get the content to save
        const blob = new Blob([contentToSave], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({
            url: url,
            filename: 'content.html', // You can specify the filename here
            saveAs: true // Prompt the user to save the file
        }, function(downloadId) {
            console.log('Download started with ID:', downloadId);
        });
    });

    function parseContent(content) {
        const authorRegex = /class="name">([^<]+)<\/span>/g; // Regex to capture author names
        const likeCountRegex = /class="count" selected-disabled-search="">(\d+)<\/span>/g; // Regex to capture like counts
        const titleRegex = /class="title"><span[^>]*>([^<]+)<\/span>/g; // Regex to capture article titles
        const userProfileRegex = /<a data-v-3e97982a="" href="(\/user\/profile\/[^"]+)"/g; // Regex to capture user profile links starting with /user/profile/

        const authors = [];
        const likes = [];
        const titles = [];
        const userProfiles = [];

        let authorMatch;
        while ((authorMatch = authorRegex.exec(content)) !== null) {
            authors.push(authorMatch[1].trim());
        }

        let likeCountMatch;
        while ((likeCountMatch = likeCountRegex.exec(content)) !== null) {
            likes.push(likeCountMatch[1].trim());
        }

        let titleMatch;
        while ((titleMatch = titleRegex.exec(content)) !== null) {
            titles.push(titleMatch[1].trim());
        }

        let userProfileMatch;
        while ((userProfileMatch = userProfileRegex.exec(content)) !== null) {
            userProfiles.push(userProfileMatch[1].trim());
        }

        return { authors, likes, titles, userProfiles };
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});