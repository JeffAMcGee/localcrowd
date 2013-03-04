# Settings for this app.

settings = dict(
    http_host = 'localhost',
    http_port = 8000,
    mongo_host = 'localhost',
    mongo_port = 27017,
    mongo_db = 'test',
    debug = True,
)

try:
    # pull in settings_local if it exists
    from settings_local import settings as s
    settings.update(s)
except ImportError:
    pass
