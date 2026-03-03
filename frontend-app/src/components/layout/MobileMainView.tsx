import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  styled,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useToggleState } from '../../hooks/useToggleState'
import { SearchView } from '../search/SearchView'
import { FreeTextView } from '../freeTextView/FreeTextView'

const StyledAccordion = styled(Accordion)({
  '&:before': { display: 'none' },
})

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  height: '65vh',
  paddingLeft: 0,
  paddingRight: 0,
  paddingBottom: theme.spacing(2),
}))

const PANEL_1 = 'search'
const PANEL_2 = 'paste'

const MobileMainViewRoot = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  marginTop: theme.spacing(2),
}))

export const MobileMainView = () => {
  const [expandedPanel, toggleExpandedPanel] = useToggleState(PANEL_1, PANEL_2)

  return (
    <MobileMainViewRoot>
      <StyledAccordion
        expanded={expandedPanel === PANEL_1}
        onChange={toggleExpandedPanel}
        disableGutters
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="medium">Search</Typography>
        </AccordionSummary>
        <StyledAccordionDetails>
          <SearchView hideTitle />
        </StyledAccordionDetails>
      </StyledAccordion>
      <StyledAccordion
        expanded={expandedPanel === PANEL_2}
        onChange={toggleExpandedPanel}
        disableGutters
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="medium">Paste lyrics</Typography>
        </AccordionSummary>
        <StyledAccordionDetails>
          <FreeTextView hideTitle />
        </StyledAccordionDetails>
      </StyledAccordion>
    </MobileMainViewRoot>
  )
}
