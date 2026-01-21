import React from "react";
import { Button, Center, Stack, Text, Title } from "@mantine/core";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (this.props.onError) {
      this.props.onError(error, info);
    } else {
      console.error("Unhandled render error:", error, info);
    }
  }

  handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
      return;
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Center style={{ minHeight: "100vh", padding: 24 }}>
        <Stack align="center" gap="md">
          <Title order={2}>Something went wrong</Title>
          <Text c="dimmed" ta="center">
            Try refreshing the page. If this keeps happening, contact support.
          </Text>
          <Button onClick={this.handleReset}>Reload</Button>
        </Stack>
      </Center>
    );
  }
}
