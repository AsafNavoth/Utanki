import pytest

from anki_deck import (
    NoDefinitionsError,
    _format_jamdict_result,
    build_anki_deck,
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


def test_format_jamdict_result_returns_no_definition_found_for_empty():
    """Empty result produces 'No definition found'."""
    result = {'entries': [], 'names': [], 'chars': []}
    formatted = _format_jamdict_result(result)
    assert 'No definition found' in formatted


def test_build_anki_deck_has_at_least_one_definition():
    """Deck includes only cards that have definitions."""
    tokenized = [
        ('word1', '', {'entries': [], 'names': [], 'chars': []}),
        (
            'word2',
            '音がする',
            {
                'entries': [
                    {
                        'kanji': [{'text': '音'}],
                        'kana': [{'text': 'おと'}],
                        'senses': [{'SenseGloss': [{'text': 'sound', 'lang': 'eng'}]}],
                    }
                ],
                'names': [],
                'chars': [],
            },
        ),
    ]
    apkg_bytes = build_anki_deck(tokenized)
    assert len(apkg_bytes) > 100
    assert b'sound' in apkg_bytes, 'Deck must contain at least one definition'
    assert b'No definition found' not in apkg_bytes


def test_build_anki_deck_raises_when_no_definitions_found():
    """Deck build raises when every card has no definition."""
    tokenized = [
        ('word1', '', {'entries': [], 'names': [], 'chars': []}),
        ('word2', '', {'entries': [], 'names': [], 'chars': []}),
    ]
    with pytest.raises(NoDefinitionsError, match='No definitions found for any word'):
        build_anki_deck(tokenized)
