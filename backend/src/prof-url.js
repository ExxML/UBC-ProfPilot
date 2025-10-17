const cheerio = require("cheerio");

// Add headers to mimic a real browser request
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
  Referer: "https://www.ratemyprofessors.com/",
};

function searchForProf(
  fname,
  lname,
  university,
  callback,
  progressCallback = null,
) {
  console.log(`\nSearching for professor: ${fname} ${lname} at ${university}`);

  fname = fname.toLowerCase().trim(); // trimming for no extra characters
  lname = lname.toLowerCase().trim();
  university = university.toLowerCase().trim();

  const searchURL = `https://www.ratemyprofessors.com/search/professors?q=${encodeURIComponent(fname + " " + lname)}`;
  console.log(`Fetching URL: ${searchURL}`);

  if (progressCallback) {
    progressCallback("url-search", 15, "Contacting RateMyProfessors...");
  }

  fetch(searchURL, {
      headers: headers,
    })
    .then(async function (response) {
      // callback function
      if (response.status === 200) {
        const html = await response.text();
        console.log("Received response from RateMyProfessors");

        if (progressCallback) {
          progressCallback("url-search", 20, "Processing search results...");
        }

        // Save the HTML for debugging
        // require('fs').writeFileSync('rmp_debug.html', html);

        const $ = cheerio.load(html);
        // Updated selector based on current RMP page structure
        const liSelector = "a.TeacherCard__StyledTeacherCard-syjs0d-0";
        const cards = $(liSelector);

        console.log(`Found ${cards.length} professor cards`);

        let found = false;

        // Process each professor card
        $(liSelector).each(function (index) {
          if (found) return; // Skip if we already found a match

          const card = $(this);
          const nameElement = card.find(
            "div.CardName__StyledCardName-sc-1gyrgim-0",
          );
          const name = nameElement.text().trim().toLowerCase();

          // Get the department information
          const departmentElement = card.find(
            "div.CardSchool__Department-sc-19lmz2k-0",
          );
          const departmentText = departmentElement.text().toLowerCase();

          // Get the university information
          const universityElement = card.find(
            "div.CardSchool__School-sc-19lmz2k-1",
          );
          const universityText = universityElement.text().toLowerCase();

          const profPath = card.attr("href");

          console.log(`Checking professor: ${name} at ${universityText}`);

          // Check if this professor matches our search
          const nameParts = name.split(" ");
          const lastName = nameParts[0];
          const firstName = nameParts.slice(1).join(" ");

          // Check if the professor's name and university/department match
          if (
            (fname === firstName || name.includes(fname)) &&
            (lname === lastName || name.includes(lname)) &&
            (universityText.includes(university) ||
              departmentText.includes(university))
          ) {
            const profURL = `https://www.ratemyprofessors.com${profPath}`;
            console.log(
              `Found matching professor: ${name} at ${universityText}`,
            );
            console.log(`Profile URL: ${profURL}`);

            found = true;
            callback({
              URL: profURL,
              fname: firstName,
              lname: lastName,
              university: universityText.trim(),
            });
          }
        });

        if (!found) {
          console.log("No matching professor found");
          callback({
            error: "No matching professor found",
            details: "Could not find a professor matching the search criteria",
          });
        }
      }
    })
    .catch(function (error) {
      console.error("Error in searchForProf:", error.message);
      
      // Check if error has response status (fetch errors don't have response property)
      const status = error.status || null;
      
      if (status === 403 || status === 429) {
        console.error(
          "You have been blocked by RateMyProfessors. Try the following:",
        );
        console.error("1. Wait for some time before making more requests");
        console.error("2. Use a proxy or VPN");
        console.error(
          "3. Check if you need to solve a CAPTCHA by visiting the site in your browser",
        );
      }

      callback({
        error: "Error fetching professor data",
        details: error.message,
        status: status,
      });
    });
}

module.exports = searchForProf;
