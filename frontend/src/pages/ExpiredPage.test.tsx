import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ExpiredPage from './ExpiredPage';
import { describe, it, expect } from 'vitest';

describe('ExpiredPage', () => {
  it('testRendersExpiredPageHeading', () => {
    render(
      <BrowserRouter>
        <ExpiredPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Expired link/i)).toBeInTheDocument();
  });

  it('testRendersLoginAndSignupButtons', () => {
    render(
      <BrowserRouter>
        <ExpiredPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Log in/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign up/i)).toBeInTheDocument();
  });
});
