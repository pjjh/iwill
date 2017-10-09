// --------------------------------- 80chars ---------------------------------->

import express from 'express'
import expressHandlebars from 'express-handlebars'

import chrono from 'chrono-node' // Sugar.js parses some things better
import moment from 'moment'
import sassMiddleware from 'node-sass-middleware'

import { Promise, sequelize } from './models/promise.js'

import { users, promises } from './data/seed.js'

import computeCredit from './lib/latepenalty.js'
import parsePromise from './lib/parse.js'

import handlePromiseRequest from './lib/middleware.js'

import './lib/handlebars.js'

let app = express()

app.use(sassMiddleware({
  src: __dirname + '/public',
  dest: '/tmp',
  // debug: true,
  force: true,
  //outputStyle: 'compressed',
}))

app.use(express.static('public'))
app.use(express.static('tmp'))

app.engine('handlebars', expressHandlebars({defaultLayout: 'main'}))
app.set('view engine', 'handlebars')

app.listen(process.env.PORT)

// Routes

app.get([ // Home
  '/?',
  '/promises.to/?',
  '/commits.to/?'
], (req, resp) => {
    Promise.findAll({
      order: sequelize.literal('tini DESC'),
      //limit: 30 show them all for now
    }).then(function(promises) {
      resp.render('home', {
        promises
      })
    })
})

app.get('/sign-up', (req, resp) => { resp.render('signup') })

// if a user visits bob.promises.to (or iwill.glitch.me/bob.promises.to) then
// render the home view, but with only that user's promises
app.get('/:user.([promises|commits]+\.to+)', (req,resp) => {
  var dbPromises = {}
  Promise.findAll({
   where: {
     user: req.params.user
   },
  }).then(function(promises) {
    resp.render('user', { 
      promises,
      user: req.params.user
    })
  })
})

// we want any actionable route to be handled by the middleware and for now we 
// probably don't want to let anyone just create promises with domains that 
// don't exist

// FIXME handle domain agnosticism
app.get('/:user.([promises|commits]+\.to+)/:promise?/:modifier?/:date*?', 
        handlePromiseRequest)


// Actions

// FIXME refactor/secure this
app.get('/promises/remove/:id', (req, resp) => {
  console.log('remove', req.params);
  Promise.destroy({
   where: {
     id: req.params.id
   }
  })
  .then(function(deletedRows){
    console.log('promise removed', deletedRows);
    resp.redirect('/')
  })
})

app.get('/promises/create/:urtx(*)', (req, resp) => {
  console.log('create', req.params)
  Promise.create(parsePromise(req.params.urtx))
  .then(function(deletedRows){
    console.log('promise removed', deletedRows);
    resp.redirect(`/${req.params.urtx}`);
  })
})

// Endpoints

app.get('/promise/:udp/:urtx', function(req, resp) {
  let urtx = req.originalUrl.substr(9)
  Promise.findOne({ where: {urtx}})
    .then(function(promise) {
      console.log('single promise', urtx, promise)
    // resp.write(promise)
    resp.json(promise)
  })

})

app.get('/promises', function(req, resp) {
  var dbPromises = {}
  Promise.findAll({
    order: sequelize.literal('tini DESC')
  }).then(function(promises) {
    // console.log('all promises', promises)
    // create nested array of promises by user:
    promises.forEach(function(promise) { 
      dbPromises[promise.user] = dbPromises[promise.user] || []
      dbPromises[promise.user].push(promise)
    });
    resp.json(dbPromises);
  })
})

app.get('/promises/:user', function(req, resp) {
  var dbPromises = {};
  Promise.findAll({
   where: {
     user: req.params.user
   },
  }).then(function(promises) {
    console.log('user promises', promises);
    promises.forEach(function(promise) {
      dbPromises[promise.user] = dbPromises[promise.user] || []
      dbPromises[promise.user].push(promise)
    })
    resp.json(dbPromises)
  })
})


// Utils

app.get('/reset', (req, resp) => {
  setup()
  resp.redirect('/')
})

// removes all entries from the promises table
app.get('/clear', (req, resp) => {
  Promise.destroy({where: {}})
  resp.redirect('/')
})

// utility to populate table with hardcoded promises above
function setup() { 
  Promise.sync({force: true}) // 'force: true' just drops the table if it exists
    .then(function(){         // and creates a new one!
      // Add the default promises to the database
      for (var i = 0; i < promises.length; i++) {
        Promise.create(parsePromise(promises[i]))
      }
    })
}

/*
Little picture: Why does this error handling code not run when I surf to 
a bad URL like iwill.glitch.me/foo%bar

Bigger picture: We're making an app that needs to process any URL the user may 
throw at it. We need the server to get the exact URL the way the user sees it in
the browser. That's going to be especially tricky for things like '#' characters
but right now I'm just trying to figure out the case of arbitrary '%' characters
that may not correspond to proper %-encodings.

I'm thinking like a catchall error-handling route that no matter what weird
encoding or whatever error is thrown I can still have the code here do something
with the URL as the user typed it.

For now we're just dropping all this and having the app give the user an error
if there are any weird characters in the URL.

app.use(function(req, resp, next) {
  var err = null
  try {
    console.log("TRYING", req.path, req.url)
    decodeURIComponent(req.path)
  } catch(e) {
    err = e
  }
  if (err) {
    console.log("CAUGHT ERR:", err, req.url)
    return resp.redirect('/')
  }
  next();

  //console.log("DEBUG USE1:", req.originalUrl)
  //resp.redirect('/')
})
*/

/* 
let test
//test = chrono.parseDate("foo the bar by sep 15th noon")
test = chrono.parseDate("Call_the_dentist by 2017-10-15 12pm")
console.log(`DEBUG: ${test} (unixtime = ${test.getTime()/1000}`)
console.log("DEBUG: ", JSON.stringify(parsePromise(promises[2])))
*/

// --------------------------------- 80chars ---------------------------------->