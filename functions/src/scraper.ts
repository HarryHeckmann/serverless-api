const puppeteer = require('puppeteer');


export async function scrapePromotions(){
    const url = 'https://www.greenmangaming.com/search/?dlc=Stellaris_4&comingSoon=true&earlyAccess=0&released=true&prePurchased=true&bestSelling=false&pageSize=10';
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url);


    const promotions = await page.evaluate(() => {
        const items = document.querySelectorAll('div.row.search-result');
        console.log(items)
        const results: any = []
        const textContent = (elem: any) => elem ? elem.textContent.trim() : '';
        items.forEach(item => results.push(
            {
                title: textContent(item.querySelector('.prod-name')),
                price: textContent(item.querySelector('.current-price')),
                prevPrice: textContent(item.querySelector('.prev-price')),
                discount: textContent(item.querySelector('div.col-xs-1.hidden-xs.discount p'))
                // imageUrl: item.querySelector('div.media-object.pull-left product-corner-flash img')!.getAttribute('src')!
            }
        ))
        return results;
    })

    await browser.close();
    return promotions;
}



//name = class="prod-name"
//image = class="media-object pull-left"
//current price = class="current-price"
//prev price = class="prev-price"
//discount = class="col-xs-1 hidden-xs discount"

//row = class="row search-result"