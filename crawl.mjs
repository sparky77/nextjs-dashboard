import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert __dirname to work with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const visitedUrls = new Set();
const maxDepth = 3;

async function crawl(url, depth) {
  if (depth > maxDepth || visitedUrls.has(url)) return;
  visitedUrls.add(url);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const pageTitle = await page.title();
  console.log(`Crawled: ${url} - Title: ${pageTitle} - Depth: ${depth}`);

  // Extract links
  const links = await page.$$eval('a', anchors => anchors.map(a => a.href));

  await browser.close();

  // Save the results
  fs.appendFileSync(path.join(__dirname, 'crawled_pages.txt'), `URL: ${url}, Title: ${pageTitle}, Crawled: ${visitedUrls.has(url)}\n`);

  // Recursively crawl the extracted links
  for (const link of links) {
    if (link.startsWith('http')) {
      await crawl(link, depth + 1);
    }
  }
}

crawl('https://teststore.automationtesting.co.uk/index.php', 0);
