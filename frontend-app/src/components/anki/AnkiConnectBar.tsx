import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
} from '@mui/material'
import { useAnkiConnectContext } from '../../contexts/ankiconnect/ankiconnectContext'
import { onHoverStyle } from '../../utils/commonStyles'

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
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
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
      <FormControl
        size="small"
        sx={{
          width: 'min(25ch, 31vw)',
        }}
      >
        <InputLabel id="ankiconnect-deck-label">Deck</InputLabel>
        <Select
          labelId="ankiconnect-deck-label"
          label="Deck"
          value={selectedDeck}
          onChange={(e) => setSelectedDeck(e.target.value)}
          onOpen={() => refreshDecks()}
          disabled={isDropdownDisabled}
        >
          {(decks ?? []).map((deck) => (
            <MenuItem key={deck} value={deck} sx={(theme) => onHoverStyle(theme)}>
              {deck}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}
