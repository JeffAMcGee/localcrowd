#!/usr/bin/env python
import json

import bottle
import pymongo

import utils
from settings import settings

_db = None


@bottle.route('/favicon.ico')
def favicon():
    return bottle.static_file('favicon.ico', root='static')


@bottle.route('/static/<filename:path>')
def server_static(filename):
    return bottle.static_file(filename, root='static')


@bottle.route('/api/clusters')
def clusters():
    doc = _db['Topic'].find_one({'_id':'conv'})
    return doc


@bottle.route('/api/crowd/:crowd_id')
def crowd(crowd_id):
    doc = _db['Crowd'].find_one({'_id':int(crowd_id)})
    return doc


@bottle.route('/api/crowd/:crowd_id/tweets')
def crowd_tweets(crowd_id):
    cursor = _db['Tweet'].find(
        {'cid':int(crowd_id)},
        sort=[('_id',1)],
        limit=100,
    )
    return utils.dumps(dict(
        tweets = [utils.add_id_str(doc) for doc in cursor],
        #FIXME: paging
    ))


@bottle.route('/api/user/:user_id')
def user(user_id):
    # FIXME: remove location info
    doc = _db['User'].find_one({'_id':int(user_id)})
    for k in ['rfrds','jfols','jfrds','jats','gnp']:
        del doc[k]
    return utils.dumps(doc)


if __name__=="__main__":
    cli = pymongo.MongoClient(
        settings['mongo_host'],
        settings['mongo_port'],
    )
    _db = cli[settings['mongo_db']]
    bottle.run(host=settings['http_host'],
               port=settings['http_port'],
               reloader=True)
