"""Generate Anki decks from tokenized lyrics with jamdict definitions."""

import html
import logging
import os
import tempfile

import genanki

from lyrics_tokenizer import extract_lyrics_text, tokenize_lyrics

logger = logging.getLogger(__name__)

# Stable IDs for the model and deck (generated once, hardcoded)
MODEL_ID = 1607392319
DECK_ID = 2059400111

MAX_DEFINITIONS = 5


def _format_jamdict_result(result: dict) -> str:
    """Format jamdict result as HTML for Anki card back."""
    parts = []

    # Word entries (JMdict)
    for entry in result.get('entries', []):
        kanji_texts = [k.get('text', '') for k in entry.get('kanji', []) if k.get('text')]
        kana_texts = [k.get('text', '') for k in entry.get('kana', []) if k.get('text')]
        headword = ' '.join(kanji_texts) if kanji_texts else ' '.join(kana_texts)
        if kana_texts and kanji_texts and kana_texts != kanji_texts:
            headword = f"{' '.join(kanji_texts)} ({' '.join(kana_texts)})"
        elif kana_texts and not kanji_texts:
            headword = ' '.join(kana_texts)

        glosses = []
        for sense in entry.get('senses', []):
            for g in sense.get('SenseGloss', []):
                text = g.get('text', '')
                if text and (not g.get('lang') or g.get('lang') == 'eng'):
                    glosses.append(html.escape(text))
                    if len(glosses) >= MAX_DEFINITIONS:
                        break
            if len(glosses) >= MAX_DEFINITIONS:
                break

        if headword or glosses:
            parts.append(f'<div class="entry"><b>{html.escape(headword)}</b><br>{"; ".join(glosses[:MAX_DEFINITIONS])}</div>')

    # Named entities (JMnedict)
    for entry in result.get('names', []):
        kanji_texts = [k.get('text', '') for k in entry.get('kanji', []) if k.get('text')]
        kana_texts = [k.get('text', '') for k in entry.get('kana', []) if k.get('text')]
        headword = ' '.join(kanji_texts or kana_texts)

        glosses = []
        for sense in entry.get('senses', []):
            for g in sense.get('SenseGloss', []):
                text = g.get('text', '')
                if text:
                    glosses.append(html.escape(text))
                    if len(glosses) >= MAX_DEFINITIONS:
                        break
            if len(glosses) >= MAX_DEFINITIONS:
                break

        if headword or glosses:
            parts.append(f'<div class="entry"><b>{html.escape(headword)}</b> (name)<br>{"; ".join(glosses[:MAX_DEFINITIONS])}</div>')

    # Kanji characters (KANJIDIC)
    for char in result.get('chars', []):
        literal = char.get('literal', '')
        meanings = char.get('meanings', [])[:MAX_DEFINITIONS]
        if literal and meanings:
            parts.append(f'<div class="char"><b>{html.escape(literal)}</b> (kanji): {"; ".join(html.escape(m) for m in meanings)}</div>')

    if not parts:
        return html.escape('No definition found')

    return '<br>'.join(parts)


def _get_anki_model() -> genanki.Model:
    """Return the note model for lyrics vocabulary cards."""
    return genanki.Model(
        MODEL_ID,
        'Lyrics Vocabulary',
        fields=[
            {'name': 'Word'},
            {'name': 'Definition'},
        ],
        templates=[
            {
                'name': 'Card 1',
                'qfmt': '{{Word}}',
                'afmt': '{{FrontSide}}<hr id="answer">{{Definition}}',
            },
        ],
        css='.entry, .char { margin-bottom: 0.5em; }',
    )


def build_anki_deck(
    tokenized_lyrics: list[tuple[str, dict]],
    deck_name: str = 'Lyrics Vocabulary',
) -> bytes:
    """Build an Anki deck from tokenized lyrics. Returns .apkg file bytes."""
    logger.info("build_anki_deck: deck_name=%r cards=%d", deck_name, len(tokenized_lyrics))
    if not tokenized_lyrics:
        raise ValueError('No vocabulary cards could be generated from the lyrics')
    model = _get_anki_model()
    deck = genanki.Deck(DECK_ID, deck_name)

    no_definition = html.escape('No definition found')
    added_cards = 0

    for word, result in tokenized_lyrics:
        definition_html = _format_jamdict_result(result)
        if definition_html == no_definition:
            continue
        note = genanki.Note(
            model=model,
            fields=[html.escape(word), definition_html],
        )
        deck.add_note(note)
        added_cards += 1

    if added_cards == 0:
        logger.warning("build_anki_deck: no definitions for any of %d words", len(tokenized_lyrics))
        raise ValueError('No definitions found for any word in the lyrics')

    package = genanki.Package(deck)
    with tempfile.NamedTemporaryFile(suffix='.apkg', delete=False) as tmp:
        tmp_path = tmp.name
    try:
        package.write_to_file(tmp_path)
        with open(tmp_path, 'rb') as f:
            apkg_bytes = f.read()
        logger.info("build_anki_deck: wrote apkg size=%d", len(apkg_bytes))
        return apkg_bytes
    finally:
        os.unlink(tmp_path)


def build_anki_deck_from_lyrics_data(lyrics_data: dict, deck_name: str | None = None) -> bytes:
    """Build an Anki deck from raw lyrics API data."""
    logger.debug("build_anki_deck_from_lyrics_data: starting")
    lyrics_text = extract_lyrics_text(lyrics_data)
    logger.debug("build_anki_deck_from_lyrics_data: extracted lyrics len=%d", len(lyrics_text))
    tokenized = tokenize_lyrics(lyrics_text)

    track_name = lyrics_data.get('trackName', 'Unknown')
    artist_name = lyrics_data.get('artistName', '')
    name = f'{track_name} - {artist_name}' if artist_name else track_name
    deck_name = deck_name or name

    return build_anki_deck(tokenized, deck_name=deck_name)
