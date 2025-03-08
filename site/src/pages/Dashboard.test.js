import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router, MemoryRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import axios from 'axios';

// Mock axios
jest.mock('axios', () => ({
    get: jest.fn(() => Promise.resolve({ data: { response: { hits: [] } } }))
}));

describe('Dashboard Component', () => {
    beforeEach(() => {
        // Clear localStorage and mocks before each test
        localStorage.clear();
        jest.clearAllMocks();
    });

    test('redirects to home if user is not logged in', () => {
        // Render the Dashboard component without a user in localStorage
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/" element={<h1>Home Page</h1>} />
                </Routes>
            </MemoryRouter>
        );

        // Check if the user is redirected to the home page
        expect(screen.getByText('Home Page')).toBeInTheDocument();
    });

    test('renders welcome message and logout button when user is logged in', () => {
        // Simulate a logged-in user
        localStorage.setItem('user', 'testuser');

        render(
            <Router>
                <Dashboard />
            </Router>
        );

        // Check if the welcome message and logout button are displayed
        expect(screen.getByText('Welcome, testuser!')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    test('logs out user and redirects to home when logout button is clicked', async () => {
        // Simulate a logged-in user
        localStorage.setItem('user', 'testuser');

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/" element={<h1>Home Page</h1>} />
                </Routes>
            </MemoryRouter>
        );

        // Click the logout button
        fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

        // Check if the user is removed from localStorage
        expect(localStorage.getItem('user')).toBeNull();

        // Wait for the redirection to happen
        await waitFor(() => {
            expect(screen.getByText('Home Page')).toBeInTheDocument();
        });
    });

    test('shows alert when search query is empty', () => {
        // Simulate a logged-in user
        localStorage.setItem('user', 'testuser');

        // Mock window.alert
        window.alert = jest.fn();

        render(
            <Router>
                <Dashboard />
            </Router>
        );

        // Click the search button without entering a query
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        // Check if the alert is shown
        expect(window.alert).toHaveBeenCalledWith('Please enter a song title!');
    });

    test('fetches and displays songs when search query is valid', async () => {
        // Simulate a logged-in user
        localStorage.setItem('user', 'testuser');

        // Mock axios response
        const mockSongs = {
            response: {
                hits: [
                    {
                        result: {
                            id: 1,
                            full_title: 'Song 1',
                            url: 'https://genius.com/song1'
                        }
                    },
                    {
                        result: {
                            id: 2,
                            full_title: 'Song 2',
                            url: 'https://genius.com/song2'
                        }
                    }
                ]
            }
        };
        axios.get.mockResolvedValueOnce({ data: mockSongs });

        render(
            <Router>
                <Dashboard />
            </Router>
        );

        // Enter a search query and click the search button
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), {
            target: { value: 'test' }
        });
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        // Wait for the songs to be displayed
        expect(await screen.findByText('🎵 Song 1')).toBeInTheDocument();
        expect(await screen.findByText('🎵 Song 2')).toBeInTheDocument();
    });

    test('displays "No songs found" message when no songs are returned', async () => {
        // Simulate a logged-in user
        localStorage.setItem('user', 'testuser');

        // Mock axios response with no songs
        const mockSongs = {
            response: {
                hits: []
            }
        };
        axios.get.mockResolvedValueOnce({ data: mockSongs });

        render(
            <Router>
                <Dashboard />
            </Router>
        );

        // Enter a search query and click the search button
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), {
            target: { value: 'test' }
        });
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        // Wait for the "No songs found" message to be displayed
        expect(await screen.findByText('No songs found.')).toBeInTheDocument();
    });

    test('logs error when fetching songs fails', async () => {
        // Simulate a logged-in user
        localStorage.setItem('user', 'testuser');

        // Mock console.error to verify it is called
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock axios.get to reject with an error
        axios.get.mockRejectedValueOnce(new Error('Failed to fetch songs'));

        render(
            <Router>
                <Dashboard />
            </Router>
        );

        // Enter a search query and click the search button
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), {
            target: { value: 'test' }
        });
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        // Wait for the error to be logged
        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching songs:', expect.any(Error));
        });

        // Restore the original console.error implementation
        consoleErrorSpy.mockRestore();
    });
});