import datetime
import json
import pymongo

import bson


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


def grab_doc(collection, _id):
    # FIXME: how do we want to handle ambiguous cases?
    if len(_id)==24:
        try:
            return collection.find_one(bson.ObjectId(_id))
        except pymongo.errors.InvalidId:
            pass
    try:
        return collection.find_one(int(_id))
    except ValueError:
        return collection.find_one(_id)


