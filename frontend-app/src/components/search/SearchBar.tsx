import { Box, TextField, Button, styled } from '@mui/material'
import { getFlexRowCenterStyle } from '../../utils/commonStyles'

const SearchBarRoot = styled(Box)(({ theme }) =>
  getFlexRowCenterStyle({ theme, gap: 1 })
)

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
}

export const SearchBar = ({ value, onChange, onSearch }: SearchBarProps) => (
  <SearchBarRoot>
    <TextField
      label="Search songs"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => event.key === 'Enter' && onSearch()}
      placeholder="Search by song, artist, or album..."
      fullWidth
    />
    <Button variant="contained" onClick={onSearch}>
      Search
    </Button>
  </SearchBarRoot>
)
