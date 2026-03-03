import logging

from flask import Flask
from flask_cors import CORS

from routes import api_bp

logging.basicConfig(
    level=logging.WARNING,
    format='%(asctime)s %(name)s %(levelname)s %(message)s',
    datefmt='%H:%M:%S',
)

# Enable INFO for our app; third-party libs stay at WARNING
for name in (
    'decorators',
    'routes.lyrics',
    'routes.search',
    'lyrics_tokenizer',
    'anki_deck',
):
    logging.getLogger(name).setLevel(logging.INFO)

app = Flask(__name__)
CORS(app)
app.register_blueprint(api_bp)


if __name__ == '__main__':
    logging.info("Starting utanki backend")
    app.run(debug=True)
