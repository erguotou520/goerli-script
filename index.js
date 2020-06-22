// 参考自 https://github.com/danielgatis/puppeteer-recaptcha-solver/blob/master/index.js
const puppeteer = require('puppeteer');
// const puppeteer = require('puppeteer-extra')
// const pluginStealth = require('puppeteer-extra-plugin-stealth')
// puppeteer.use(pluginStealth())

// 随机时间
function rdn (min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

// 让鼠标随机移动到某一个点
async function moveMouseTo(page, x1, y1, x2, y2) {
  console.log(x1, x2, y1, y2)
  if (((x2 - x1)**2 + (y2 - y1)**2) < 10) {
    await page.mouse.move(x2, y2)
  } else {
    const targetX = rdn(x1, x2)
    const targetY = rdn(y1, y2)
    await page.waitFor(rdn(200, 300))
    await page.mouse.move(targetX, targetY)
    await moveMouseTo(page, targetX, targetY, x2, y2)
  }
}

// 请求一次
async function requestOnce(page) {
  // 等待recaptcha加载完成
  // await page.waitForFunction(() => {
  //   const iframe = document.querySelector('iframe[src*="api2/anchor"]')
  //   if (!iframe) return false
  //   return !!iframe.contentWindow.document.querySelector('#recaptcha-anchor')
  // })
  await page.waitFor('iframe[src*="api2/anchor"]')
  // 获取主Frame
  const frames = await page.frames()
  // let mainFrame
  // for (const _frame of frames) {
  //   const title = await _frame.title()
  //   if (title === 'Goerli Testnet Faucet') {
  //     mainFrame = _frame
  //     break
  //   }
  // }
  // 子frame
  // let frame = mainFrame.childFrames().find(_frame => _frame.url().match(/anchor.html$/))
  const frame = frames.find(frame => frame.url().includes('api2/anchor'))
  // 谷歌人机校验
  if (frame) {
    // 输入钱包地址
    await page.click('#receiver', { clickCount: 3 })
    await page.type('#receiver', process.env.WALLET_ADDRESS, 60);
    
    // await frame.waitForSelector('.recaptcha-checkbox')
    // await page.waitFor(rdn(1000, 2000))
    const checkbox = await frame.$('#recaptcha-anchor');
    const checkboxPos = await checkbox.boundingBox();
    await moveMouseTo(page, rdn(30, 100), rdn(30, 100), checkboxPos.x, checkboxPos.y);
    await checkbox.click({ delay: rdn(30, 150) });

    // 等待被选中
    await frame.waitForSelector('.recaptcha-checkbox-checked', { timeout: 3000 })
    await page.waitFor(rdn(1500, 2500))
    // 点击request按钮
    await page.click('#requestTokens', { delay: 50 })
    await page.waitForSelector('.swal2-container.swal2-shown', { timeout: 3000 })
    // 点击ok
    await page.click('.swal2-confirm', { delay: 32 })
    await page.waitFor(rdn(3000, 4000));
  }
}

(async () => {
  try {
    const { WALLET_ADDRESS, MAX_TIMES = 10 } = process.env;
    if (!WALLET_ADDRESS) throw new Error('Environment variables \'WALLET_ADDRESS\' must be set.')
    // https://github.com/puppeteer/puppeteer/issues/4053#issuecomment-567621325
    const browser = await puppeteer.launch({
      headless: false,
      args:[
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    const [page] = await browser.pages();
    page.setDefaultTimeout(0);

    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
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
