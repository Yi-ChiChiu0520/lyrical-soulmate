import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router, MemoryRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import axios from 'axios';

// Mock axios
jest.mock('axios', () => ({
    get: jest.fn(() => Promise.resolve({ data: { response: { hits: [] } } }))
}));

// Helper function to DRY up search tests
const setupAndSearch = async (mockResponse) => {
    axios.get.mockResolvedValueOnce({ data: mockResponse });

    render(
        <Router>
            <Dashboard />
        </Router>
    );

    fireEvent.change(screen.getByPlaceholderText('Search for a song...'), {
        target: { value: 'test' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
};

describe('Dashboard Component', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    test('redirects to home if user is not logged in', () => {
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/" element={<h1>Home Page</h1>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Home Page')).toBeInTheDocument();
    });

    test('renders welcome message and logout button when user is logged in', () => {
        localStorage.setItem('user', 'testuser');

        render(
            <Router>
                <Dashboard />
            </Router>
        );

        expect(screen.getByText('Welcome, testuser!')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    test('logs out user and redirects to home when logout button is clicked', async () => {
        localStorage.setItem('user', 'testuser');

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/" element={<h1>Home Page</h1>} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

        expect(localStorage.getItem('user')).toBeNull();

        await waitFor(() => {
            expect(screen.getByText('Home Page')).toBeInTheDocument();
        });
    });

    test('shows alert when search query is empty', () => {
        localStorage.setItem('user', 'testuser');

        window.alert = jest.fn();

        render(
            <Router>
                <Dashboard />
            </Router>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        expect(window.alert).toHaveBeenCalledWith('Please enter a song title!');
    });

    test('fetches and displays songs when search query is valid', async () => {
        localStorage.setItem('user', 'testuser');

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

        await setupAndSearch(mockSongs);

        expect(await screen.findByText('🎵 Song 1')).toBeInTheDocument();
        expect(await screen.findByText('🎵 Song 2')).toBeInTheDocument();
    });

    test('displays "No songs found" message when no songs are returned', async () => {
        localStorage.setItem('user', 'testuser');

        const mockSongs = {
            response: {
                hits: []
            }
        };

        await setupAndSearch(mockSongs);

        expect(await screen.findByText('No songs found.')).toBeInTheDocument();
    });

    test('logs error when fetching songs fails', async () => {
        localStorage.setItem('user', 'testuser');

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        axios.get.mockRejectedValueOnce(new Error('Failed to fetch songs'));

        render(
            <Router>
                <Dashboard />
            </Router>
        );

        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), {
            target: { value: 'test' }
        });
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching songs:', expect.any(Error));
        });

        consoleErrorSpy.mockRestore();
    });
});
