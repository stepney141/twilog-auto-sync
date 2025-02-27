import { executablePath } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import type { Page, ElementHandle } from "puppeteer";

const stealthPlugin = StealthPlugin();
/* ref:
- https://github.com/berstend/puppeteer-extra/issues/668
- https://github.com/berstend/puppeteer-extra/issues/822
*/
stealthPlugin.enabledEvasions.delete("iframe.contentWindow");
stealthPlugin.enabledEvasions.delete("navigator.plugins");
stealthPlugin.enabledEvasions.delete("media.codecs");
puppeteer.use(stealthPlugin);

const USERS = ["ewell660"] as const;
const XPATH = {
  getLatestTweets: '//*[@id="side-update"]/div/div/form/input'
};

const BASE_URL = "https://twilog.togetter.com" as const;

type UserUrl = `${typeof BASE_URL}/${typeof USERS[number]}`;
type FinishedUrl = `${UserUrl}?status=fetchSuccess`;

// see https://github.com/puppeteer/puppeteer/pull/11782
async function $x(page: Page, xpath: string) {
  return await page.$$(`xpath/.${xpath}`);
}

async function updateTwilog(page: Page, user: typeof USERS[number]) {
  const loginButtonEH = await $x(page, XPATH.getLatestTweets);
  
  await Promise.all([
    page.waitForResponse((response) => {
      return (
        response.url().includes(
          `${BASE_URL}/${user}?status=fetchSuccess` satisfies FinishedUrl
        ) === true && response.status() === 200
      );
    }),
    (loginButtonEH[0] as ElementHandle<Element>).click()
  ]);

  console.log(`Successfully updated ${user}'s Twilog.`);
}

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: executablePath(),
      defaultViewport: { width: 1000, height: 1000 },
      args: [
        // '--disable-gpu',
        "--disable-blink-features=AutomationControlled" /* https://github.com/berstend/puppeteer-extra/issues/822 */,
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--no-sandbox",
        "--no-zygote"
        // '--single-process'
      ],
      slowMo: 25,
      headless: true
    });

    for (const user of USERS) {
      const page = await browser.newPage();

      await page.setBypassCSP(true);
      await page.setExtraHTTPHeaders({ "accept-language": "ja-JP" });
      await page.goto(`https://twilog.org/${user}`);

      await updateTwilog(page, user);
    }

    await browser.close();
  } catch (error) {
    console.error(error);
  }
})();
