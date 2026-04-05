import { render, screen, fireEvent } from '@testing-library/react';
import CreateLinkModal from './CreateLinkModal';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

describe('CreateLinkModal', () => {
  it('rendering when isOpen={true}', () => {
    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );
    expect(screen.getByText('Destination URL')).toBeInTheDocument();
  });

  it('returning null when isOpen={false}', () => {
    const { container } = render(
      <CreateLinkModal 
        isOpen={false} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('typing in Destination URL updates the field', () => {
    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );
    
    const input = screen.getByPlaceholderText('https://dub.co/help/article/dub-links');
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    expect((input as HTMLInputElement).value).toBe('https://example.com');
  });

  it('clicking expiration pill buttons updates active state', () => {
    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );
    
    const btn1Hour = screen.getByText('1 Hour');
    const btn24Hours = screen.getByText('24 Hours');
    
    fireEvent.click(btn1Hour);
    expect(btn1Hour.className).toContain('bg-gray-900');
    expect(btn24Hours.className).not.toContain('bg-gray-900');
    
    fireEvent.click(btn24Hours);
    expect(btn24Hours.className).toContain('bg-gray-900');
    expect(btn1Hour.className).not.toContain('bg-gray-900');
  });

  it('password field has a working show/hide toggle', () => {
    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );
    
    const input = screen.getByPlaceholderText('Optional password...');
    expect((input as HTMLInputElement).type).toBe('password');
    
    const toggleButton = input.nextElementSibling as HTMLButtonElement;
    
    fireEvent.click(toggleButton);
    expect((input as HTMLInputElement).type).toBe('text');
    
    fireEvent.click(toggleButton);
    expect((input as HTMLInputElement).type).toBe('password');
  });
});
