document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('getContentButton');
    const showAllArticlesButton = document.getElementById('showAllArticlesButton');
    const showHighLikedArticlesButton = document.getElementById('showHighLikedArticlesButton');
    const resultContainer = document.getElementById('resultContainer');
    const allArticlesContainer = document.getElementById('all_articles');
    const highLikedArticlesContainer = document.getElementById('high_liked_articles');

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
    });

    showHighLikedArticlesButton.addEventListener('click', function() {
        resultContainer.classList.remove('active');
        allArticlesContainer.classList.remove('active');
        highLikedArticlesContainer.classList.add('active');
        displayHighLikedArticles();
    });

    function displayResults(authorsData, likesData, titlesData, userProfilesData, articleLinksData) {
        resultContainer.innerHTML = ''; // Clear previous results
        allArticlesContainer.innerHTML = ''; // Clear previous results in all_articles tab

        authors = authorsData; // Assign to global variable
        likes = likesData; // Assign to global variable
        titles = titlesData; // Assign to global variable
        userProfiles = userProfilesData; // Assign to global variable
        articleLinks = articleLinksData; // Assign to global variable

        authors.forEach((author, index) => {
            const likeCount = likes[index] || 'Not found';
            const title = titles[index] || 'Not found';
            const userProfile = userProfiles[index] ? `https://www.xiaohongshu.com${userProfiles[index]}` : 'Not found';
            const articleLink = articleLinks[index] || 'Not found';

            // Display in resultContainer
            resultContainer.innerHTML += `<p>Title: ${title}, Author: ${author}, Likes: ${likeCount}, Profile: <a href="${userProfile}" target="_blank">${userProfile}</a>, Article: <a href="${articleLink}" target="_blank">${articleLink}</a></p>`;

            // Populate all_articles tab
            allArticlesContainer.innerHTML += `<p>Author: ${author}, Likes: ${likeCount}, Profile: <a href="${userProfile}" target="_blank">${userProfile}</a>, Article: <a href="${articleLink}" target="_blank">${articleLink}</a></p>`;
        });

        if (authors.length === 0) {
            resultContainer.innerHTML += '<p>No authors found.</p>';
            allArticlesContainer.innerHTML += '<p>No authors found.</p>';
        }
    }

    function displayHighLikedArticles() {
        highLikedArticlesContainer.innerHTML = ''; // Clear previous results
        const likeThreshold = 10000;
        let foundArticles = false; // Flag to check if any articles are found

        authors.forEach((author, index) => {
            const likeCount = likes[index] || 0; // Default to 0 if not found
            console.log(`Checking author: ${author}, Likes: ${likeCount}`); // Log author and like count
            if (likeCount > likeThreshold) {
                foundArticles = true; // Set flag to true if an article is found
                const title = titles[index] || 'Not found';
                const userProfile = userProfiles[index] ? `https://www.xiaohongshu.com${userProfiles[index]}` : 'Not found';
                const articleLink = articleLinks[index] || 'Not found';

                highLikedArticlesContainer.innerHTML += `<p>Title: ${title}, Author: ${author}, Likes: ${likeCount}, Profile: <a href="${userProfile}" target="_blank">${userProfile}</a>, Article: <a href="${articleLink}" target="_blank">${articleLink}</a></p>`;
            }
        });

        if (!foundArticles) {
            highLikedArticlesContainer.innerHTML = '<p>No high liked articles found.</p>';
            console.log('No high liked articles found.'); // Log when no articles are found
        } else {
            console.log('High liked articles displayed successfully.'); // Log when articles are displayed
        }
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