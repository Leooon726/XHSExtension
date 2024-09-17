document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('getContentButton');
    const showExtractFansCountButton = document.getElementById('showExtractFansCountButton');
    const resultContainer = document.getElementById('resultContainer');
    const highLikesLowFansArticlesContainer = document.getElementById('high_likes_low_fans');
    const extractFansCountContainer = document.getElementById('extract_fans_count');
    const highLikesLowFansButton = document.getElementById('highlikeslowfans');
    const likeThresholdInput = document.getElementById('likeThresholdInput');
    const historicalResultButton = document.getElementById('historicalResultButton');
    const toggleDebugElementsButton = document.getElementById('toggleDebugElements');

    let articlesData = []; // List of dict to maintain authors, likes, titles, userProfiles, and articleLinks
    let high_liked_note = []; // Declare high_liked_note in a broader scope

    if (button) {
        button.addEventListener('click', function() {
            console.log('Get content button clicked'); // Log when the button is clicked
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const activeTab = tabs[0];
                if (activeTab) {
                    chrome.runtime.sendMessage({ tabId: activeTab.id });
                    activateContainer(resultContainer);
                }
            });
        });
    } else {
        console.error('Button not found');
    }

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.content) {
            console.log('Full HTML content retrieved');
            articlesData = parseContent(request.content);
            filterHighLikedArticlesAndShowNumbers(articlesData);
        }
    });

    showExtractFansCountButton.addEventListener('click', function() {
        activateContainer(extractFansCountContainer);
        displayExtractFansCount().then(() => {
            console.log('Fans Extraction completed');
            highLikesLowFansButton.click();
        });
    });

    if (highLikesLowFansButton) {
        highLikesLowFansButton.addEventListener('click', function() {
            activateContainer(highLikesLowFansArticlesContainer);
            displayHighLikesLowFansArticles(); // Call the function to display high liked articles
        });
    }

    if (historicalResultButton) {
        historicalResultButton.addEventListener('click', function() {
            // Show the historical results container
            const historicalResultsContainer = document.getElementById('historicalResultsContainer');
            activateContainer(historicalResultsContainer);

            // Fetch and display sorted articles
            chrome.storage.local.get('sortedArticles', function(data) {
                const sortedArticles = data.sortedArticles || [];
                historicalResultsContainer.innerHTML = ''; // Clear previous results

                if (sortedArticles.length > 0) {
                    displayArticlesDetails(sortedArticles, historicalResultsContainer);
                } else {
                    historicalResultsContainer.innerHTML = '<p>No historical results found.</p>';
                }
            });
        });
    }

    if (toggleDebugElementsButton) {
        toggleDebugElementsButton.addEventListener('click', toggleDebugElements);
    }

    function activateContainer(activeContainer) {
        // Deactivate all containers
        [historicalResultsContainer, extractFansCountContainer, highLikesLowFansArticlesContainer].forEach(container => {
            container.classList.remove('active');
            container.style.display = 'none'; // Hide all containers
        });
        // Activate the selected container
        activeContainer.classList.add('active');
        activeContainer.style.display = 'block'; // Show the active container
    }

    function filterHighLikedArticlesAndShowNumbers(articlesData) {
        const likeThreshold = parseInt(likeThresholdInput.value) || 10000; // Default to 10000 if input is invalid

        articlesData.forEach(article => {
            const { likes } = article;
            const likeCount = likes || 0;
            if (likeCount > likeThreshold) {
                // Only push the article if it's not already in high_liked_note
                if (!high_liked_note.some(existingArticle => existingArticle.title === article.title)) {
                    high_liked_note.push(article);
                }
            }
        });

        // Display the number of high liked notes
        const highLikedCount = high_liked_note.length;

        // Reset the resultContainer before appending new content
        resultContainer.innerHTML = ''; 
        // Update the span with the pure number
        resultContainer.textContent = highLikedCount; // Use textContent for safe text insertion
    }

    function displayHighLikesLowFansArticles() {
        activateContainer(highLikesLowFansArticlesContainer);
        highLikesLowFansArticlesContainer.innerHTML = '';
        
        // Sort articles based on fans count
        const sortedArticles = high_liked_note.sort((a, b) => (a.fans || 0) - (b.fans || 0));
        displayArticlesDetails(sortedArticles, highLikesLowFansArticlesContainer);
        console.log('run displayArticlesDetails');

        // Store sorted articles in storage
        chrome.storage.local.set({ sortedArticles: sortedArticles }, function() {
            console.log('Sorted articles stored in storage:', sortedArticles);
        });
    }

    function displayArticlesDetails(articleList, container) {
        console.log('run displayArticlesDetails for container', container);
        // container.innerHTML = ''; // Clear previous content
        articleList.forEach(article => {
            const { author, likes, title, profile, articleLink, fans } = article;
            const likeCount = likes || 'Not found'; // Ensure likeCount is defined
            container.innerHTML += `
                <div style="border: 1px solid #ccc; border-radius: 8px; padding: 10px; margin: 10px 0; background-color: #fff;">
                    <h3 style="margin: 0; color: #ff2e4d;">${title}</h3>
                    <p style="margin: 5px 0;">
                        <strong>博主:</strong> ${author} | 
                        <strong>点赞数:</strong> ${likeCount} | 
                        ${fans ? `<strong>粉丝数:</strong> ${fans} |` : ''} 
                        <a href="${profile}" target="_blank" style="color: #ff2e4d;">个人主页</a> | 
                        <a href="${articleLink}" target="_blank" style="color: #ff2e4d;">笔记原文</a>
                    </p>
                </div>
            `;
        });
    }

    function displayExtractFansCount() {
        return new Promise((resolve) => {
            activateContainer(extractFansCountContainer);
            extractFansCountContainer.innerHTML = ''; // Clear previous results
            const progressBar = document.getElementById('progress'); // Get the progress bar element
            const totalNotes = high_liked_note.length; // Total number of notes
            const articlesToDisplay = []; // Array to hold articles for display

            if (totalNotes > 0) {
                high_liked_note.forEach((note, index) => {
                    const { title, author, likes, profile, articleLink } = note; // Destructure the note object
                    // Fetch the user profile to get the fans count every 10 seconds
                    setTimeout(() => {
                        fetch(profile)
                            .then(response => response.text())
                            .then(data => {
                                const fansCount = extractFansCount(data); // Extract fans count from the profile data

                                // Update high_liked_note with the extracted fans count
                                note.fans = fansCount ? fansCount.join(', ') : 'Not found';
                                articlesToDisplay.unshift(note); // Add the note to the beginning of the array for display
                                
                                // Clear the container and display all retrieved articles with the newest on top
                                extractFansCountContainer.innerHTML = ''; // Clear previous results
                                displayArticlesDetails(articlesToDisplay, extractFansCountContainer); // Show all articles

                                // Update progress bar
                                const progressPercentage = ((index + 1) / totalNotes) * 100; // Calculate progress percentage
                                progressBar.style.width = progressPercentage + '%'; // Update progress bar width

                                // Resolve the promise when all notes have been processed
                                if (index === totalNotes - 1) {
                                    resolve();
                                }
                            })
                            .catch(error => {
                                console.error('Error fetching user profile for fans count:', error);
                                // Resolve even on error to continue the process
                                if (index === totalNotes - 1) {
                                    resolve();
                                }
                            });
                    }, index * 10000); // Delay each fetch by 10 seconds multiplied by the index
                });
            } else {
                extractFansCountContainer.innerHTML = '<p>No user profiles available.</p>';
                resolve(); // Resolve if no profiles are available
            }
        });
    }

    function extractFansCount(content) {
        const fansCountMatches = [];
        const regex = /{[^}]*"type":\s*"fans"[^}]*"count":\s*"(\d+)"[^}]*}|{[^}]*"count":\s*"(\d+)"[^}]*"type":\s*"fans"[^}]*}/g; // Match the dict with "type" as "fans" and capture the count in either order
        let match;

        while ((match = regex.exec(content)) !== null) {
            // Check which capturing group matched and push the count
            const count = match[1] || match[2]; // Get the count from the appropriate group
            fansCountMatches.push(count); // Push the captured count to the array
        }

        return fansCountMatches.length > 0 ? fansCountMatches : null; // Return all counts or null if none found
    }

    const scrollDownButton = document.getElementById('scrollDownButton');
    if (scrollDownButton) {
        scrollDownButton.addEventListener('click', function() {
            console.log('Scroll down button clicked'); // Log when the button is clicked
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const activeTab = tabs[0];
                if (activeTab) {
                    chrome.scripting.executeScript({
                        target: { tabId: activeTab.id },
                        function: () => {
                            window.scrollBy({
                                top: window.innerHeight, // Scroll down by one viewport height
                                behavior: 'smooth' // Smooth scrolling
                            });
                        }
                    });
                }
            });
        });
    }

    const automateButton = document.getElementById('automateButton');
    const scrollTimesInput = document.getElementById('scrollTimesInput');
    let isAutomating = false; // Flag to track automation state
    let automateInterval; // Variable to hold the interval

    if (automateButton) {
        automateButton.addEventListener('click', function() {
            if (isAutomating) {
                // Stop automation
                clearInterval(automateInterval);
                automateButton.textContent = '自动采集'; // Change button text back
                isAutomating = false; // Update the flag
                console.log('Automation stopped'); // Log when automation is stopped

                console.log('Run displayExtractFansCount');
                activateContainer(extractFansCountContainer);
                displayExtractFansCount().then(() => {
                    console.log('Fans Extraction completed in automation');
                    highLikesLowFansButton.click();
                    console.log('Run highLikesLowFansButton completed');
                });
            } else {
                // Start automation
                console.log('Automate button clicked'); // Log when the button is clicked
                const scrollTimes = parseInt(scrollTimesInput.value) || 10; // Default to 10 if input is invalid
                let currentIteration = 0; // Track the current iteration

                automateInterval = setInterval(async () => {
                    if (currentIteration < scrollTimes) {
                        console.log(`Iteration ${currentIteration + 1}`); // Log the current iteration
                        button.click(); // Simulate click on the get content button
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for content to load
                        scrollDownButton.click(); // Simulate click on the scroll down button
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for scrolling to complete
                        currentIteration++; // Increment the iteration count
                    } else {
                        clearInterval(automateInterval); // Stop the interval when done
                        automateButton.textContent = '自动采集'; // Change button text back
                        isAutomating = false; // Update the flag

                        console.log('Run displayExtractFansCount');
                        activateContainer(extractFansCountContainer);
                        displayExtractFansCount().then(() => {
                            console.log('Fans Extraction completed in automation');
                            highLikesLowFansButton.click();
                            console.log('Run highLikesLowFansButton completed');
                        });
                    }
                }, 4000); // Set interval to 4 seconds (2 seconds for loading + 2 seconds for scrolling)

                automateButton.textContent = '停止获取'; // Change button text to "Stop"
                isAutomating = true; // Update the flag
            }
        });
    }
});

function parseContent(content) {
    const noteItems = content.split(/class="note-item"/); // Split by note item
        
    const articlesData = []; // New array to store articles data
        
    noteItems.forEach((note, index) => {
        const authorMatch = /class="name">([^<]+)<\/span>/.exec(note);
        const likeCountMatch = /class="count" selected-disabled-search="">([\d.]+[^\d<]*)<\/span>/.exec(note);
        const titleMatch = /class="title"><span[^>]*>([^<]+)<\/span>/.exec(note);
        const userProfileMatch = /<a data-v-3e97982a="" href="(\/user\/profile\/[^"]+)"/.exec(note);
        const articleLinkMatch = /<a data-v-3e97982a="" href="(\/explore\/[^"]+)"/.exec(note); // Match for article link starting with /explore
            
        const articleData = {
            author: authorMatch ? authorMatch[1].trim() : 'Not found',
            likes: likeCountMatch ? (function() {
                let likeCount = likeCountMatch[1].trim();
                // Check for Chinese characters in the like count
                if (/[\u4e00-\u9fa5]/.test(likeCount)) {
                    likeCount = parseFloat(likeCount) * 10000; // Multiply by 10000 if Chinese characters are present
                }
                return likeCount;
            })() : 'Not found',
            title: titleMatch ? titleMatch[1].trim() : 'Not found',
            profile: userProfileMatch ? `https://www.xiaohongshu.com${userProfileMatch[1].trim()}` : null,
            articleLink: articleLinkMatch ? `https://www.xiaohongshu.com${articleLinkMatch[1]}` : 'Not found'
        };

        articlesData.push(articleData);
    });
    return articlesData; // Return articles data as a list of dicts
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
