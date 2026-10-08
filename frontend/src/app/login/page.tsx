'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Alert from '@cloudscape-design/components/alert';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const { login, loginAsDemo } = useApp();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startingDemo, setStartingDemo] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const failure = await login(username.trim(), password);
    setSubmitting(false);
    if (failure) setError(failure);
    else router.replace('/hosted-zones');
  };

  const startDemo = async () => {
    setStartingDemo(true);
    setError(null);
    const failure = await loginAsDemo();
    setStartingDemo(false);
    if (failure) setError(failure);
    else router.replace('/hosted-zones');
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <SpaceBetween size="l">
          {error && <Alert type="error">{error}</Alert>}

          <Container
            header={
              <Header variant="h2" description="No password needed.">
                Try the demo
              </Header>
            }
            footer={
              <Button variant="primary" fullWidth loading={startingDemo} disabled={submitting} onClick={startDemo}>
                Explore the demo console
              </Button>
            }
          >
            <SpaceBetween size="xs">
              <Box>Sign in to a ready-made account with sample data already loaded:</Box>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>12 hosted zones, public and private, so you can try search, sort and pagination</li>
                <li>Records of every type: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA and PTR</li>
                <li>Weighted routing and alias records</li>
              </ul>
              <Box color="text-body-secondary" fontSize="body-s">
                Change anything you like. You can restore the samples from the account menu.
              </Box>
            </SpaceBetween>
          </Container>

          <form onSubmit={handleSubmit}>
            <Form
              actions={
                <Button formAction="submit" fullWidth loading={submitting} disabled={startingDemo}>
                  Sign in
                </Button>
              }
            >
              <Container header={<Header variant="h2">Sign in with an account</Header>}>
                <SpaceBetween size="l">
                  <FormField label="Username">
                    <Input value={username} onChange={({ detail }) => setUsername(detail.value)} autoComplete="username" />
                  </FormField>
                  <FormField label="Password">
                    <Input type="password" value={password} onChange={({ detail }) => setPassword(detail.value)} autoComplete="current-password" />
                  </FormField>
                  <Box color="text-body-secondary" fontSize="body-s">
                    Admin account: <Box variant="code">admin</Box> / <Box variant="code">admin</Box>
                  </Box>
                </SpaceBetween>
              </Container>
            </Form>
          </form>
        </SpaceBetween>
      </div>
    </main>
  );
}
