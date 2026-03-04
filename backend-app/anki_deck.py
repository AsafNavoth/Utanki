"""Generate Anki decks from tokenized lyrics with jamdict definitions."""

import html
import os
import random
import tempfile

import genanki

from lyrics_tokenizer import (
    extract_lyrics_text,
    get_sentence_for_word,
    tokenize_lyrics,
)

# Stable IDs for the model and deck
MODEL_ID = 1607392319
DECK_ID = 2059400111

MAX_DEFINITIONS = 5

# Model/field names for Anki cards
ANKI_MODEL_NAME = "Lyrics Vocabulary"
FIELD_WORD = "Word"
FIELD_SENTENCE = "Sentence"
FIELD_WORD_MEANING = "Word Meaning"

# Error messages
ERROR_NO_VOCABULARY_CARDS = "No vocabulary cards could be generated from the lyrics"
ERROR_NO_DEFINITIONS = "No definitions found for any word in the lyrics"
NO_DEFINITION_FOUND = "No definition found"


class NoVocabularyCardsError(Exception):
    """Raised when lyrics yield no tokenizable vocabulary."""

    def __init__(self, message: str = ERROR_NO_VOCABULARY_CARDS):
        super().__init__(message)


class NoDefinitionsError(Exception):
    """Raised when tokenized words have no jamdict definitions."""

    def __init__(self, message: str = ERROR_NO_DEFINITIONS):
        super().__init__(message)


def _extract_kanji_kana_texts(entry: dict) -> tuple[list[str], list[str]]:
    """Extract kanji and kana text lists from a JMdict/JMnedict entry."""
    kanji_texts = [
        item.get("text", "") for item in entry.get("kanji", []) if item.get("text")
    ]
    kana_texts = [
        item.get("text", "") for item in entry.get("kana", []) if item.get("text")
    ]
    return kanji_texts, kana_texts


def _format_headword_jmdict(kanji_texts: list[str], kana_texts: list[str]) -> str:
    """Format headword for JMdict: kanji, or kanji (kana), or kana-only."""
    headword = " ".join(kanji_texts) if kanji_texts else " ".join(kana_texts)
    if kana_texts and kanji_texts and kana_texts != kanji_texts:
        headword = f"{' '.join(kanji_texts)} ({' '.join(kana_texts)})"
    elif kana_texts and not kanji_texts:
        headword = " ".join(kana_texts)
    return headword


def _format_headword_jmnedict(kanji_texts: list[str], kana_texts: list[str]) -> str:
    """Format headword for JMnedict: kanji or kana form."""
    return " ".join(kanji_texts or kana_texts)


def _extract_glosses(entry: dict, english_only: bool = True) -> list[str]:
    """Extract gloss strings from entry senses, up to MAX_DEFINITIONS."""
    glosses = []
    for sense in entry.get("senses", []):
        for gloss in sense.get("SenseGloss", []):
            text = gloss.get("text", "")
            if text and (
                not english_only or not gloss.get("lang") or gloss.get("lang") == "eng"
            ):
                glosses.append(html.escape(text))
                if len(glosses) >= MAX_DEFINITIONS:
                    break
        if len(glosses) >= MAX_DEFINITIONS:
            break
    return glosses


def _format_entry_div(headword: str, glosses: list[str], suffix: str = "") -> str:
    """Format headword and glosses as HTML div. suffix e.g. ' (name)' for JMnedict."""
    return f'<div class="entry"><b>{html.escape(headword)}</b>{suffix}<br>{"; ".join(glosses[:MAX_DEFINITIONS])}</div>'


def _format_jamdict_result(result: dict) -> str:
    """Format jamdict result as HTML for Anki card back."""
    parts = []

    # Word entries (JMdict)
    for entry in result.get("entries", []):
        kanji_texts, kana_texts = _extract_kanji_kana_texts(entry)
        headword = _format_headword_jmdict(kanji_texts, kana_texts)
        glosses = _extract_glosses(entry, english_only=True)
        if headword or glosses:
            parts.append(_format_entry_div(headword, glosses))

    # Named entities (JMnedict)
    for entry in result.get("names", []):
        kanji_texts, kana_texts = _extract_kanji_kana_texts(entry)
        headword = _format_headword_jmnedict(kanji_texts, kana_texts)
        glosses = _extract_glosses(entry, english_only=False)
        if headword or glosses:
            parts.append(_format_entry_div(headword, glosses, suffix=" (name)"))

    # Kanji characters (KANJIDIC)
    for char in result.get("chars", []):
        literal = char.get("literal", "")
        meanings = char.get("meanings", [])[:MAX_DEFINITIONS]
        if literal and meanings:
            parts.append(
                f'<div class="char"><b>{html.escape(literal)}</b> (kanji): {"; ".join(html.escape(meaning) for meaning in meanings)}</div>'
            )

    if not parts:
        return html.escape(NO_DEFINITION_FOUND)

    return "<br>".join(parts)


CARD_CSS = """.card {
 font-family: "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", "Noto Sans JP", "Noto Sans CJK JP", Osaka, "メイリオ", Meiryo, "ＭＳ Ｐゴシック", "MS PGothic", "MS UI Gothic", sans-serif;
 font-size: 44px;
 text-align: center;
}
.entry, .char { margin-bottom: 0.5em; }"""

FRONT_TEMPLATE = """<div lang="ja">
{{Word}}
<div style='font-size: 20px;'>{{Sentence}}</div>
</div>"""

BACK_TEMPLATE = """<div lang="ja">
{{Word}}
<div style='font-size: 25px;'>{{Sentence}}</div>


<div style='font-size: 25px; padding-bottom:20px'>{{Word Meaning}}</div>

</div>"""


def get_anki_model_config() -> dict:
    """Return model config for AnkiConnect."""
    return {
        "modelName": ANKI_MODEL_NAME,
        "fields": [FIELD_WORD, FIELD_SENTENCE, FIELD_WORD_MEANING],
        "cardTemplates": [
            {"name": "Card 1", "front": FRONT_TEMPLATE, "back": BACK_TEMPLATE},
        ],
        "css": CARD_CSS,
    }


_anki_model_cache: genanki.Model | None = None


def _get_anki_model() -> genanki.Model:
    """Return the note model for lyrics vocabulary cards."""
    global _anki_model_cache
    if _anki_model_cache is None:
        _anki_model_cache = genanki.Model(
            MODEL_ID,
            ANKI_MODEL_NAME,
            fields=[
                {"name": FIELD_WORD},
                {"name": FIELD_SENTENCE},
                {"name": FIELD_WORD_MEANING},
            ],
            templates=[
                {"name": "Card 1", "qfmt": FRONT_TEMPLATE, "afmt": BACK_TEMPLATE},
            ],
            css=CARD_CSS,
        )
    return _anki_model_cache


def _build_notes_from_tokenized(
    tokenized: list[tuple[str, str, dict]],
) -> list[tuple[str, str, str]]:
    """Return list of (word, sentence, definition_html) for words that have definitions."""
    no_definition = html.escape(NO_DEFINITION_FOUND)
    notes = []
    for word, sentence, result in tokenized:
        definition_html = _format_jamdict_result(result)
        if definition_html == no_definition:
            continue
        notes.append((html.escape(word), sentence, definition_html))
    return notes


def _prepare_lyrics_data(
    lyrics_data: dict, deck_name: str | None = None
) -> tuple[list[tuple[str, str, dict]], str]:
    """Extract lyrics text, tokenize, and compute deck name. Returns (tokenized, deck_name)."""
    lyrics_text = extract_lyrics_text(lyrics_data)
    tokenized_raw = tokenize_lyrics(lyrics_text)
    # Use original lyrics (with newlines) for line structure; surface forms match since
    # they're the same Japanese chars (cleaning only removes English/normalizes spaces)
    tokenized = [
        (word, get_sentence_for_word(word, lyrics_text, surface_forms), result)
        for word, result, surface_forms in tokenized_raw
    ]

    track_name = lyrics_data.get("trackName", "Unknown")
    artist_name = lyrics_data.get("artistName", "")
    name = f"{track_name} - {artist_name}" if artist_name else track_name
    deck_name = deck_name or name

    return tokenized, deck_name


def build_anki_deck_from_notes(
    notes: list[dict],
    deck_name: str,
) -> bytes:
    """Build an Anki deck from a list of notes. Each note has fields: {Word, Sentence, Word Meaning}."""
    if not notes:
        raise ValueError("At least one note is required")
    model = _get_anki_model()
    deck = genanki.Deck(DECK_ID, deck_name)
    for note_data in notes:
        fields = note_data.get("fields", {})
        word = fields.get(FIELD_WORD, "")
        sentence = fields.get(FIELD_SENTENCE, "")
        word_meaning = fields.get(FIELD_WORD_MEANING, "") or fields.get(
            "Definition", ""
        )
        if word or word_meaning:
            note = genanki.Note(
                model=model,
                fields=[word, sentence, word_meaning],
            )
            deck.add_note(note)
    package = genanki.Package(deck)
    with tempfile.NamedTemporaryFile(suffix=".apkg", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        package.write_to_file(tmp_path)
        with open(tmp_path, "rb") as deck_file:
            apkg_bytes = deck_file.read()
        return apkg_bytes
    finally:
        os.unlink(tmp_path)


def build_anki_notes_json(lyrics_data: dict, deck_name: str | None = None) -> dict:
    """Build note data for AnkiConnect. Returns dict with deckName, modelName, notes."""
    tokenized, deck_name = _prepare_lyrics_data(lyrics_data, deck_name)
    note_pairs = _build_notes_from_tokenized(tokenized)

    if not note_pairs:
        if not tokenized:
            raise NoVocabularyCardsError()
        raise NoDefinitionsError()

    notes = [
        {
            "fields": {
                FIELD_WORD: word,
                FIELD_SENTENCE: sentence,
                FIELD_WORD_MEANING: definition_html,
            }
        }
        for word, sentence, definition_html in note_pairs
    ]
    random.shuffle(notes)

    return {
        "deckName": deck_name,
        "modelName": ANKI_MODEL_NAME,
        "notes": notes,
    }
