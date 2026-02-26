import { Box, TextField, Button } from '@mui/material'

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
}

export const SearchBar = ({ value, onChange, onSearch }: SearchBarProps) => (
  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pt: 1 }}>
    <TextField
      label="Search songs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onSearch()}
      placeholder="Search by song, artist, or album..."
      fullWidth
    />
    <Button variant="contained" onClick={onSearch}>
      Search
    </Button>
  </Box>
)
