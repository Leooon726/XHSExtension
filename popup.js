document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('getContentButton');
    const showAllArticlesButton = document.getElementById('showAllArticlesButton');
    const showHighLikedArticlesButton = document.getElementById('showHighLikedArticlesButton');
    const showUserProfileButton = document.getElementById('showUserProfileButton');
    const resultContainer = document.getElementById('resultContainer');
    const allArticlesContainer = document.getElementById('all_articles');
    const highLikedArticlesContainer = document.getElementById('high_liked_articles');
    const userProfileContainer = document.getElementById('user_profile');

    let authors = [];
    let likes = [];
    let titles = [];
    let userProfiles = [];
    let articleLinks = [];

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
            ({ authors, likes, titles, userProfiles, articleLinks } = parseContent(request.content));
            displayResults(authors, likes, titles, userProfiles, articleLinks);
        }
    });

    showAllArticlesButton.addEventListener('click', function() {
        resultContainer.classList.remove('active');
        allArticlesContainer.classList.add('active');
        highLikedArticlesContainer.classList.remove('active');
        userProfileContainer.classList.remove('active');
    });

    showHighLikedArticlesButton.addEventListener('click', function() {
        resultContainer.classList.remove('active');
        allArticlesContainer.classList.remove('active');
        highLikedArticlesContainer.classList.add('active');
        userProfileContainer.classList.remove('active');
        displayHighLikedArticles();
    });

    showUserProfileButton.addEventListener('click', function() {
        resultContainer.classList.remove('active');
        allArticlesContainer.classList.remove('active');
        highLikedArticlesContainer.classList.remove('active');
        userProfileContainer.classList.add('active');
        displayUserProfile();
    });

    function displayResults(authorsData, likesData, titlesData, userProfilesData, articleLinksData) {
        resultContainer.innerHTML = '';
        allArticlesContainer.innerHTML = '';

        authors = authorsData;
        likes = likesData;
        titles = titlesData;
        userProfiles = userProfilesData;
        articleLinks = articleLinksData;

        authors.forEach((author, index) => {
            const likeCount = likes[index] || 'Not found';
            const title = titles[index] || 'Not found';
            const userProfile = userProfiles[index] ? `https://www.xiaohongshu.com${userProfiles[index]}` : 'Not found';
            const articleLink = articleLinks[index] || 'Not found';

            resultContainer.innerHTML += `<p>Title: ${title}, Author: ${author}, Likes: ${likeCount}, Profile: <a href="${userProfile}" target="_blank">${userProfile}</a>, Article: <a href="${articleLink}" target="_blank">${articleLink}</a></p>`;
            allArticlesContainer.innerHTML += `<p>Author: ${author}, Likes: ${likeCount}, Profile: <a href="${userProfile}" target="_blank">${userProfile}</a>, Article: <a href="${articleLink}" target="_blank">${articleLink}</a></p>`;
        });

        if (authors.length === 0) {
            resultContainer.innerHTML += '<p>No authors found.</p>';
            allArticlesContainer.innerHTML += '<p>No authors found.</p>';
        }
    }

    function displayHighLikedArticles() {
        highLikedArticlesContainer.innerHTML = '';
        const likeThreshold = 10000;
        let foundArticles = false;

        authors.forEach((author, index) => {
            const likeCount = likes[index] || 0;
            if (likeCount > likeThreshold) {
                foundArticles = true;
                const title = titles[index] || 'Not found';
                const userProfile = userProfiles[index] ? `https://www.xiaohongshu.com${userProfiles[index]}` : 'Not found';
                const articleLink = articleLinks[index] || 'Not found';

                highLikedArticlesContainer.innerHTML += `<p>Title: ${title}, Author: ${author}, Likes: ${likeCount}, Profile: <a href="${userProfile}" target="_blank">${userProfile}</a>, Article: <a href="${articleLink}" target="_blank">${articleLink}</a></p>`;
            }
        });

        if (!foundArticles) {
            highLikedArticlesContainer.innerHTML = '<p>No high liked articles found.</p>';
        }
    }

    function displayUserProfile() {
        userProfileContainer.innerHTML = ''; // Clear previous results
        if (userProfiles.length > 0) {
            const firstUserProfile = userProfiles[0]; // Get the first user profile link
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
        
    const authors = [];
    const likes = [];
    const titles = [];
    const userProfiles = [];
    const articleLinks = []; // New array to store article links
        
    noteItems.forEach((note, index) => {
        // console.log(`Parsing Note item ${index}:`, note); // Log the original note item for comparison
        const authorMatch = /class="name">([^<]+)<\/span>/.exec(note);
        const likeCountMatch = /class="count" selected-disabled-search="">([\d.]+[^\d<]*)<\/span>/.exec(note);
        const titleMatch = /class="title"><span[^>]*>([^<]+)<\/span>/.exec(note);
        const userProfileMatch = /<a data-v-3e97982a="" href="(\/user\/profile\/[^"]+)"/.exec(note);
        const articleLinkMatch = /<a data-v-3e97982a="" href="(\/explore\/[^"]+)"/.exec(note); // Match for article link starting with /explore
            
        if (authorMatch) {
            authors.push(authorMatch[1].trim());
            // console.log('Author:', authorMatch[1].trim());
        }
        if (likeCountMatch) {
            let likeCount = likeCountMatch[1].trim();
            // Check for Chinese characters in the like count
            if (/[\u4e00-\u9fa5]/.test(likeCount)) {
                likeCount = parseFloat(likeCount) * 10000; // Multiply by 10000 if Chinese characters are present
            }
            likes.push(likeCount);
            // console.log('Likes:', likeCount);
        }
        if (titleMatch) {
            titles.push(titleMatch[1].trim());
            // console.log('Title:', titleMatch[1].trim());
        }
        if (userProfileMatch) {
            userProfiles.push(userProfileMatch[1].trim());
            // console.log('User Profile:', userProfileMatch[1].trim());
        }
        if (articleLinkMatch) { // Check for article link match
            articleLinks.push(`https://www.xiaohongshu.com${articleLinkMatch[1]}`); // Prepend base URL to article link
            // console.log('Article Link:', `https://www.xiaohongshu.com${articleLinkMatch[1]}`);
        }
    });
    return { authors, likes, titles, userProfiles, articleLinks }; // Return articleLinks as well
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