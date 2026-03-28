import React, { useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import Input from '@cloudscape-design/components/input';
import FormField from '@cloudscape-design/components/form-field';
import Alert from '@cloudscape-design/components/alert';
import { client } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export function Users() {
  const { user } = useAuth();
  const [userId, setUserId] = useState('');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testCreateUser = async () => {
    setLoading(true);
    setError('');
    try {
      // End-to-end typed! 
      // If you type client.api.users.$post({ json: { wrong: "field" } }), TS will throw an error immediately!
      const res = await client.api.users.$post({
        json: { name: "RPC Test User", email: "rpc@example.com" }
      });
      
      const body = await res.json();
      if (res.ok) {
        setResult(JSON.stringify(body, null, 2));
        // Cast to 'any' for quick access if needed, but optimally you infer the type directly
        setUserId((body as any).data?.id || '');
      } else {
        setError(JSON.stringify(body));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const testGetUser = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.api.users[':id'].$get({
        param: { id: userId || 'test-123' }
      });
      const body = await res.json();
      if (res.ok) {
        setResult(JSON.stringify(body, null, 2));
      } else {
        setError(JSON.stringify(body));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContentLayout
      header={
        <Header variant="h1" description="Test the deeply typed Hono RPC API Client">
          Users API Integration
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">Test Actions</Header>}>
          <SpaceBetween direction="vertical" size="xl">
            {error && <Alert type="error">{error}</Alert>}
            
            <SpaceBetween direction="vertical" size="m">
              <Header variant="h3">1. Create a mocked User (POST /api/users)</Header>
              <Button onClick={testCreateUser} loading={loading} disabled={!user}>
                Execute POST
              </Button>
              {!user && <p style={{ color: 'red' }}>Please sign in first via the top right menu.</p>}
            </SpaceBetween>

            <SpaceBetween direction="vertical" size="m">
              <Header variant="h3">2. Fetch User by ID (GET /api/users/:id)</Header>
              <FormField label="Target User ID">
                <Input value={userId} onChange={({ detail }) => setUserId(detail.value)} />
              </FormField>
              <Button onClick={testGetUser} loading={loading}>
                Execute GET
              </Button>
            </SpaceBetween>
            
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">API Response</Header>}>
          <pre style={{
            background: 'var(--color-background-code)',
            padding: '16px',
            borderRadius: '4px',
            overflowX: 'auto'
          }}>
            {result || 'Waiting for execution...'}
          </pre>
        </Container>

      </SpaceBetween>
    </ContentLayout>
  );
}
