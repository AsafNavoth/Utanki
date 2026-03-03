import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  styled,
} from '@mui/material'
import { useAnkiConnectContext } from '../../contexts/ankiconnect/ankiconnectContext'
import { getFlexRowWrapStyle, getOnHoverStyle } from '../../utils/commonStyles'

const DeckFormControl = styled(FormControl)({
  width: 'min(25ch, 31vw)',
})

const getDeckMenuItems = (decks: string[] | null) =>
  (decks ?? []).map((deck) => (
    <MenuItem key={deck} value={deck} sx={(theme) => getOnHoverStyle({ theme })}>
      {deck}
    </MenuItem>
  ))

export const AnkiConnectBar = () => {
  const {
    ankiConnectEnabled,
    setAnkiConnectEnabled,
    selectedDeck,
    setSelectedDeck,
    decks,
    refreshDecks,
  } = useAnkiConnectContext()

  const isDropdownDisabled =
    !ankiConnectEnabled || decks === null || decks.length === 0

  return (
    <Box sx={(theme) => getFlexRowWrapStyle({ theme })}>
      <FormControlLabel
        control={
          <Switch
            checked={ankiConnectEnabled}
            onChange={(_, checked) => setAnkiConnectEnabled(checked)}
            color="primary"
          />
        }
        label="Enable AnkiConnect integration"
      />
      <DeckFormControl size="small">
        <InputLabel id="ankiconnect-deck-label">Deck</InputLabel>
        <Select
          labelId="ankiconnect-deck-label"
          label="Deck"
          value={decks && decks.includes(selectedDeck) ? selectedDeck : ''}
          onChange={(event) => setSelectedDeck(event.target.value)}
          onOpen={() => refreshDecks()}
          disabled={isDropdownDisabled}
        >
          {getDeckMenuItems(decks)}
        </Select>
      </DeckFormControl>
    </Box>
  )
}
