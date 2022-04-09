// node price_scrape_app.js --url=https://www.amazon.in/Converse-Taylor-Leather-Sneaker-159574C/dp/B096DNG7MJ/ --sendDetailsTo=umar.sid007@gmail.com

let minimist = require('minimist');
const puppeteer = require('puppeteer');
let fs = require('fs');
let args = minimist(process.argv);
const nodemailer = require('nodemailer');
const {
    google
} = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const config = require('./config.js');

const OAuth2_client = new OAuth2(config.clientId, config.clientSecret);
OAuth2_client.setCredentials({
    refresh_token: config.refreshToken
});

function send_mail(product, price, availability, recipient) {
    const accessToken = OAuth2_client.getAccessToken();
    const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: config.user,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            refreshToken: config.refreshToken,
            accessToken: accessToken,
        }
    });
    const mail_options = {
        from: `THE CAYD <${config.user}>`,
        to: recipient,
        subject: 'Price is down now!!!!',
        html: get_html_message(product, price, availability)
    }

    transport.sendMail(mail_options, function (err, result) {
        if (err) {
            console.log('Error : ', err);
        } else {
            console.log('Sucess : ', result);
        }
        transport.close();
    });
}


function get_html_message(product, price, availability) {
    return `<h3> ${price}! is now the current price of your product - ${product}. Hurry up ${availability}</h3> 
    <h2>Buy it here: - ${args.url} </h2>
    `
}


(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });
    const page = await browser.newPage();
    await page.goto(args.url);
    // await page.screenshot({
    //     path: 'example.png'
    // });
    await page.waitFor(3000);

    await page.waitForSelector('#native_dropdown_selected_size_name');
    await page.click('#native_dropdown_selected_size_name');
    await page.waitFor(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');




    await page.waitForSelector('#availability > span');
    const availability = await page.$eval("#availability > span", el => el.textContent.trim());

    await page.waitForSelector('#priceblock_ourprice');
    const curr_price = await page.$eval("#priceblock_ourprice", el => el.textContent.trim());


    await page.waitForSelector('#title');
    const product = await page.$eval("#title", el => el.textContent.trim());




    const IMAGE_SELECTOR = '#landingImage';
    await page.waitForSelector(IMAGE_SELECTOR);
    let imageHref = await page.evaluate((sel) => {
        return document.querySelector(sel).getAttribute('src').replace('/', '');
    }, IMAGE_SELECTOR);


    var viewSource = await page.goto(imageHref);
    fs.writeFile("productLandingImg.png", await viewSource.buffer(), function (err) {
        if (err) {
            return console.log(err);
        } else {
            if (parseFloat(curr_price.replace('₹', '').replace(',', '')) < 4000) {
                send_mail(product, curr_price, availability, args.sendDetailsTo);
            }
        }




    });






    // await browser.close();
})();