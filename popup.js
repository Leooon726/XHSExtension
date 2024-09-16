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
        const noteItems = content.split(/class="note-item"/); // Split by note item
        
        const authors = [];
        const likes = [];
        const titles = [];
        const userProfiles = [];
        
        noteItems.forEach((note, index) => {
            console.log(`Parsing Note item ${index}:`, note); // Log the original note item for comparison
            const authorMatch = /class="name">([^<]+)<\/span>/.exec(note);
            const likeCountMatch = /class="count" selected-disabled-search="">([\d.]+[^\d<]*)<\/span>/.exec(note);
            const titleMatch = /class="title"><span[^>]*>([^<]+)<\/span>/.exec(note);
            const userProfileMatch = /<a data-v-3e97982a="" href="(\/user\/profile\/[^"]+)"/.exec(note);
            
            if (authorMatch) {
                authors.push(authorMatch[1].trim());
                console.log('Author:', authorMatch[1].trim());
            }
            if (likeCountMatch) {
                let likeCount = likeCountMatch[1].trim();
                // Check for Chinese characters in the like count
                if (/[\u4e00-\u9fa5]/.test(likeCount)) {
                    likeCount = parseFloat(likeCount) * 10000; // Multiply by 10000 if Chinese characters are present
                }
                likes.push(likeCount);
                console.log('Likes:', likeCount);
            }
            if (titleMatch) {
                titles.push(titleMatch[1].trim());
                console.log('Title:', titleMatch[1].trim());
            }
            if (userProfileMatch) {
                userProfiles.push(userProfileMatch[1].trim());
                console.log('User Profile:', userProfileMatch[1].trim());
            }
        });
        
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