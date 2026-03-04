import pytest
from unittest.mock import patch

from lyrics_anki_builder import (
    FIELD_SENTENCE,
    FIELD_WORD,
    FIELD_WORD_MEANING,
    NoDefinitionsError,
    _format_jamdict_result,
    build_anki_deck_from_notes,
    build_anki_notes_json,
)


def test_format_jamdict_result_returns_definition_for_valid_entry():
    """Valid jamdict entry structure produces a definition, not 'No definition found'."""
    result = {
        'entries': [
            {
                'kanji': [{'text': '花'}],
                'kana': [{'text': 'はな'}],
                'senses': [{'SenseGloss': [{'text': 'flower', 'lang': 'eng'}]}],
            }
        ],
        'names': [],
        'chars': [],
    }
    formatted = _format_jamdict_result(result)
    assert 'No definition found' not in formatted
    assert 'flower' in formatted


def test_format_jamdict_result_limits_to_five_definitions():
    """At most 5 definitions are shown per entry."""
    result = {
        'entries': [
            {
                'kanji': [{'text': '花'}],
                'kana': [{'text': 'はな'}],
                'senses': [
                    {'SenseGloss': [{'text': f'def{i}', 'lang': 'eng'}]}
                    for i in range(8)
                ],
            }
        ],
        'names': [],
        'chars': [],
    }
    formatted = _format_jamdict_result(result)
    assert 'def0' in formatted
    assert 'def4' in formatted
    assert 'def5' not in formatted
    assert 'def7' not in formatted


def test_format_jamdict_result_returns_no_definition_found_for_empty_lookup():
    """Jamdict lookup result with no entries, names, or chars produces 'No definition found'."""
    result = {'entries': [], 'names': [], 'chars': []}
    formatted = _format_jamdict_result(result)
    assert 'No definition found' in formatted


def test_build_anki_deck_from_notes_produces_valid_apkg():
    """Deck built from notes includes card content and is valid .apkg."""
    notes = [
        {
            'fields': {
                FIELD_WORD: '音',
                FIELD_SENTENCE: '音がする',
                FIELD_WORD_MEANING: 'sound',
            }
        },
    ]
    apkg_bytes = build_anki_deck_from_notes(notes, 'Test Deck')
    assert len(apkg_bytes) > 100
    assert b'sound' in apkg_bytes
    assert '音'.encode('utf-8') in apkg_bytes


def test_build_anki_notes_json_raises_when_no_definitions_found():
    """build_anki_notes_json raises when vocabulary words have no jamdict definitions."""
    lyrics_data = {
        'plainLyrics': '花',
        'trackName': 'Test',
        'artistName': 'Artist',
    }
    # extract_vocabulary_from_lyrics returns (word, lookup_result, surface_forms)
    vocabulary_lookups_with_no_definitions = [
        ('花', {'entries': [], 'names': [], 'chars': [], 'found': False}, []),
    ]

    with pytest.raises(NoDefinitionsError, match='No definitions found for any word'):
        with patch(
            'lyrics_anki_builder.extract_vocabulary_from_lyrics',
            return_value=vocabulary_lookups_with_no_definitions,
        ):
            with patch(
                'lyrics_anki_builder.get_sentence_for_word',
                side_effect=lambda word, _text, _forms: word,
            ):
                build_anki_notes_json(lyrics_data)
