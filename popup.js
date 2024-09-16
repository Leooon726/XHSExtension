document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('getContentButton');
    const showAllArticlesButton = document.getElementById('showAllArticlesButton');
    const showHighLikedArticlesButton = document.getElementById('showHighLikedArticlesButton');
    const showExtractFansCountButton = document.getElementById('showExtractFansCountButton');
    const resultContainer = document.getElementById('resultContainer');
    const allArticlesContainer = document.getElementById('all_articles');
    const highLikedArticlesContainer = document.getElementById('high_liked_articles');
    const highLikesLowFansArticlesContainer = document.getElementById('high_likes_low_fans');
    const extractFansCountContainer = document.getElementById('extract_fans_count');
    const highLikesLowFansButton = document.getElementById('highlikeslowfans');
    const maxFansInput = document.getElementById('maxFansInput');

    let articlesData = []; // List of dict to maintain authors, likes, titles, userProfiles, and articleLinks
    let high_liked_note = []; // Declare high_liked_note in a broader scope

    if (button) {
        button.addEventListener('click', function() {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const activeTab = tabs[0];
                if (activeTab) {
                    chrome.runtime.sendMessage({ tabId: activeTab.id });
                    resultContainer.classList.add('active');
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
            filterHighLikedArticlesAndShowNumbers(articlesData);
            // displayResults(articlesData);
        }
    });

    showAllArticlesButton.addEventListener('click', function() {
        resultContainer.classList.remove('active');
        allArticlesContainer.classList.add('active');
        highLikedArticlesContainer.classList.remove('active');
        extractFansCountContainer.style.display = 'none'; // Hide extractFansCountContainer
    });

    showHighLikedArticlesButton.addEventListener('click', function() {
        resultContainer.classList.remove('active');
        allArticlesContainer.classList.remove('active');
        highLikedArticlesContainer.classList.add('active');
        extractFansCountContainer.style.display = 'none'; // Hide extractFansCountContainer
        displayHighLikedArticles();
    });

    showExtractFansCountButton.addEventListener('click', function() {
        resultContainer.classList.remove('active');
        allArticlesContainer.classList.remove('active');
        highLikedArticlesContainer.classList.remove('active');
        extractFansCountContainer.classList.add('active'); // Show extractFansCountContainer
        extractFansCountContainer.style.display = 'block'; // Ensure it's displayed
        displayExtractFansCount();
    });

    if (highLikesLowFansButton) {
        highLikesLowFansButton.addEventListener('click', function() {
            resultContainer.classList.remove('active');
            allArticlesContainer.classList.remove('active');
            highLikedArticlesContainer.classList.remove('active');
            extractFansCountContainer.style.display = 'none'; // Hide extractFansCountContainer
            highLikesLowFansArticlesContainer.classList.add('active'); // Show the high likes low fans container
            displayHighLikesLowFansArticles(); // Call the function to display high liked articles
        });
    }

    function filterHighLikedArticlesAndShowNumbers(articlesData) {
        const likeThreshold = 10000;

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

        // Display the number of high liked notes and total articles
        const highLikedCount = high_liked_note.length;
        const totalArticlesCount = articlesData.length;

        // Reset the resultContainer before appending new content
        resultContainer.innerHTML = ''; 
        resultContainer.innerHTML += `<p>Number of high liked articles: ${highLikedCount}</p>`;
        resultContainer.innerHTML += `<p>Total number of articles: ${totalArticlesCount}</p>`;
    }

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

    function displayHighLikesLowFansArticles() {
        highLikesLowFansArticlesContainer.innerHTML = '';
        let foundArticles = false;

        // Get the max_fans value from the input
        const maxFans = parseInt(maxFansInput.value) || Infinity; // Default to Infinity if not a number

        // Show the total number of high_liked_note in highLikesLowFansArticlesContainer.
        const totalHighLikedCount = high_liked_note.length;
        highLikesLowFansArticlesContainer.innerHTML += `<p>Total number of high liked articles: ${totalHighLikedCount}</p>`;

        high_liked_note.forEach(article => {
            const { author, likes, title, profile, articleLink, fans } = article;
            const likeCount = likes || 'Not found'; // Ensure likeCount is defined

            // Filter articles based on max_fans
            if (likeCount > 0 && (article.fans < maxFans || !article.fans)) { // Check if fans are less than maxFans
                foundArticles = true; // Set foundArticles to true if at least one article is found
                highLikesLowFansArticlesContainer.innerHTML += `<p>Title: ${title}, Author: ${author}, Likes: ${likeCount}, Fans: ${fans || 'Not found'}, Profile: <a href="${profile}" target="_blank">Profile</a>, Article Link: <a href="${articleLink}" target="_blank">article</a></p>`;
            }
        });

        if (!foundArticles) {
            highLikesLowFansArticlesContainer.innerHTML = '<p>No high liked articles found.</p>';
        }
    }

    function displayHighLikedArticles() {
        highLikedArticlesContainer.innerHTML = '';
        let foundArticles = false;
        // Show the total number of high_liked_note in highLikedArticlesContainer.
        const totalHighLikedCount = high_liked_note.length;
        highLikedArticlesContainer.innerHTML += `<p>Total number of high liked articles: ${totalHighLikedCount}</p>`;

        high_liked_note.forEach(article => {
            const { author, likes, title, profile, articleLink } = article;
            const likeCount = likes || 'Not found'; // Ensure likeCount is defined

            if (likeCount > 0) { // Check if there are likes to display
                foundArticles = true; // Set foundArticles to true if at least one article is found
                highLikedArticlesContainer.innerHTML += `<p>Title: ${title}, Author: ${author}, Likes: ${likeCount}, Profile: <a href="${profile}" target="_blank">profile</a>, Article: <a href="${articleLink}" target="_blank">article</a></p>`;
            }
        });

        if (!foundArticles) {
            highLikedArticlesContainer.innerHTML = '<p>No high liked articles found.</p>';
        }
    }

    function displayExtractFansCount() {
        extractFansCountContainer.innerHTML = ''; // Clear previous results
        const progressBar = document.getElementById('progress'); // Get the progress bar element
        const totalNotes = high_liked_note.length; // Total number of notes

        if (totalNotes > 0) {
            high_liked_note.forEach((note, index) => {
                const { title, author, likes, profile, articleLink } = note; // Destructure the note object
                console.log('article', articleLink);
                // Fetch the user profile to get the fans count every 10 seconds
                setTimeout(() => {
                    fetch(profile)
                        .then(response => response.text())
                        .then(data => {
                            const fansCount = extractFansCount(data); // Extract fans count from the profile data

                            // Update high_liked_note with the extracted fans count
                            note.fans = fansCount ? fansCount.join(', ') : 'Not found';

                            // Update progress bar
                            const progressPercentage = ((index + 1) / totalNotes) * 100; // Calculate progress percentage
                            progressBar.style.width = progressPercentage + '%'; // Update progress bar width

                            // Display the information for each user profile
                            extractFansCountContainer.innerHTML += `
                                <div>
                                    <h3>Author: ${author}</h3>
                                    <p>Article Title: ${title}</p>
                                    <p>User Profile: <a href="${profile}" target="_blank">Profile Link</a></p>
                                    <p>Article Link: <a href="${articleLink}" target="_blank">article</a></p>
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