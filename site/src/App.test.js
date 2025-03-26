import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import Auth from './pages/Auth';

// Mock the Auth and Dashboard components
jest.mock('./pages/Auth', () => () => <div>Auth Component</div>);
jest.mock('./pages/Dashboard', () => () => <div>Dashboard Component</div>);

describe('App Component', () => {
    test('renders Auth component for the root path', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        );

        // Check if the Auth component is rendered
        expect(screen.getByText('Auth Component')).toBeInTheDocument();
    });

    test('renders Dashboard component for the /dashboard path', () => {
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <App />
            </MemoryRouter>
        );

        // Check if the Dashboard component is rendered
        expect(screen.getByText('Dashboard Component')).toBeInTheDocument();
    });
});