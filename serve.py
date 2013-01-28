#!/usr/bin/env python
import datetime
import json

import bson
import bottle
import pymongo

import utils
from settings import settings

_db = None

#############
# Content

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
    return utils.get_or_404('Topic','conv')


@bottle.route('/api/crowd/:crowd_id')
def crowd(crowd_id):
    return utils.get_or_404('Crowd',int(crowd_id))


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
    doc = utils.get_or_404('User',int(user_id))
    for k in ['rfrds','jfols','jfrds','jats','gnp']:
        del doc[k]
    return utils.dumps(doc)


#############
# helpers

def add_id_str(doc):
    doc['$id_str'] = dumps(doc['_id'])
    return doc


def dumps(doc):
    class Encoder(json.JSONEncoder):
        def default(self, value, **kwargs):
            #FIXME: handle dbref
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
