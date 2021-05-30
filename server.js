const express = require('express');
const bodyparser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: true
  }
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const app = express();

app.use(bodyparser.json());
app.use(cors())

app.get('/', (req, res) => {
  res.send('its working get');
})

app.post('/signin', (req, res) => {
  const {
    email,
    password
  } = req.body;
  if (!email || !password) {
    return res.status(404).json('invalid information')
  }
  db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('ueers')
          .where('email', '=', email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(404).json('unable to get user'))
      } else {
        res.status(404).json('worng credentials')
      }
    })
    .catch(err => res.status(404).json('worng credentials'))
})

app.post('/register', (req, res) => {
  const {
    name,
    email,
    password
  } = req.body;
  if (!name || !email || !password) {
    return res.status(404).json('invalid information')
  }
  const hash = bcrypt.hashSync(password);
  db.transaction(trx => {
      trx.insert({
          hash: hash,
          email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
          return trx('ueers')
            .returning('*')
            .insert({
              email: loginEmail[0],
              name: name,
              joined: new Date()
            })
            .then(user => {
              res.json(user[0]);
            }).catch(err => console.log(err, '******LINE-77*******'))
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(404).json('Unable To Register'))
})



app.get('/profile/:id', (req, res) => {
  const {
    id
  } = req.params;
  db.select('*').from('ueers').where({
      id
    })
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(404).json('Not found')
      }
    })
    .catch(err => res.status(404).json('error gettin user'))
})

app.put('/image', (req, res) => {
  const {
    id
  } = req.body;

  db('ueers').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
      res.json(entries[0]);
    })
    .catch(err => res.status(404).json('Unable To entries'))
})

app.listen(process.env.PORT || 3000, () => {
  console.log('its working listen');
})
