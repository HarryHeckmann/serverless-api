require('dotenv').config()
const functions = require('firebase-functions')
const admin = require('firebase-admin')


admin.initializeApp(functions.config().firebase)


const db = admin.firestore()
const express = require('express')
const nodemailer = require('nodemailer');
const cors = require('cors')
const {scrapePromotions} = require('./scraper');
const { expressCspHeader, NONE, SELF } = require('express-csp-header');
const api = express()
const {USER, PASS} = process.env

api.use(cors({ origin: true }))

api.use(expressCspHeader({
    directives: {
        'default-src': [NONE],
        // 'script-src': [SELF, INLINE, 'somehost.com'],
        // 'style-src': [SELF, 'mystyles.net'],
        'img-src': [SELF],
        // 'worker-src': [NONE],
        // 'block-all-mixed-content': true
    }
}));

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: USER,
        pass: PASS
    }
});

exports.priceChecker = functions
    .runWith({ timeoutSeconds: 30, memory: "1GB" }) 
    .region('us-central1') 
    .https.onRequest(async (req:any, res:any) => {
        const promotions = await scrapePromotions();
        
        promotions.forEach(async (item:any) => {
            await db.collection('games').doc('stellaris').collection('downloads').doc(item.title).set({
                updated: new Date(),
                price: item.price,
                prevPrice: item.prevPrice,
                discount: item.discount
            })
            
        })

        res.status(200).json(promotions); 

        const listOptions = await '<ul>' + promotions.map((el: any) => {
            const numericDiscount = +el.discount.match(/[1-9]/g).join('')
            if(numericDiscount >= 15){
                return `<li>
                <h3>${el.title}</h3>
                <p>Previous Price was: ${el.prevPrice}, new price is ${el.price}!! That's a discount of <strong>${el.discount}</strong>!!</p>
            </li>`
            }
            else return
        }).join('') + '</ul>'

        const mailOptions = {
            from: 'Web Scraper', // Something like: Jane Doe <janedoe@gmail.com>
            to: await emailList(),
            subject: 'Pricing Update', // email subject
            html: listOptions // email content in HTML
        }

        if(listOptions){
            transporter.sendMail(mailOptions)
        }
    });

const emailList = async () => {
    const usersRef = await db.collection('users');
    const emails = await usersRef.get()
        .then((snapshot:any) => {
            const arrayR = snapshot.docs.map((doc:any) => {
                console.log(doc.data().email)
                return doc.data().email;
            }); 
            return arrayR

        })
        .catch((err:any) => {
            console.log('Error getting documents', err);
        });
    return emails
}




// api.get('/signup', (req:any, res:any) => {
//     res
//       .status(200)
//       .send(`<img src="https://media2.giphy.com/media/xTiTnjHdFRLxamkHcI/source.gif">`)
// })

api.get('/users', async (req:any, res:any) => {
    const users = await emailList()
    res.status(200).json(users)
})  

api.post('/users', async (req:any, res:any) => {
    const {email, name} = req.body

    await db.collection('users').add({
        name: name,
        email: email,
    }).then((snapshot:any) => {
        res.status(200).json(snapshot)
    }).catch((err:any) => {
        console.log(err)
    })
})

api.delete('/users', async (req:any, res:any) => {
    const {email} = req.body

    const docRef = await db.collection('users').where('email', '==', email).get()
    console.log('doc id is:   ',docRef.id)
    // db.collection('users').doc(docRef.id).delete().then(() => res.status(200))
    // .then(() => res.status(200))
})

exports.api = functions.https.onRequest(api)
