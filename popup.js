document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('getContentButton');
    const showAllArticlesButton = document.getElementById('showAllArticlesButton');
    const showHighLikedArticlesButton = document.getElementById('showHighLikedArticlesButton');
    const showUserProfileButton = document.getElementById('showUserProfileButton');
    const showExtractFansCountButton = document.getElementById('showExtractFansCountButton');
    const resultContainer = document.getElementById('resultContainer');
    const allArticlesContainer = document.getElementById('all_articles');
    const highLikedArticlesContainer = document.getElementById('high_liked_articles');
    const userProfileContainer = document.getElementById('user_profile');
    const extractFansCountContainer = document.getElementById('extract_fans_count');

    let articlesData = []; // List of dict to maintain authors, likes, titles, userProfiles, and articleLinks
    let high_liked_note = []; // Declare high_liked_note in a broader scope

    if (button) {
        button.addEventListener('click', function() {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const activeTab = tabs[0];
                if (activeTab) {
                    chrome.runtime.sendMessage({ tabId: activeTab.id });
                    resultContainer.classList.remove('active');
                    allArticlesContainer.classList.add('active');
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
            displayResults(articlesData);
        }
    });

    showAllArticlesButton.addEventListener('click', function() {
        resultContainer.classList.remove('active');
        allArticlesContainer.classList.add('active');
        highLikedArticlesContainer.classList.remove('active');
        userProfileContainer.classList.remove('active');
        extractFansCountContainer.style.display = 'none'; // Hide extractFansCountContainer
    });

    showHighLikedArticlesButton.addEventListener('click', function() {
        resultContainer.classList.remove('active');
        allArticlesContainer.classList.remove('active');
        highLikedArticlesContainer.classList.add('active');
        userProfileContainer.classList.remove('active');
        extractFansCountContainer.style.display = 'none'; // Hide extractFansCountContainer
        displayHighLikedArticles();
    });

    showUserProfileButton.addEventListener('click', function() {
        resultContainer.classList.remove('active');
        allArticlesContainer.classList.remove('active');
        highLikedArticlesContainer.classList.remove('active');
        userProfileContainer.classList.add('active');
        extractFansCountContainer.style.display = 'none'; // Hide extractFansCountContainer
        displayUserProfile();
    });

    showExtractFansCountButton.addEventListener('click', function() {
        resultContainer.classList.remove('active');
        allArticlesContainer.classList.remove('active');
        highLikedArticlesContainer.classList.remove('active');
        userProfileContainer.classList.remove('active');
        extractFansCountContainer.classList.add('active'); // Show extractFansCountContainer
        extractFansCountContainer.style.display = 'block'; // Ensure it's displayed
        displayExtractFansCount();
    });

    function displayResults(articlesData) {
        resultContainer.innerHTML = '';
        allArticlesContainer.innerHTML = '';

        articlesData.forEach(article => {
            const { author, likes, title, profile, articleLink } = article;
            const likeCount = likes || 'Not found';
            const userProfile = profile ? `https://www.xiaohongshu.com${profile}` : 'Not found';

            resultContainer.innerHTML += `<p>Title: ${title}, Author: ${author}, Likes: ${likeCount}, Profile: <a href="${userProfile}" target="_blank">${userProfile}</a>, Article: <a href="${articleLink}" target="_blank">${articleLink}</a></p>`;
            allArticlesContainer.innerHTML += `<p>Author: ${author}, Likes: ${likeCount}, Profile: <a href="${userProfile}" target="_blank">${userProfile}</a>, Article: <a href="${articleLink}" target="_blank">${articleLink}</a></p>`;
        });

        if (articlesData.length === 0) {
            resultContainer.innerHTML += '<p>No authors found.</p>';
            allArticlesContainer.innerHTML += '<p>No authors found.</p>';
        }
    }

    function displayHighLikedArticles() {
        highLikedArticlesContainer.innerHTML = '';
        const likeThreshold = 10000;
        let foundArticles = false;

        articlesData.forEach(article => {
            const { author, likes, title, profile, articleLink } = article;
            console.log(article);
            const likeCount = likes || 0;
            if (likeCount > likeThreshold) {
                foundArticles = true;
                const userProfile = profile ? `https://www.xiaohongshu.com${profile}` : 'Not found';

                // Store the filtered result in the high_liked_note list
                high_liked_note.push({
                    title: title,
                    author: author,
                    likes: likeCount,
                    profile: userProfile,
                    article: articleLink
                });

                highLikedArticlesContainer.innerHTML += `<p>Title: ${title}, Author: ${author}, Likes: ${likeCount}, Profile: <a href="${userProfile}" target="_blank">${userProfile}</a>, Article: <a href="${articleLink}" target="_blank">${articleLink}</a></p>`;
            }
        });

        // Store high_liked_note into storage
        chrome.storage.local.set({ high_liked_note: high_liked_note }, function() {
            console.log('High liked notes. Length:', high_liked_note.length);
            // Print the stored data
            chrome.storage.local.get('high_liked_note', function(data) {
                console.log('Stored high liked notes:', data.high_liked_note);
            });
        });

        if (!foundArticles) {
            highLikedArticlesContainer.innerHTML = '<p>No high liked articles found.</p>';
        }
    }

    function displayUserProfile() {
        userProfileContainer.innerHTML = ''; // Clear previous results
        if (articlesData.length > 0) {
            const firstUserProfile = articlesData[0].profile; // Get the first user profile link
            fetch(`https://www.xiaohongshu.com${firstUserProfile}`)
                .then(response => response.text())
                .then(data => {
                    const fansNearbyContents = extractFansCount(data); // Get all nearby content around "fans"
                    userProfileContainer.innerHTML = `<h2>User Profile Content</h2>`;
                    if (fansNearbyContents) {
                        fansNearbyContents.forEach(content => {
                            userProfileContainer.innerHTML += `<p>Nearby content around "fans": ${escapeHTML(content)}</p>`;
                        });
                    } else {
                        userProfileContainer.innerHTML += `<p>Fans information is not found.</p>`;
                    }
                    userProfileContainer.innerHTML += `<div>${escapeHTML(data)}</div>`;
                })
                .catch(error => {
                    userProfileContainer.innerHTML = '<p>Error fetching user profile content.</p>';
                    console.error('Error fetching user profile:', error);
                });
        } else {
            userProfileContainer.innerHTML = '<p>No user profiles available.</p>';
        }
    }

    function displayExtractFansCount() {
        extractFansCountContainer.innerHTML = ''; // Clear previous results

        if (high_liked_note.length > 0) {
            high_liked_note.forEach((note, index) => {
                const { title, author, likes, profile, article } = note; // Destructure the note object

                // Fetch the user profile to get the fans count every 10 seconds
                setTimeout(() => {
                    fetch(profile)
                        .then(response => response.text())
                        .then(data => {
                            const fansCount = extractFansCount(data); // Extract fans count from the profile data

                            // Update high_liked_note with the extracted fans count
                            note.fans = fansCount ? fansCount.join(', ') : 'Not found';

                            // Display the information for each user profile
                            extractFansCountContainer.innerHTML += `
                                <div>
                                    <h3>Author: ${author}</h3>
                                    <p>Article Title: ${title}</p>
                                    <p>User Profile: <a href="${profile}" target="_blank">Profile Link</a></p>
                                    <p>Article Link: <a href="${article}" target="_blank">${article}</a></p>
                                    <p>Likes: ${likes}</p>
                                    <p>Fans: ${note.fans}</p>
                                </div>
                                <hr>
                            `;
                        })
                        .catch(error => {
                            console.error('Error fetching user profile for fans count:', error);
                        });
                }, index * 10000); // Delay each fetch by 10 seconds multiplied by the index
            });
        } else {
            extractFansCountContainer.innerHTML = '<p>No user profiles available.</p>';
        }
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
            profile: userProfileMatch ? userProfileMatch[1].trim() : null,
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