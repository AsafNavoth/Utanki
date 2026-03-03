from flask import Blueprint, Response, jsonify, request
import requests
from requests.exceptions import HTTPError

from anki_deck import (
    NoDefinitionsError,
    NoVocabularyCardsError,
    build_anki_deck_from_notes,
    build_anki_notes_json,
    get_anki_model_config,
)
from config import LRCLIB_BASE_URL, MAX_LYRICS_CHARS
from decorators import log_route
from lyrics_tokenizer import JamdictNotAvailableError, extract_lyrics_text

lyrics_bp = Blueprint('lyrics', __name__)


def _validate_lyrics_request(lyrics_data):
    """Validate lyrics request body. Returns (response, status) if invalid, else None."""
    if not lyrics_data:
        return jsonify({'error': 'Request body must contain lyrics data'}), 400
    lyrics_text = extract_lyrics_text(lyrics_data)
    if len(lyrics_text) > MAX_LYRICS_CHARS:
        return (
            jsonify(
                {
                    'error': f'Lyrics text is too long. Max {MAX_LYRICS_CHARS} characters.'
                }
            ),
            413,
        )
    return None


def _handle_anki_errors(exception):
    """Handle JamdictNotAvailableError, NoVocabularyCardsError, NoDefinitionsError. Returns (response, status) or None."""
    if isinstance(exception, JamdictNotAvailableError):
        return jsonify({'error': str(exception)}), 503
    if isinstance(exception, (NoVocabularyCardsError, NoDefinitionsError)):
        return jsonify({'error': str(exception)}), 422
    return None


@lyrics_bp.route('/lyrics/<int:lyrics_id>')
def get_lyrics(lyrics_id):
    lrclib_response = requests.get(
        f'{LRCLIB_BASE_URL}/api/get/{lyrics_id}',
        timeout=10,
    )

    try:
        lrclib_response.raise_for_status()
    except HTTPError:
        return jsonify(lrclib_response.json()), lrclib_response.status_code

    data = lrclib_response.json()
    return jsonify(data)


@lyrics_bp.route('/lyrics/anki/deck', methods=['POST'])
@log_route
def export_anki_deck():
    """Build an Anki deck (.apkg) from a list of notes.
    Accepts { deckName, modelName, notes: [{ fields: { Word, Sentence, Word Meaning } }] }.
    """
    data = request.get_json()
    if not data or not isinstance(data, dict):
        return (
            jsonify(
                {'error': 'Request body must contain deckName, modelName, and notes'}
            ),
            400,
        )
    deck_name = data.get('deckName') or data.get('deck')
    notes = data.get('notes')
    if not deck_name:
        return jsonify({'error': 'deckName is required'}), 400
    if not notes or not isinstance(notes, list):
        return jsonify({'error': 'notes must be a non-empty array'}), 400

    try:
        apkg_bytes = build_anki_deck_from_notes(notes, deck_name)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422

    return Response(
        apkg_bytes,
        mimetype='application/octet-stream',
        headers={'Content-Disposition': 'attachment; filename="utanki.apkg"'},
    )


@lyrics_bp.route('/lyrics/anki/model-config')
def get_anki_model_config_route():
    """Return Anki model config (modelName, fields, templates, css). Single source of truth."""
    return jsonify(get_anki_model_config())


@lyrics_bp.route('/lyrics/anki/notes', methods=['POST'])
@log_route
def export_anki_notes():
    """Export lyrics vocabulary as JSON for AnkiConnect.
    Accepts lyrics data (plainLyrics/syncedLyrics, trackName, artistName).
    Returns deckName, modelName, and notes with Word, Sentence, Word Meaning fields."""
    lyrics_data = request.get_json()
    if invalid := _validate_lyrics_request(lyrics_data):
        return invalid

    try:
        result = build_anki_notes_json(lyrics_data)
        return jsonify(result)
    except (JamdictNotAvailableError, NoVocabularyCardsError, NoDefinitionsError) as e:
        if error_response := _handle_anki_errors(e):
            return error_response
        raise
