import { Component, type ReactNode } from 'react'
import { ErrorDialog } from './ErrorDialog'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  errorMessage: string
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      errorMessage: '',
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    }
  }

  handleClose = () => {
    this.setState({ hasError: false, errorMessage: '' })
  }

  render() {
    const { hasError, errorMessage } = this.state
    const { children } = this.props

    if (hasError) {
      return (
        <ErrorDialog open message={errorMessage} onClose={this.handleClose} />
      )
    }

    return <>{children}</>
  }
}
