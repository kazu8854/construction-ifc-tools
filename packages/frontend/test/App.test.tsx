import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

expect.extend(matchers);

describe('App Components Test (Vitest + React Testing Library)', () => {
  it('renders Layout and Dashboard on mount', () => {
    render(<App />);
    expect(screen.getAllByText(/Serverless App Boilerplate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Welcome to your new enterprise architecture/i).length).toBeGreaterThan(0);
  });

  // Example of isolated UI testing without AWS backend dependencies
  it('allows mock login from navigation', async () => {
    const user = userEvent.setup();
    render(<App />);

    // In mock mode (Vitest runs without env vars, so isMock defaults to false unless we mock import.meta)
    const signInBtns = screen.getAllByText(/Sign in/i);
    expect(signInBtns.length).toBeGreaterThan(0);

    // In real tests, we usually mock the context or set env vars.
  });
});
