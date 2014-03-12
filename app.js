var fs       = require('fs'),
    express  =  require('express'),
    jade     =  require('jade'),
    stylus   =  require('stylus'),
    mongodb  =  require('mongodb');

db = null;
mongodb
  .MongoClient
  .connect('mongodb://localhost:27017/fringe', function(err, _db) {
    if (err) console.error('Failed to connect to db')
    else {
      console.log('Connected to db!');
      db = _db;
      initDb();
    }
});

function createCollection(name) {
  db.createCollection(name, function(err, collection) {
    if (!err) console.log('Created collection ' + name + '!');
    else console.log('Failed to create collection ' + name + '!');
  });
}

function initDb() {
  createCollection('infected');
  createCollection('vaccinated');
}

app = express();
app.use(express.logger('dev'));
app.use(express.static(__dirname + '/public'));

app.get('/page', function(req,res) {
  var src = fs.readFileSync('./page.jade', 'utf8')
  res.send(jade.compile(src)());
});

app.get('/styles', function(req,res) {
  res.setHeader('ContentType', 'test/stylesheets');
  var src = fs.readFileSync('./styles.styl', 'utf8')
  res.send(stylus.render(src));
});

function genTapper(cname) {
  return (function(req, res) {
    console.log('Tapping collection ' + cname);
    db.collection(cname, function(err, collection) {
      if (err) return console.err('Failed to access collection ' + cname + '!');
      else {
        collection.insert({time: new Date()}, function(err, user) {
          console.log('Attempted insertion');
          if (err) console.err('Failed to insert into ' + cname + '!');
          else {
            collection.count(function (err, count) {
              if (err) console.error('Failed to gather count');
              else {
                res.send({count: count});
              }
            });
          }
        })
      }
    });
  });
}

function genCount(cname) {
  return (function(req, res) {
    db.collection(cname, function(err, collection) {
      collection.count(function(err, count) {
        res.send({count: count});
      });
    });
  });
}

function genIndexer(cname) {
  return (function(req, res) {
    db.collection(cname, function(err, collection) {
      if (err) console.error('Failed to access collection ' + cname + '!');
      else {
        collection.find({}, function(err, cursor) {
          if (err)
            console.error('Failed to fetch elements from collection ' + cname + '!');
          else {
            cursor.toArray(function(err, elems) {
              resObj = {}
              resObj[cname] = elems;
              res.send(resObj);
            });
          }
        })
      }
    });
  });
}

app.post('/infect', genTapper('infected'));
app.post('/vaccinate', genTapper('vaccinated'));

app.get('/count/infected', genCount('infected'));
app.get('/count/vaccinated', genCount('vaccinated'));

app.get('/infected', genIndexer('infected'));
app.get('/vaccinated', genIndexer('vaccinated'));

app.delete('/reset', function(req, res) {
  ['infected', 'vaccinated'].map(function(cname) {
    db.collection(cname, function(err, collection) {
      collection.remove({}, function(err, removed) {
        if (err) console.error('Failed to clean collection ' + cname + '!');
        else {
          console.log('Wiped ' + cname + '!');
          res.send(200);
        }
      });
    });
  });
});


PORT = 3000;
app.listen(PORT, function(err) {
  if (!err) console.log('Listening on port ' + PORT);
  else {
    console.log('Failed to start server');
  }
});

