#!/usr/bin/env python
import datetime
import json

import bson
import bottle
import pymongo

from settings import settings

_db = None

#############
# Content

@bottle.route('/')
def index():
    return bottle.static_file('index.html', root='static')


@bottle.route('/favicon.ico')
def favicon():
    return bottle.static_file('favicon.ico', root='static')


@bottle.route('/static/<filename:path>')
def server_static(filename):
    return bottle.static_file(filename, root='static')


#############
# API

@bottle.route('/api/tweets')
def tweets():
    last = bottle.request.query.last
    q = {'_id':{'$gt':int(last)}} if last else {}
    docs = list(_db['Tweet'].find(q))
    if docs:
        last = str(max(doc['_id'] for doc in docs))
    return dumps(dict( tweets = docs, last = last ))

#############
# helpers

def dumps(doc):
    class Encoder(json.JSONEncoder):
        def default(self, value, **kwargs):
            if isinstance(value, bson.ObjectId):
                return {"$oid":unicode(value)}
            elif isinstance(value, datetime.datetime):
                return {"$date":int(value.strftime('%s'))}
            else:
                return json.JSONEncoder.default(self, value, **kwargs)
    return json.dumps(doc,cls=Encoder)


if __name__=="__main__":
    cli = pymongo.MongoClient(
        settings['mongo_host'],
        settings['mongo_port'],
    )
    _db = cli[settings['mongo_db']]
    bottle.run(host=settings['http_host'],
               port=settings['http_port'],
               server='flup')
