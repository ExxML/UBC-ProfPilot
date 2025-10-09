const { getBrowser, createContext, createPage, navigate, safeClose } = require('./browser');
const cheerio = require('cheerio');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // Set this environment variable in .env
});

// Function to summarize all ratings using GPT-4o-mini
async function summarizeRatings(ratings) {
    if (!ratings || ratings.length === 0) {
        return "No ratings available to summarize.";
    }

    // Prepare the ratings data for summarization
    let ratingsText = ratings.map((rating, index) => {
        let ratingText = `Rating ${index + 1}:\n`;
        if (rating.quality) ratingText += `Quality: ${rating.quality}/5\n`;
        if (rating.difficulty) ratingText += `Difficulty: ${rating.difficulty}/5\n`;
        if (rating.wouldTakeAgain) ratingText += `Would Take Again: ${rating.wouldTakeAgain}\n`;
        if (rating.courseCode) ratingText += `Course: ${rating.courseCode}\n`;
        if (rating.gradeReceived) ratingText += `Grade: ${rating.gradeReceived}\n`;
        if (rating.tags && rating.tags.length > 0) ratingText += `Tags: ${rating.tags.join(', ')}\n`;
        if (rating.comment) ratingText += `Comment: ${rating.comment}\n`;
        return ratingText;
    }).join('\n---\n');

    const MAX_INPUT_WORDS = 10000;
    const words = ratingsText.trim().split(/\s+/);
    console.log(`AI summary input length: ${words.length} words`);
    if (words.length > MAX_INPUT_WORDS) {
        ratingsText = words.slice(0, MAX_INPUT_WORDS).join(' ') + '...';
        const truncatedWordCount = ratingsText.split(/\s+/).length;
        console.log(`Truncated input to ${truncatedWordCount} words`);
    }

    try {
        const aiTimerLabel = `AI Summary Generation Time: ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.time(aiTimerLabel);
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful and unbiased assistant that summarizes professor ratings for a student. 
                    Provide a concise summary highlighting the key strengths (if any), weaknesses (if any), and overall patterns in the ratings.
                    Focus on teaching quality, course difficulty, and student experience.
                    Do not write in full sentences, only use point-form.
                    Frequently use quotes from the ratings to support your summary.
                    The summary must not be longer than 300 words.`
                },
                {
                    role: "user",
                    content: `Please summarize these ${ratings.length} professor ratings:\n\n${ratingsText}`
                }
            ],
            max_tokens: 500,
            temperature: 0.5
        });
        
        console.timeEnd(aiTimerLabel);
        console.log(`Input tokens used: ${response.usage.prompt_tokens}`);
        console.log(`Output tokens used: ${response.usage.completion_tokens}`);
        console.log(`Total tokens used: ${response.usage.total_tokens}`);
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error generating summary:', error.message);
        return `Error generating summary: ${error.message}`;
    }
}

async function getProfData(profURL, callback, progressCallback = null) {
    console.log(`Making request to: ${profURL}`);
    const totalTimerLabel = `Total Professor Data Search Time: ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.time(totalTimerLabel);
    let context;
    let page;
    try {
        // Use browser pool
        const browser = await getBrowser();
        
        if (progressCallback) {
            progressCallback('page-load', 30, 'Opening professor page...');
        }
        
        // Start timing
        const ratingTimerLabel = `Rating Load Time: ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.time(ratingTimerLabel);
        
        // Create context with resource blocking and caching
        context = await createContext(browser);
        page = await createPage(context);
        
        await navigate(page, profURL);
        
        if (progressCallback) {
            progressCallback('page-load', 40, 'Page loaded, analyzing ratings...');
        }
        
        // Click "Load More Ratings" button until all ratings are loaded
        // Get total number of ratings from header
        const totalRatings = parseInt(await page.$eval("[class*='TeacherRatingTabs__StyledTab'][class*='selected']", el => el.textContent.match(/\d+/)[0]));
        // Multiply 4 because each rating has 3 more empty ratings. Divide 20 because 20 ratings (5 real ratings + 15 empty ratings) are loaded each time.
        const maxAttempts = Math.ceil(totalRatings * 4 / 20 * 1.5) || 100; // Fallback to 100 if extraction fails
        console.log('Total ratings:', totalRatings);
        
        let loadMoreVisible = true;
        let rawRatingsCount = 0;
        let currentRatingsCount = 0;
        let attemptCount = 0;
        let cachedButtonSelector = null; // Cache the working button selector
        
        console.log('\nStep 1: Starting to load all ratings...');
        
        if (progressCallback) {
            progressCallback('ratings-load', 45, `Loading all ${totalRatings} ratings...`);
        }
        
        // First, try to find and cache the working button selector
        const findButtonSelector = async () => {
            if (cachedButtonSelector) {
                const button = await page.$(cachedButtonSelector);
                if (button) return button;
            }
            
            // Try to find the button using the most common selectors first
            const commonSelectors = [
                'button[class*="loadMore"]',
                'button[class*="LoadMore"]',
                'button[class*="PaginationButton"]',
                'button[class*="Buttons__Button"]',
                'button[class*="pagination"]',
                'button[class*="Pagination"]'
            ];
            
            for (const selector of commonSelectors) {
                try {
                    const button = await page.$(selector);
                    if (button) {
                        cachedButtonSelector = selector;
                        return button;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }
            
            // Fallback to more comprehensive search and coerce to an element handle
            const jsHandle = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(el => 
                    el.textContent && (
                        el.textContent.includes('Load More') ||
                        el.textContent.includes('Show More') ||
                        el.textContent.includes('More')
                    )
                ) || null;
            });
            return jsHandle.asElement();
        };
        
        while (loadMoreVisible && attemptCount < maxAttempts && currentRatingsCount < 95) {
            try {
                // Quick count of current ratings
                rawRatingsCount = await page.$$eval('[class*="Rating-"], [class*="RatingsList"] > div, [class*="Comments"] > div', elements => elements.length);

                currentRatingsCount = Math.floor(rawRatingsCount / 4);
                console.log(`Attempt ${attemptCount}: ${currentRatingsCount} ratings loaded`);  // divide by 4 because each rating has 3 empty elements (for some reason)
                
                if (progressCallback && totalRatings > 0) {
                    const progress = Math.min(45 + (currentRatingsCount / totalRatings) * 35, 80);
                    progressCallback('ratings-load', progress, `Loading ratings: ${currentRatingsCount}/${totalRatings}`);
                }
                
                // Find and click the load more button (get fresh reference each time)
                try {
                    const loadMoreButton = await findButtonSelector();
                    
                    if (loadMoreButton) {
                        // Quick visibility check
                        const isVisible = await page.evaluate(button => {
                            if (!button) return false;
                            const rect = button.getBoundingClientRect();
                            const style = window.getComputedStyle(button);
                            return rect.width > 0 && rect.height > 0 && 
                                   style.display !== 'none' && 
                                   style.visibility !== 'hidden' && 
                                   style.opacity !== '0';
                        }, loadMoreButton);
                        
                        if (isVisible) {
                            // Click the button using page.click to avoid stale element issues
                            await page.evaluate((selector) => {
                                const button = document.querySelector(selector);
                                if (button) button.click();
                            }, cachedButtonSelector || 'button[class*="loadMore"]');
                            attemptCount++;
                            
                            // Quick check if more content is loading
                            try {
                                // Wait for any loading indicators to disappear
                                await page.waitForFunction(
                                    () => {
                                        // Check if there are any loading spinners or indicators
                                        const loadingIndicators = document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="spinner"], [class*="Spinner"]');
                                        return loadingIndicators.length === 0;
                                    },
                                    { timeout: 2000 }
                                );
                                console.log('Load More button clicked')
                            } catch (e) {
                                // If timeout, continue anyway but wait a bit longer in case content is still loading
                                console.log('Load More button clicked but timed out')
                                await new Promise(resolve => setTimeout(resolve, 300));
                            }
                        } else {
                            console.log('Load More button no longer visible');
                            loadMoreVisible = false;
                        }
                    } else {
                        console.log('Load More button not found');
                        loadMoreVisible = false;
                    }
                } catch (clickError) {
                    loadMoreVisible = false;
                    if (clickError.message.includes("Timeout")) {
                        console.log('Load More button timeout reached, stop loading new data');
                        break;
                    } else {
                        console.log('Error clicking Load More button:', clickError.message);
                    }
                }
            } catch (error) {
                console.log('Error while loading more ratings:', error.message);

                // Break out of loop if browser/page/context has been closed
                if (error.message.includes("Target page, context or browser has been closed")) {
                    console.log('Browser/page/context closed, stop loading new data');
                    loadMoreVisible = false;
                    break;
                }

                attemptCount++;
                // More lenient error handling - only stop after many errors
                if (attemptCount > 10 && error.message.includes('click')) {
                    console.log('Multiple click errors occurred, stopping.');
                    loadMoreVisible = false;
                }
            }
        }
        
        if (attemptCount >= maxAttempts) {
            console.log(`Reached maximum attempts (${maxAttempts}), stopping.`);
        }

        if (totalRatings > currentRatingsCount) {
            console.log('WARNING: Not all ratings were successfully loaded')
        }

        console.log(`Finished loading all ratings. Total: ${currentRatingsCount} ratings in ${attemptCount} attempts`);
        
        // Get the page content after all ratings are loaded
        const html = await page.content();
        console.timeEnd(ratingTimerLabel);
            
            // CSS Selector - Using even more generic selectors to improve robustness
            var wouldTakeAgain = "[class*='TeacherFeedback'] div:nth-child(1) [class*='FeedbackNumber']"
            var difficulty = "[class*='TeacherFeedback'] div:nth-child(2) [class*='FeedbackNumber']"
            var overallQuality = "[class*='RatingValue'] [class*='Numerator']"

            // JQuery Function
            const $ = cheerio.load(html); // creates Jquery function to parse through html

            // $(css_selector) ==> Jquery HTML Object for the found html tag
            // Try text() method if html() doesn't work
            let percentage = $(wouldTakeAgain).html() || $(wouldTakeAgain).text();
            percentage = percentage || "N/A";
            
            let difficultyDecimal = $(difficulty).html() || $(difficulty).text();
            difficultyDecimal = difficultyDecimal || "N/A";
            
            let quality = $(overallQuality).html() || $(overallQuality).text();
            quality = quality || "N/A";
            
            // Try one more approach - look for any elements with text that might contain these values
            if (percentage === "N/A") {
                $('[class*="would-take-again"], [class*="WouldTakeAgain"]').each(function() {
                    const text = $(this).text();
                    if (text && text.trim() !== "") {
                        percentage = text;
                        return false; // break the loop
                    }
                });
            }
            
            if (difficultyDecimal === "N/A") {
                $('[class*="difficulty"], [class*="Difficulty"]').each(function() {
                    const text = $(this).text();
                    if (text && text.trim() !== "") {
                        difficultyDecimal = text;
                        return false; // break the loop
                    }
                });
            }
            
            if (quality === "N/A") {
                $('[class*="quality"], [class*="Quality"], [class*="rating"], [class*="Rating"]').each(function() {
                    const text = $(this).text();
                    if (text && text.trim() !== "" && /^\d+(\.\d+)?$/.test(text.trim())) {
                        quality = text;
                        return false; // break the loop
                    }
                });
            }
            
            // Alternative clean function if we're in Node.js environment without document
            const nodeCleanText = (text) => {
                if (!text) return text;
                // Simple HTML entity decoding for common entities
                return text
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/\s+/g, ' ')
                    .trim();
            };
            
            // Use the Node.js version of the clean function since we're in a Node.js environment
            percentage = nodeCleanText(percentage);
            difficultyDecimal = nodeCleanText(difficultyDecimal);
            quality = nodeCleanText(quality);
            
            // Extract ratings
            const ratings = [];
            // Target the rating cards section
            const ratingSelector = "[class*='Rating-'], [class*='RatingsList'] > div, [class*='Comments'] > div";
            
            $(ratingSelector).each(function() {
                const rating = {};
                
                // Extract course code using the specific RateMyProfessors class
                const courseCode = $(this).find("[class*='RatingHeader__StyledClass']").text().trim();
                if (courseCode) {
                    rating.courseCode = courseCode.split(" ")[0];  // Course code is duplicated, only one course code is needed
                }
                
                // Extract quality rating (1-5)
                const qualityRating = $(this).find("[class*='RatingValues'] [class*='Quality'], [class*='ratingValues'] [class*='quality']").text().trim();
                if (qualityRating && /^[1-5](\.\d+)?$/.test(qualityRating)) {
                    rating.quality = parseFloat(qualityRating);
                }
                
                // Extract difficulty rating (1-5)
                const difficultyRating = $(this).find("[class*='RatingValues'] [class*='Difficulty'], [class*='ratingValues'] [class*='difficulty']").text().trim();
                if (difficultyRating && /^[1-5](\.\d+)?$/.test(difficultyRating)) {
                    rating.difficulty = parseFloat(difficultyRating);
                }
                
                // Extract would take again
                const wouldTakeAgain = $(this).find("[class*='MetaItem']:contains('Would Take Again'), [class*='metaItem']:contains('Would Take Again')").text().trim();
                if (wouldTakeAgain) {
                    rating.wouldTakeAgain = wouldTakeAgain.toLowerCase().includes('yes') ? 'yes' : 'no';
                }
                
                // Extract for credit
                const forCredit = $(this).find("[class*='MetaItem']:contains('For Credit'), [class*='metaItem']:contains('For Credit')").text().trim();
                if (forCredit) {
                    rating.forCredit = forCredit.toLowerCase().includes('yes') ? 'yes' : 'no';
                }
                
                // Extract textbook use
                const textbook = $(this).find("[class*='MetaItem']:contains('Textbook'), [class*='metaItem']:contains('Textbook')").text().trim();
                if (textbook) {
                    const textbookLower = textbook.toLowerCase();
                    if (textbookLower.includes('yes')) {
                        rating.textbook = 'yes';
                    } else if (textbookLower.includes('no')) {
                        rating.textbook = 'no';
                    } else if (textbookLower.includes('n/a')) {
                        rating.textbook = 'N/A';
                    }
                }
                
                // Extract attendance
                const attendance = $(this).find("[class*='MetaItem']:contains('Attendance'), [class*='metaItem']:contains('Attendance')").text().trim();
                if (attendance) {
                    rating.mandatoryAttendance = attendance.toLowerCase().includes('mandatory') ? 'yes' : 'no';
                }
                
                // Extract grade
                const grade = $(this).find("[class*='MetaItem']:contains('Grade'), [class*='metaItem']:contains('Grade')").text().trim();
                if (grade) {
                    const gradeMatch = grade.match(/[A-F][+-]?/);
                    if (gradeMatch) {
                        rating.gradeReceived = gradeMatch[0];
                    }
                }
                
                const tags = [];
                $(this).find("[class*='Tag'], [class*='tag']").each(function() {
                    const tag = $(this).text().trim();
                        tags.push(tag);
                });
                tags.shift()  // Remove first element because the first element in tags is a connected string of all the tags
                if (tags.length > 0) {
                    rating.tags = tags;
                }
                
                // Extract comment text
                const commentText = $(this).find("[class*='Comments'], [class*='comments']").text().trim();
                if (commentText) {
                    rating.comment = nodeCleanText(commentText);
                }
                
                // Only add if we have at least some data
                if (Object.keys(rating).length > 0) {
                    ratings.push(rating);
                }
            });
            
            // Generate summary of all ratings using GPT-4o-mini
            console.log('\nStep 2: Generating AI summary of ratings...');
            
            if (progressCallback) {
                progressCallback('ai-summary', 85, 'Generating AI summary...');
            }
            
            const summary = await summarizeRatings(ratings);
            
            if (progressCallback) {
                progressCallback('complete', 100, 'Search complete!');
            }
            
            // Sort ratings by most recent first (assuming they're already in that order from scraping)
            callback({
                percentage: percentage,
                difficulty: difficultyDecimal,
                quality: quality,
                ratings: ratings,
                summary: summary
            });
        console.timeEnd(totalTimerLabel);

    } catch (error) {
        console.error('Error fetching professor data:', error.message);
        
        // Call the callback with an error object
        callback({
            error: error.message,
            status: null
        });
    } finally {
        // Ensure proper context cleanup
        if (context) {
            try {
                // Close all pages first
                const pages = await context.pages();
                await Promise.all(pages.map(page => safeClose(page, 'page')));
                // Then close context
                await safeClose(context, 'context');
            } catch (error) {
                console.warn('Error during context cleanup in prof-data:', error.message);
            }
        }
    }
}

module.exports = getProfData