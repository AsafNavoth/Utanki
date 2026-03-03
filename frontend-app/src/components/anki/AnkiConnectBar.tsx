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
import { useThemeMode } from '../../contexts/theme/themeContext'
import { useAnkiConnectContext } from '../../contexts/ankiconnect/ankiconnectContext'
import { getFlexRowWrapStyle, getOnHoverStyle } from '../../utils/commonStyles'

const DeckFormControl = styled(FormControl)(({ theme }) => ({
  width: 'min(25ch, 31vw)',
  [theme.breakpoints.down('sm')]: {
    width: 'min(20ch, 28vw)',
  },
}))

const getDeckMenuItems = (decks: string[] | null) =>
  (decks ?? []).map((deck) => (
    <MenuItem
      key={deck}
      value={deck}
      sx={(theme) => getOnHoverStyle({ theme })}
    >
      {deck}
    </MenuItem>
  ))

export const AnkiConnectBar = () => {
  const { isMobile } = useThemeMode()
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
      sx={(theme) => ({
        ...getFlexRowWrapStyle({ theme }),
        [theme.breakpoints.down('sm')]: {
          flexWrap: 'nowrap',
          '& .MuiFormControlLabel-label': { fontSize: '0.75rem' },
        },
      })}
    >
      <FormControlLabel
        control={
          <Switch
            checked={ankiConnectEnabled}
            onChange={(_, checked) => setAnkiConnectEnabled(checked)}
            color="primary"
            size="small"
          />
        }
        label={isMobile ? 'AnkiConnect' : 'Enable AnkiConnect integration'}
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
