#!/usr/bin/env python
from __future__ import division

import datetime
import json

import bson
import bottle
import pymongo

from settings import settings

_db = None

#############
# Content

@bottle.route('/localcrowd/')
def index():
    return bottle.static_file('index.html', root='static')


@bottle.route('/localcrowd/favicon.ico')
def favicon():
    return bottle.static_file('favicon.ico', root='static')


@bottle.route('/localcrowd/static/<filename:path>')
def server_static(filename):
    return bottle.static_file(filename, root='static')


#############
# API

@bottle.route('/localcrowd/api/clusters')
def clusters():
    return get_or_404('Topic','conv')


def _red_vs_blue(crowd):
    total = sum(crowd['tpcs'].itervalues())
    if not total:
        return .5
    return crowd['tpcs'].get('red',0)/total


@bottle.route('/localcrowd/api/crowd/bulk')
def all_crowds():
    zoom = int(bottle.request.query.zoom)
    query = {'zoom':{'$lte':zoom}}
    onlysmall = parse_bool(bottle.request.query.onlysmall)
    if onlysmall and zoom:
        query['zoom']['$gte'] = 1

    bounds = bottle.request.query.bounds
    if bounds:
        degs = [float(deg) for deg in bounds.split(',')]
        query['mloc'] = { "$within": { "$box": [degs[:2], degs[2:]]}}
    crowds_ = _db['Crowd'].find(query)
    crowds = [
        (
            c['_id'],
            len(c['edges']),
            round(c['mloc'][0],4),
            round(c['mloc'][1],4),
            round(_red_vs_blue(c),3),
        )
        for c in crowds_
    ]
    return dict(crowds=crowds)



@bottle.route('/localcrowd/api/crowd/:crowd_id')
def crowd(crowd_id):
    return get_or_404('Crowd',int(crowd_id))


@bottle.route('/localcrowd/api/crowd/:crowd_id/tweets')
def crowd_tweets(crowd_id):
    page_size = 15
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


@bottle.route('/localcrowd/api/user/:user_id')
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


def parse_bool(bstr):
    return bstr.lower() in ['t','true','1']


if __name__=="__main__":
    cli = pymongo.MongoClient(
        settings['mongo_host'],
        settings['mongo_port'],
    )
    _db = cli[settings['mongo_db']]

    if settings.get('debug'):
        kwargs = dict(reloader=True)
    else:
        kwargs = dict(server='flup')

    bottle.run(host=settings['http_host'],
               port=settings['http_port'],
               **kwargs)
