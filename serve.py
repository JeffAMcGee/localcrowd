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

@bottle.route('/api/clusters')
def clusters():
    return get_or_404('Topic','conv')


@bottle.route('/api/crowd/bulk')
def all_crowds():
    zoom = int(bottle.request.query.zoom)
    crowds_ = _db['Crowd'].find({'zoom':{'$lte':zoom}})
    crowds = [
        (c['_id'],len(c['edges']),round(c['mloc'][0],3),round(c['mloc'][1],3))
        for c in crowds_
    ]
    return dict(crowds=crowds)



@bottle.route('/api/crowd/:crowd_id')
def crowd(crowd_id):
    return get_or_404('Crowd',int(crowd_id))


@bottle.route('/api/crowd/:crowd_id/tweets')
def crowd_tweets(crowd_id):
    page_size = 20
    next = bottle.request.query.next
    query = {'cid':int(crowd_id)}
    if next:
        query['_id'] = {'$gt':int(next)}
    cursor = _db['Tweet'].find(
        query,
        sort=[('_id',1)],
        limit=page_size,
    )
    tweets = [add_id_str(doc) for doc in cursor]
    return dumps(dict(
        tweets = tweets,
        next = str(tweets[-1]['_id']) if len(tweets)==page_size else '',
    ))


@bottle.route('/api/user/:user_id')
def user(user_id):
    doc = get_or_404('User',int(user_id))
    for k in ['rfrds','jfols','jfrds','jats','gnp']:
        del doc[k]
    return dumps(doc)


#############
# helpers

def add_id_str(doc):
    doc['$id_str'] = dumps(doc['_id'])
    return doc


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


def get_or_404(collection,id):
    doc = _db[collection].find_one({'_id':id})
    if not doc:
        bottle.abort(404,'Not Found')
    return doc


if __name__=="__main__":
    cli = pymongo.MongoClient(
        settings['mongo_host'],
        settings['mongo_port'],
    )
    _db = cli[settings['mongo_db']]
    bottle.run(host=settings['http_host'],
               port=settings['http_port'],
               reloader=True)
