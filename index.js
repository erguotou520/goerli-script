const puppeteer = require('puppeteer');

// 请求一次
async function requestOnce(page) {
  await page.type('#receiver', process.env.WALLET_ADDRESS, 60);
  // 谷歌人机校验
  const frames = await page.frames()
  const frame = frames.find(f => f.name() === 'Goerli Testnet Faucet');
  if (frame) {
    const checkbox = await frame.$('.recaptcha-checkbox');
    await checkbox.click({ delay: 22 });
    // 等待被选中
    await frame.waitForSelector('.recaptcha-checkbox-checked', { timeout: 3000 })
    await page.waitFor(Math.random() * 2000)
    // 点击request按钮
    await page.click('#requestTokens', { delay: 50 })
    await page.waitForSelector('.swal2-container.swal2-shown', { timeout: 3000 })
    // 点击ok
    await page.click('.swal2-confirm', { delay: 32 })
    await page.waitFor(Math.random() * 3239);
  }
}

(async () => {
  try {
    const { WALLET_ADDRESS, MAX_TIMES = 10 } = process.env;
    if (!WALLET_ADDRESS) throw new Error('Environment variables \'WALLET_ADDRESS\' must be set.')
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://goerli-faucet.slock.it/');
    for (let i = 0; i < MAX_TIMES; i++) {
      await requestOnce(page)
    }
    // 关闭
    await browser.close();
  } catch (error) {
    console.error(error)
  }
})();
