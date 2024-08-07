import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

// Define the countElements function
const countElements = async (page) => {
  const elementCounts = await page.evaluate(() => {
    const counts = {
      links: document.querySelectorAll('a').length,
      buttons: document.querySelectorAll('button').length,
      inputs: document.querySelectorAll('input').length,
      paragraphs: document.querySelectorAll('p').length,
      images: document.querySelectorAll('img').length
    };
    return counts;
  });
  return elementCounts;
};

// Define the saveScreenshot function
const saveScreenshot = async (data, filename) => {
  const buffer = Buffer.from(data, 'base64');
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath; // Adjust as necessary to return a URL if using cloud storage
};

(async () => {
  // Launch Puppeteer browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const url = 'https://www.camascope.com/';
  //'https://teststore.automationtesting.co.uk/index.php'; // Replace with your target URL

  await page.goto(url);

  // Extract Page Title
  const pageTitle = await page.title();
  console.log("Page Title:", pageTitle);

  // Extract Interactable Elements
  const interactableElements = await page.evaluate(() => {
    const elements = [];
    document.querySelectorAll('button, a, input, select, textarea').forEach(el => {
      elements.push({
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        type: el.type || null,
        textContent: el.textContent || null
      });
    });
    return elements;
  });
  console.log("Interactable Elements:", interactableElements);

  // Count Elements
  const elementCounts = await countElements(page);
  console.log("Element Counts:", elementCounts);

  // Run Lighthouse
  const { lhr } = await lighthouse(url, {
    port: (new URL(browser.wsEndpoint())).port,
    output: 'json',
    logLevel: 'info',
    chromeFlags: ['--headless']
  }).then(results => results);

  let screenshotData = null;
  if (lhr.audits['final-screenshot']) {
    screenshotData = lhr.audits['final-screenshot'].details.data.split(',')[1]; // Extract base64 data
    await saveScreenshot(screenshotData, 'screenshot.jpg'); // Adjust filename as necessary
  }

  const lighthouseReport = {
    performance: lhr.categories.performance ? lhr.categories.performance.score : null,
    accessibility: lhr.categories.accessibility ? lhr.categories.accessibility.score : null,
    bestPractices: lhr.categories['best-practices'] ? lhr.categories['best-practices'].score : null,
    seo: lhr.categories.seo ? lhr.categories.seo.score : null,
    pwa: lhr.categories.pwa ? lhr.categories.pwa.score : null,
    screenshotData
  };

  console.log("Lighthouse Report:", lighthouseReport);

  // Combine data into JSON
  const scrapedData = {
    pageTitle,
    interactableElements,
    elementCounts,
    additionalData: { example: 'Additional data here' },
    lighthouseReport
  };

  fs.writeFileSync('scrapedData.json', JSON.stringify(scrapedData, null, 2));

  // Create HTML file to view the Base64 image
  if (screenshotData) {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>View Base64 Image</title>
      </head>
      <body>
          <h1>Base64 Encoded Image</h1>
          <img src="data:image/jpeg;base64,${screenshotData}" alt="Base64 Image">
      </body>
      </html>
    `;
    fs.writeFileSync('view_image.html', htmlContent);
  }

  await browser.close();
})();
